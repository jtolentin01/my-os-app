import { z } from "zod"
import {
  createMeal,
  deleteMeal,
  getOrCreateMealPlan,
} from "@/apps/diet/services/meals"
import {
  createMenuItem,
  listMenuItems,
} from "@/apps/diet/services/menu-items"
import { estimateMenuNutrition } from "@/apps/diet/services/nutrition-estimate"
import { MEAL_TYPES, MENU_CATEGORIES } from "@/apps/diet/types"
import {
  formatNutritionLine,
  sumMealNutrition,
} from "@/apps/diet/utils/nutrition"
import {
  formatWeekRange,
  formatWeekStart,
  getWeekStart,
  shiftWeekStart,
} from "@/apps/diet/utils/week"
import type { AiToolDefinition } from "@/platform/ai/tools/types"

const DAY_NAMES = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const

const listMenuItemsToolSchema = z.object({
  query: z.string().trim().max(200).optional().default(""),
  limit: z.number().int().min(1).max(40).optional().default(20),
})

const createMenuItemToolSchema = z.object({
  name: z.string().trim().min(1).max(160),
  category: z.enum(MENU_CATEGORIES).nullable().optional().default(null),
  servingLabel: z.string().trim().min(1).max(80).optional().default("1 serving"),
  calories: z.number().min(0).max(10000).optional().default(0),
  carbsG: z.number().min(0).max(10000).optional().default(0),
  proteinG: z.number().min(0).max(10000).optional().default(0),
  fatG: z.number().min(0).max(10000).optional().default(0),
  notes: z.string().trim().max(500).nullable().optional().default(null),
  estimateNutrition: z.boolean().optional().default(true),
})

const createMenuItemsToolSchema = z.object({
  estimateNutrition: z.boolean().optional().default(true),
  items: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(160),
        category: z.enum(MENU_CATEGORIES).nullable().optional().default(null),
        servingLabel: z
          .string()
          .trim()
          .min(1)
          .max(80)
          .optional()
          .default("1 serving"),
        calories: z.number().min(0).max(10000).optional().default(0),
        carbsG: z.number().min(0).max(10000).optional().default(0),
        proteinG: z.number().min(0).max(10000).optional().default(0),
        fatG: z.number().min(0).max(10000).optional().default(0),
        notes: z.string().trim().max(500).nullable().optional().default(null),
      })
    )
    .min(1)
    .max(15),
})

const getWeekPlanToolSchema = z.object({
  weekOffset: z.number().int().min(-4).max(8).optional().default(0),
})

const createMealToolSchema = z.object({
  weekOffset: z.number().int().min(-4).max(8).optional().default(0),
  dayOfWeek: z.number().int().min(0).max(6),
  mealType: z.enum(MEAL_TYPES),
  menuItemId: z.string().uuid().nullable().optional().default(null),
  title: z.string().trim().max(120).optional().default(""),
  servings: z.number().min(0.25).max(20).optional().default(1),
  notes: z.string().trim().max(500).nullable().optional().default(null),
})

const weekMealEntrySchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  mealType: z.enum(MEAL_TYPES),
  menuItemId: z.string().uuid().nullable().optional().default(null),
  title: z.string().trim().max(120).optional().default(""),
  servings: z.number().min(0.25).max(20).optional().default(1),
  notes: z.string().trim().max(500).nullable().optional().default(null),
})

const addMealsToWeekToolSchema = z.object({
  weekOffset: z.number().int().min(-4).max(8).optional().default(0),
  meals: z.array(weekMealEntrySchema).min(1).max(28),
})

const deleteMealToolSchema = z.object({
  id: z.string().uuid(),
})

const resolveWeekStart = (weekOffset: number) =>
  shiftWeekStart(formatWeekStart(getWeekStart()), weekOffset)

const resolveMealTitle = (title: string, menuItemName?: string) => {
  const trimmed = title.trim()
  if (trimmed) return trimmed
  if (menuItemName) return menuItemName
  return ""
}

const createMenuItemFromArgs = async (input: z.infer<typeof createMenuItemToolSchema>) => {
  let calories = input.calories
  let carbsG = input.carbsG
  let proteinG = input.proteinG
  let fatG = input.fatG
  let servingLabel = input.servingLabel
  let estimateNote: string | null = null

  const shouldEstimate =
    input.estimateNutrition ||
    (calories <= 0 && carbsG <= 0 && proteinG <= 0 && fatG <= 0)

  if (shouldEstimate) {
    try {
      const estimated = await estimateMenuNutrition({
        name: input.name,
        servingLabel,
        notes: input.notes ?? "",
      })
      calories = estimated.calories
      carbsG = estimated.carbs_g
      proteinG = estimated.protein_g
      fatG = estimated.fat_g
      if (estimated.serving_label?.trim()) {
        servingLabel = estimated.serving_label.trim()
      }
      estimateNote = estimated.note
    } catch (error) {
      if (calories <= 0 && carbsG <= 0 && proteinG <= 0 && fatG <= 0) {
        throw error instanceof Error
          ? error
          : new Error("Failed to estimate nutrition for the dish.")
      }
    }
  }

  const item = await createMenuItem({
    name: input.name,
    category: input.category,
    servingLabel,
    calories,
    carbsG,
    proteinG,
    fatG,
    notes: input.notes,
  })

  return { item, estimateNote }
}

export const dietTools: AiToolDefinition[] = [
  {
    name: "list_menu_items",
    tool: {
      type: "function",
      name: "list_menu_items",
      description:
        "List dishes in the user's Diet menu library. Empty query returns the full menu.",
      strict: true,
      parameters: {
        type: "object",
        properties: {
          query: { type: "string" },
          limit: { type: "number" },
        },
        required: ["query", "limit"],
        additionalProperties: false,
      },
    },
    execute: async (args) => {
      const parsed = listMenuItemsToolSchema.safeParse(args)
      if (!parsed.success) {
        return {
          ok: false,
          summary: parsed.error.issues[0]?.message ?? "Invalid menu list request.",
        }
      }

      const items = await listMenuItems(parsed.data.query)
      const limited = items.slice(0, parsed.data.limit).map((item) => ({
        id: item.id,
        name: item.name,
        category: item.category,
        serving_label: item.serving_label,
        calories: item.calories,
        carbs_g: item.carbs_g,
        protein_g: item.protein_g,
        fat_g: item.fat_g,
      }))

      return {
        ok: true,
        summary: `Found ${limited.length} menu dishes.`,
        data: limited,
      }
    },
  },
  {
    name: "create_menu_item",
    tool: {
      type: "function",
      name: "create_menu_item",
      description:
        "Add a reusable dish to the Diet menu with nutrition facts. Set estimateNutrition true to auto-fill macros from the dish name when unsure.",
      strict: true,
      parameters: {
        type: "object",
        properties: {
          name: { type: "string" },
          category: {
            type: ["string", "null"],
            enum: [...MENU_CATEGORIES, null],
          },
          servingLabel: { type: "string" },
          calories: { type: "number" },
          carbsG: { type: "number" },
          proteinG: { type: "number" },
          fatG: { type: "number" },
          notes: { type: ["string", "null"] },
          estimateNutrition: { type: "boolean" },
        },
        required: [
          "name",
          "category",
          "servingLabel",
          "calories",
          "carbsG",
          "proteinG",
          "fatG",
          "notes",
          "estimateNutrition",
        ],
        additionalProperties: false,
      },
    },
    execute: async (args) => {
      const parsed = createMenuItemToolSchema.safeParse(args)
      if (!parsed.success) {
        return {
          ok: false,
          summary: parsed.error.issues[0]?.message ?? "Invalid menu dish.",
        }
      }

      try {
        const { item, estimateNote } = await createMenuItemFromArgs(parsed.data)
        return {
          ok: true,
          summary: `Added menu dish "${item.name}".`,
          data: {
            id: item.id,
            name: item.name,
            category: item.category,
            serving_label: item.serving_label,
            calories: item.calories,
            carbs_g: item.carbs_g,
            protein_g: item.protein_g,
            fat_g: item.fat_g,
            estimate_note: estimateNote,
          },
        }
      } catch (error) {
        return {
          ok: false,
          summary:
            error instanceof Error
              ? error.message
              : "Failed to create menu dish.",
        }
      }
    },
  },
  {
    name: "create_menu_items",
    tool: {
      type: "function",
      name: "create_menu_items",
      description:
        "Add multiple reusable dishes to the Diet menu at once. Prefer estimateNutrition true unless exact macros are known.",
      strict: true,
      parameters: {
        type: "object",
        properties: {
          estimateNutrition: { type: "boolean" },
          items: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                category: {
                  type: ["string", "null"],
                  enum: [...MENU_CATEGORIES, null],
                },
                servingLabel: { type: "string" },
                calories: { type: "number" },
                carbsG: { type: "number" },
                proteinG: { type: "number" },
                fatG: { type: "number" },
                notes: { type: ["string", "null"] },
              },
              required: [
                "name",
                "category",
                "servingLabel",
                "calories",
                "carbsG",
                "proteinG",
                "fatG",
                "notes",
              ],
              additionalProperties: false,
            },
          },
        },
        required: ["estimateNutrition", "items"],
        additionalProperties: false,
      },
    },
    execute: async (args) => {
      const parsed = createMenuItemsToolSchema.safeParse(args)
      if (!parsed.success) {
        return {
          ok: false,
          summary: parsed.error.issues[0]?.message ?? "Invalid menu dishes.",
        }
      }

      const created: Array<{ id: string; name: string }> = []
      const errors: string[] = []

      for (const entry of parsed.data.items) {
        try {
          const { item } = await createMenuItemFromArgs({
            ...entry,
            estimateNutrition: parsed.data.estimateNutrition,
          })
          created.push({ id: item.id, name: item.name })
        } catch (error) {
          errors.push(
            `${entry.name}: ${
              error instanceof Error ? error.message : "failed"
            }`
          )
        }
      }

      if (created.length === 0) {
        return {
          ok: false,
          summary: errors[0] ?? "No menu dishes were added.",
          data: { errors },
        }
      }

      return {
        ok: true,
        summary: `Added ${created.length} menu dish${created.length === 1 ? "" : "es"}.`,
        data: { created, errors },
      }
    },
  },
  {
    name: "get_week_plan",
    tool: {
      type: "function",
      name: "get_week_plan",
      description:
        "Load the user's Diet meal plan for a week. weekOffset 0 is this week, 1 is next week, -1 is last week. dayOfWeek uses 0=Monday through 6=Sunday.",
      strict: true,
      parameters: {
        type: "object",
        properties: {
          weekOffset: { type: "number" },
        },
        required: ["weekOffset"],
        additionalProperties: false,
      },
    },
    execute: async (args) => {
      const parsed = getWeekPlanToolSchema.safeParse(args)
      if (!parsed.success) {
        return {
          ok: false,
          summary: parsed.error.issues[0]?.message ?? "Invalid week request.",
        }
      }

      const weekStart = resolveWeekStart(parsed.data.weekOffset)
      const plan = await getOrCreateMealPlan(weekStart)
      const totals = sumMealNutrition(plan.meals)

      return {
        ok: true,
        summary: `Loaded plan for ${formatWeekRange(plan.week_start)} with ${plan.meals.length} meals.`,
        data: {
          meal_plan_id: plan.id,
          week_start: plan.week_start,
          week_label: formatWeekRange(plan.week_start),
          nutrition_total: formatNutritionLine(totals),
          meals: plan.meals.map((meal) => ({
            id: meal.id,
            day_of_week: meal.day_of_week,
            day_name: DAY_NAMES[meal.day_of_week] ?? String(meal.day_of_week),
            meal_type: meal.meal_type,
            title: meal.title,
            servings: meal.servings,
            menu_item_id: meal.menu_item_id,
            notes: meal.notes,
          })),
        },
      }
    },
  },
  {
    name: "create_meal",
    tool: {
      type: "function",
      name: "create_meal",
      description:
        "Add one meal to a Diet week plan. Prefer menuItemId from list_menu_items. dayOfWeek is 0=Monday through 6=Sunday. weekOffset 0 is this week, 1 is next week. Cannot add meals to past days.",
      strict: true,
      parameters: {
        type: "object",
        properties: {
          weekOffset: { type: "number" },
          dayOfWeek: { type: "number" },
          mealType: {
            type: "string",
            enum: [...MEAL_TYPES],
          },
          menuItemId: { type: ["string", "null"] },
          title: { type: "string" },
          servings: { type: "number" },
          notes: { type: ["string", "null"] },
        },
        required: [
          "weekOffset",
          "dayOfWeek",
          "mealType",
          "menuItemId",
          "title",
          "servings",
          "notes",
        ],
        additionalProperties: false,
      },
    },
    execute: async (args) => {
      const parsed = createMealToolSchema.safeParse(args)
      if (!parsed.success) {
        return {
          ok: false,
          summary: parsed.error.issues[0]?.message ?? "Invalid meal payload.",
        }
      }

      const title = resolveMealTitle(parsed.data.title)
      if (!parsed.data.menuItemId && !title) {
        return {
          ok: false,
          summary: "Provide a menuItemId or a meal title.",
        }
      }

      const weekStart = resolveWeekStart(parsed.data.weekOffset)
      const plan = await getOrCreateMealPlan(weekStart)

      try {
        const meal = await createMeal({
          mealPlanId: plan.id,
          dayOfWeek: parsed.data.dayOfWeek,
          mealType: parsed.data.mealType,
          title: title || "Meal",
          notes: parsed.data.notes ?? undefined,
          menuItemId: parsed.data.menuItemId,
          servings: parsed.data.servings,
        })

        const dayName = DAY_NAMES[parsed.data.dayOfWeek] ?? "day"
        return {
          ok: true,
          summary: `Added ${parsed.data.mealType} on ${dayName}: ${meal.title}.`,
          data: {
            id: meal.id,
            meal_plan_id: plan.id,
            week_start: plan.week_start,
            day_of_week: meal.day_of_week,
            meal_type: meal.meal_type,
            title: meal.title,
            servings: meal.servings,
            menu_item_id: meal.menu_item_id,
          },
        }
      } catch (error) {
        return {
          ok: false,
          summary:
            error instanceof Error ? error.message : "Failed to create meal.",
        }
      }
    },
  },
  {
    name: "add_meals_to_week",
    tool: {
      type: "function",
      name: "add_meals_to_week",
      description:
        "Add multiple meals to one Diet week in a single step. Prefer menuItemId values from list_menu_items. dayOfWeek is 0=Monday through 6=Sunday. weekOffset 0 is this week, 1 is next week. Skips past days with errors.",
      strict: true,
      parameters: {
        type: "object",
        properties: {
          weekOffset: { type: "number" },
          meals: {
            type: "array",
            items: {
              type: "object",
              properties: {
                dayOfWeek: { type: "number" },
                mealType: {
                  type: "string",
                  enum: [...MEAL_TYPES],
                },
                menuItemId: { type: ["string", "null"] },
                title: { type: "string" },
                servings: { type: "number" },
                notes: { type: ["string", "null"] },
              },
              required: [
                "dayOfWeek",
                "mealType",
                "menuItemId",
                "title",
                "servings",
                "notes",
              ],
              additionalProperties: false,
            },
          },
        },
        required: ["weekOffset", "meals"],
        additionalProperties: false,
      },
    },
    execute: async (args) => {
      const parsed = addMealsToWeekToolSchema.safeParse(args)
      if (!parsed.success) {
        return {
          ok: false,
          summary: parsed.error.issues[0]?.message ?? "Invalid week meals payload.",
        }
      }

      const weekStart = resolveWeekStart(parsed.data.weekOffset)
      const plan = await getOrCreateMealPlan(weekStart)
      const created: Array<{ id: string; title: string; day: string; mealType: string }> =
        []
      const errors: string[] = []

      for (const entry of parsed.data.meals) {
        const title = resolveMealTitle(entry.title)
        if (!entry.menuItemId && !title) {
          errors.push(
            `${DAY_NAMES[entry.dayOfWeek] ?? "Day"} ${entry.mealType}: missing dish.`
          )
          continue
        }

        try {
          const meal = await createMeal({
            mealPlanId: plan.id,
            dayOfWeek: entry.dayOfWeek,
            mealType: entry.mealType,
            title: title || "Meal",
            notes: entry.notes ?? undefined,
            menuItemId: entry.menuItemId,
            servings: entry.servings,
          })
          created.push({
            id: meal.id,
            title: meal.title,
            day: DAY_NAMES[entry.dayOfWeek] ?? String(entry.dayOfWeek),
            mealType: entry.mealType,
          })
        } catch (error) {
          errors.push(
            `${DAY_NAMES[entry.dayOfWeek] ?? "Day"} ${entry.mealType}: ${
              error instanceof Error ? error.message : "failed"
            }`
          )
        }
      }

      if (created.length === 0) {
        return {
          ok: false,
          summary:
            errors[0] ??
            "No meals were added. Check days, dishes, and past-day rules.",
          data: { errors },
        }
      }

      return {
        ok: true,
        summary: `Added ${created.length} meal${created.length === 1 ? "" : "s"} to ${formatWeekRange(plan.week_start)}.`,
        data: {
          meal_plan_id: plan.id,
          week_start: plan.week_start,
          created,
          errors,
        },
      }
    },
  },
  {
    name: "delete_meal",
    tool: {
      type: "function",
      name: "delete_meal",
      description: "Delete one meal from the Diet planner by id.",
      strict: true,
      parameters: {
        type: "object",
        properties: {
          id: { type: "string" },
        },
        required: ["id"],
        additionalProperties: false,
      },
    },
    execute: async (args) => {
      const parsed = deleteMealToolSchema.safeParse(args)
      if (!parsed.success) {
        return {
          ok: false,
          summary: parsed.error.issues[0]?.message ?? "Invalid meal id.",
        }
      }

      try {
        await deleteMeal(parsed.data.id)
        return {
          ok: true,
          summary: "Meal deleted.",
          data: { id: parsed.data.id },
        }
      } catch (error) {
        return {
          ok: false,
          summary:
            error instanceof Error ? error.message : "Failed to delete meal.",
        }
      }
    },
  },
]

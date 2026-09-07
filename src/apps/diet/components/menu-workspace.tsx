"use client"

import { useState } from "react"
import { Pencil, Plus, Sparkles, Trash2 } from "lucide-react"
import { MenuItemDetailDialog } from "@/apps/diet/components/menu-item-detail-dialog"
import { MenuSuggestionsStrip } from "@/apps/diet/components/menu-suggestions-strip"
import {
  createMenuItemAction,
  deleteMenuItemAction,
  updateMenuItemAction,
} from "@/apps/diet/services/menu-actions"
import {
  acceptMenuSuggestionsAction,
  estimateMenuNutritionAction,
  suggestMenuItemsAction,
} from "@/apps/diet/services/nutrition-actions"
import type { MenuItem } from "@/apps/diet/types"
import { MENU_CATEGORIES } from "@/apps/diet/types"
import { NutritionFactsLine } from "@/apps/diet/components/nutrition-facts-line"
import { hasRecipeContent, textFromLines } from "@/apps/diet/utils/recipe"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useOnlineStatus } from "@/platform/offline/use-online-status"

type MenuItemFormState = {
  name: string
  category: string
  servingLabel: string
  calories: string
  carbsG: string
  proteinG: string
  fatG: string
  notes: string
  ingredients: string
  instructions: string
}

const emptyForm = (): MenuItemFormState => ({
  name: "",
  category: "",
  servingLabel: "1 serving",
  calories: "0",
  carbsG: "0",
  proteinG: "0",
  fatG: "0",
  notes: "",
  ingredients: "",
  instructions: "",
})

const formFromItem = (item: MenuItem): MenuItemFormState => ({
  name: item.name,
  category: item.category ?? "",
  servingLabel: item.serving_label,
  calories: String(item.calories),
  carbsG: String(item.carbs_g),
  proteinG: String(item.protein_g),
  fatG: String(item.fat_g),
  notes: item.notes ?? "",
  ingredients: item.ingredients ?? "",
  instructions: item.instructions ?? "",
})

type MenuItemDialogProps = {
  item?: MenuItem
}

const MenuItemDialog = ({ item }: MenuItemDialogProps) => {
  const isOnline = useOnlineStatus()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<MenuItemFormState>(emptyForm)
  const [error, setError] = useState("")
  const [estimateNote, setEstimateNote] = useState("")
  const [isPending, setIsPending] = useState(false)
  const [isEstimating, setIsEstimating] = useState(false)

  const isEditing = Boolean(item)

  const handleOpenChange = (next: boolean) => {
    setOpen(next)
    if (next) {
      setForm(item ? formFromItem(item) : emptyForm())
      setError("")
      setEstimateNote("")
    }
  }

  const updateField = <K extends keyof MenuItemFormState>(
    key: K,
    value: MenuItemFormState[K]
  ) => {
    setForm((current) => ({ ...current, [key]: value }))
  }

  const handleEstimate = async () => {
    if (!form.name.trim()) {
      setError("Enter a dish name before estimating.")
      return
    }

    if (!isOnline) {
      setError("AI fill needs a connection.")
      return
    }

    setIsEstimating(true)
    setError("")
    setEstimateNote("")

    const result = await estimateMenuNutritionAction({
      name: form.name,
      servingLabel: form.servingLabel,
      notes: form.notes,
      includeRecipe: true,
    })

    setIsEstimating(false)

    if (result.error || !result.result) {
      setError(result.error ?? "Failed to estimate dish details.")
      return
    }

    setForm((current) => ({
      ...current,
      calories: String(result.result!.calories),
      carbsG: String(result.result!.carbs_g),
      proteinG: String(result.result!.protein_g),
      fatG: String(result.result!.fat_g),
      servingLabel: result.result!.serving_label?.trim() || current.servingLabel,
      ingredients: result.result!.ingredients?.length
        ? textFromLines(result.result!.ingredients)
        : current.ingredients,
      instructions: result.result!.instructions?.length
        ? textFromLines(result.result!.instructions)
        : current.instructions,
    }))
    setEstimateNote(
      result.result.note?.trim() ||
        "AI estimate — review nutrition and recipe before saving."
    )
  }

  const handleSubmit = async (formData: FormData) => {
    setIsPending(true)
    setError("")

    formData.set("name", form.name)
    formData.set("category", form.category)
    formData.set("servingLabel", form.servingLabel)
    formData.set("calories", form.calories)
    formData.set("carbsG", form.carbsG)
    formData.set("proteinG", form.proteinG)
    formData.set("fatG", form.fatG)
    formData.set("notes", form.notes)
    formData.set("ingredients", form.ingredients)
    formData.set("instructions", form.instructions)
    if (item) {
      formData.set("id", item.id)
    }

    const result = item
      ? await updateMenuItemAction(formData)
      : await createMenuItemAction(formData)

    setIsPending(false)

    if (result.error) {
      setError(result.error)
      return
    }

    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          isEditing ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Edit dish"
              onClick={(event) => event.stopPropagation()}
            />
          ) : (
            <Button type="button" />
          )
        }
      >
        {isEditing ? (
          <Pencil className="size-3.5" />
        ) : (
          <>
            <Plus className="size-3.5" />
            Add dish
          </>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[min(92dvh,720px)] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit menu dish" : "Add menu dish"}</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor={`menu-name-${item?.id ?? "new"}`}>Name</Label>
            <Input
              id={`menu-name-${item?.id ?? "new"}`}
              value={form.name}
              onChange={(event) => updateField("name", event.target.value)}
              placeholder="Chicken adobo"
              required
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label>Category</Label>
              <Select
                value={form.category || null}
                onValueChange={(value) => updateField("category", value ?? "")}
              >
                <SelectTrigger className="w-full capitalize">
                  <SelectValue placeholder="Optional" />
                </SelectTrigger>
                <SelectContent>
                  {MENU_CATEGORIES.map((category) => (
                    <SelectItem
                      key={category}
                      value={category}
                      className="capitalize"
                    >
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor={`menu-serving-${item?.id ?? "new"}`}>Serving</Label>
              <Input
                id={`menu-serving-${item?.id ?? "new"}`}
                value={form.servingLabel}
                onChange={(event) =>
                  updateField("servingLabel", event.target.value)
                }
                placeholder="1 serving"
                required
              />
            </div>
          </div>
          <div className="flex flex-col gap-3 rounded-lg border border-border/70 bg-muted/40 p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium">Nutrition & recipe</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isEstimating || isPending || !form.name.trim()}
                onClick={() => void handleEstimate()}
                className="gap-1.5"
              >
                <Sparkles className="size-3.5" />
                {isEstimating ? "Filling…" : "Fill with AI"}
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`menu-calories-${item?.id ?? "new"}`}>
                  Calories
                </Label>
                <Input
                  id={`menu-calories-${item?.id ?? "new"}`}
                  type="number"
                  min="0"
                  step="0.1"
                  value={form.calories}
                  onChange={(event) =>
                    updateField("calories", event.target.value)
                  }
                  required
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`menu-carbs-${item?.id ?? "new"}`}>
                  Carbs (g)
                </Label>
                <Input
                  id={`menu-carbs-${item?.id ?? "new"}`}
                  type="number"
                  min="0"
                  step="0.1"
                  value={form.carbsG}
                  onChange={(event) => updateField("carbsG", event.target.value)}
                  required
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`menu-protein-${item?.id ?? "new"}`}>
                  Protein (g)
                </Label>
                <Input
                  id={`menu-protein-${item?.id ?? "new"}`}
                  type="number"
                  min="0"
                  step="0.1"
                  value={form.proteinG}
                  onChange={(event) =>
                    updateField("proteinG", event.target.value)
                  }
                  required
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`menu-fat-${item?.id ?? "new"}`}>Fat (g)</Label>
                <Input
                  id={`menu-fat-${item?.id ?? "new"}`}
                  type="number"
                  min="0"
                  step="0.1"
                  value={form.fatG}
                  onChange={(event) => updateField("fatG", event.target.value)}
                  required
                />
              </div>
            </div>
            {estimateNote ? (
              <p className="text-xs text-muted-foreground">{estimateNote}</p>
            ) : (
              <p className="text-xs text-muted-foreground">
                AI can fill nutrition, ingredients, and cook steps from the dish
                name.
              </p>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor={`menu-ingredients-${item?.id ?? "new"}`}>
              Ingredients
            </Label>
            <Textarea
              id={`menu-ingredients-${item?.id ?? "new"}`}
              value={form.ingredients}
              onChange={(event) =>
                updateField("ingredients", event.target.value)
              }
              placeholder={"One ingredient per line\n500g chicken\n1/4 cup soy sauce"}
              rows={4}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor={`menu-instructions-${item?.id ?? "new"}`}>
              How to cook
            </Label>
            <Textarea
              id={`menu-instructions-${item?.id ?? "new"}`}
              value={form.instructions}
              onChange={(event) =>
                updateField("instructions", event.target.value)
              }
              placeholder={"One step per line\nMarinate the chicken\nSimmer until tender"}
              rows={4}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor={`menu-notes-${item?.id ?? "new"}`}>Notes</Label>
            <Textarea
              id={`menu-notes-${item?.id ?? "new"}`}
              value={form.notes}
              onChange={(event) => updateField("notes", event.target.value)}
              placeholder="Optional prep notes or portion details"
              rows={2}
            />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <DialogFooter>
            <Button type="submit" disabled={isPending || isEstimating}>
              {isPending ? "Saving…" : isEditing ? "Save changes" : "Add dish"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

type SuggestedDish = {
  name: string
  category: string | null
  serving_label: string
  reason: string | null
  calories: number
  carbs_g: number
  protein_g: number
  fat_g: number
}

const SuggestDishesDialog = () => {
  const isOnline = useOnlineStatus()
  const [open, setOpen] = useState(false)
  const [prompt, setPrompt] = useState("")
  const [suggestions, setSuggestions] = useState<SuggestedDish[]>([])
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const [error, setError] = useState("")
  const [isSuggesting, setIsSuggesting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const handleOpenChange = (next: boolean) => {
    setOpen(next)
    if (next) {
      setPrompt("")
      setSuggestions([])
      setSelected({})
      setError("")
    }
  }

  const handleSuggest = async () => {
    if (!isOnline) {
      setError("Suggestions need a connection.")
      return
    }

    setIsSuggesting(true)
    setError("")
    const result = await suggestMenuItemsAction({
      count: 5,
      prompt,
    })
    setIsSuggesting(false)

    if (result.error || !result.result) {
      setError(result.error ?? "Failed to suggest dishes.")
      return
    }

    setSuggestions(result.result.items)
    setSelected(
      Object.fromEntries(result.result.items.map((item) => [item.name, true]))
    )
  }

  const handleAccept = async () => {
    const items = suggestions.filter((item) => selected[item.name])
    if (items.length === 0) {
      setError("Select at least one dish.")
      return
    }

    setIsSaving(true)
    setError("")
    const result = await acceptMenuSuggestionsAction({
      items: items.map((item) => ({
        name: item.name,
        category: item.category,
        servingLabel: item.serving_label,
      })),
    })
    setIsSaving(false)

    if (result.error) {
      setError(result.error)
      return
    }

    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={<Button type="button" variant="outline" />}
      >
        <Sparkles className="size-3.5" />
        Suggest dishes
      </DialogTrigger>
      <DialogContent className="max-h-[min(92dvh,720px)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Meal suggestions</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="suggest-prompt">What are you in the mood for?</Label>
            <Textarea
              id="suggest-prompt"
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder="Optional — e.g. Filipino viands, light lunches, high protein"
              rows={2}
            />
          </div>
          <Button
            type="button"
            variant="secondary"
            disabled={isSuggesting || isSaving}
            onClick={() => void handleSuggest()}
          >
            {isSuggesting ? "Suggesting…" : "Get suggestions"}
          </Button>

          {suggestions.length > 0 ? (
            <div className="flex flex-col gap-2">
              {suggestions.map((item) => (
                <label
                  key={item.name}
                  className="flex cursor-pointer items-start gap-3 rounded-lg border border-border/70 bg-muted/40 px-3 py-2.5"
                >
                  <input
                    type="checkbox"
                    className="mt-1 size-4 rounded border-border"
                    checked={Boolean(selected[item.name])}
                    onChange={(event) =>
                      setSelected((current) => ({
                        ...current,
                        [item.name]: event.target.checked,
                      }))
                    }
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium">{item.name}</p>
                      {item.category ? (
                        <Badge variant="secondary" className="capitalize">
                          {item.category}
                        </Badge>
                      ) : null}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {item.serving_label}
                    </p>
                    <NutritionFactsLine
                      className="mt-0.5"
                      facts={{
                        calories: item.calories,
                        carbs_g: item.carbs_g,
                        protein_g: item.protein_g,
                        fat_g: item.fat_g,
                      }}
                    />
                    {item.reason ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {item.reason}
                      </p>
                    ) : null}
                  </div>
                </label>
              ))}
            </div>
          ) : null}

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          {suggestions.length > 0 ? (
            <DialogFooter>
              <Button
                type="button"
                disabled={isSaving || isSuggesting}
                onClick={() => void handleAccept()}
              >
                {isSaving ? "Adding…" : "Add selected to menu"}
              </Button>
            </DialogFooter>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}

type MenuWorkspaceProps = {
  items: MenuItem[]
}

export const MenuWorkspace = ({ items }: MenuWorkspaceProps) => {
  const [detailItem, setDetailItem] = useState<MenuItem | null>(null)
  const menuKey = items.map((item) => item.id).join("|")

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Menu</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Dishes you can cook. Add recipes once, then use them in the weekly
            plan.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SuggestDishesDialog />
          <MenuItemDialog />
        </div>
      </div>

      <MenuSuggestionsStrip menuKey={menuKey} />

      {items.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No dishes yet</CardTitle>
            <CardDescription>
              Build your menu, suggest dishes with AI, then pick from it when
              planning the week.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <Card
              key={item.id}
              size="sm"
              role="button"
              tabIndex={0}
              className="cursor-pointer transition-colors hover:bg-muted/40"
              onClick={() => setDetailItem(item)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault()
                  setDetailItem(item)
                }
              }}
            >
              <CardHeader>
                <CardTitle className="flex items-start justify-between gap-2">
                  <span className="min-w-0 truncate">{item.name}</span>
                  <div
                    className="flex shrink-0 items-center gap-1"
                    onClick={(event) => event.stopPropagation()}
                    onKeyDown={(event) => event.stopPropagation()}
                  >
                    <MenuItemDialog item={item} />
                    <form
                      action={async (formData) => {
                        await deleteMenuItemAction(formData)
                      }}
                    >
                      <input type="hidden" name="id" value={item.id} />
                      <Button
                        type="submit"
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Delete dish"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </form>
                  </div>
                </CardTitle>
                <CardDescription className="flex flex-wrap items-center gap-2">
                  {item.category ? (
                    <Badge variant="secondary" className="capitalize">
                      {item.category}
                    </Badge>
                  ) : null}
                  <span>{item.serving_label}</span>
                  {hasRecipeContent(item) ? (
                    <Badge variant="outline" className="font-normal">
                      Recipe
                    </Badge>
                  ) : null}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                <NutritionFactsLine
                  facts={{
                    calories: item.calories,
                    carbs_g: item.carbs_g,
                    protein_g: item.protein_g,
                    fat_g: item.fat_g,
                  }}
                />
                {item.notes ? (
                  <p className="line-clamp-2 text-xs text-muted-foreground">
                    {item.notes}
                  </p>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <MenuItemDetailDialog
        item={detailItem}
        open={Boolean(detailItem)}
        onOpenChange={(open) => {
          if (!open) setDetailItem(null)
        }}
      />
    </div>
  )
}

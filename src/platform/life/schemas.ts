import { z } from "zod"
import {
  LIFE_APPS,
  REPORT_CADENCES,
  LIFE_CONFIDENCE,
} from "@/platform/life/types"

export const lifeAppSchema = z.enum(LIFE_APPS)
export const reportCadenceSchema = z.enum(REPORT_CADENCES)
export const lifeConfidenceSchema = z.enum(LIFE_CONFIDENCE)

export const reportPreferencesInputSchema = z.object({
  enabled: z.boolean(),
  notify_push: z.boolean().default(true),
  cadence: reportCadenceSchema.default("weekly"),
  timezone: z.string().trim().min(1).max(64).default("Asia/Manila"),
  preferred_hour: z.coerce.number().int().min(0).max(23).default(7),
  apps: z.array(lifeAppSchema).min(1).max(4).default([...LIFE_APPS]),
})

export type ReportPreferencesInput = z.infer<typeof reportPreferencesInputSchema>

export const healthAssessmentSchema = z.object({
  status: z.enum(["improving", "stable", "declining", "insufficient_data"]),
  bmi_band: z.enum([
    "underweight",
    "healthy",
    "overweight",
    "obese",
    "unknown",
  ]),
  weight_trend: z.enum(["down", "flat", "up", "unknown"]),
  activity_level: z.enum([
    "sedentary",
    "light",
    "active",
    "very_active",
    "unknown",
  ]),
  summary: z.string().trim().min(1).max(500),
  advice: z.array(z.string().trim().min(1).max(200)).max(3),
})

export const dietAssessmentSchema = z.object({
  status: z.enum([
    "balanced",
    "protein_heavy",
    "fat_heavy",
    "carb_heavy",
    "underfueled",
    "inconsistent",
    "insufficient_data",
  ]),
  avg_daily_calories: z.number().nullable(),
  avg_protein_g: z.number().nullable(),
  avg_carbs_g: z.number().nullable(),
  avg_fat_g: z.number().nullable(),
  meal_coverage_pct: z.number().nullable(),
  summary: z.string().trim().min(1).max(500),
  advice: z.array(z.string().trim().min(1).max(200)).max(3),
})

export const moneyAssessmentSchema = z.object({
  status: z.enum([
    "stable",
    "building",
    "stressed",
    "debt_heavy",
    "insufficient_data",
  ]),
  income_trend: z.enum(["growing", "flat", "shrinking", "unknown"]),
  expense_trend: z.enum(["up", "flat", "down", "unknown"]),
  debt_pressure: z.enum(["none", "manageable", "high", "unknown"]),
  summary: z.string().trim().min(1).max(500),
  advice: z.array(z.string().trim().min(1).max(200)).max(3),
})

export const notesAssessmentSchema = z.object({
  themes: z.array(z.string().trim().min(1).max(80)).max(8),
  interests: z.array(z.string().trim().min(1).max(80)).max(8),
  open_problems: z.array(z.string().trim().min(1).max(120)).max(6),
  emotional_signals: z.array(z.string().trim().min(1).max(80)).max(6),
  summary: z.string().trim().min(1).max(500),
  advice_posture: z.string().trim().min(1).max(240),
})

export const domainDeltasSchema = z.object({
  health: z.string().trim().max(200),
  diet: z.string().trim().max(200),
  money: z.string().trim().max(200),
  notes: z.string().trim().max(200),
})

export const lifeGenerationResultSchema = z.object({
  confidence: lifeConfidenceSchema,
  portrait_summary: z.string().trim().min(1).max(800),
  push_summary: z.string().trim().min(1).max(160),
  priorities: z.array(z.string().trim().min(1).max(120)).max(5),
  risks: z.array(z.string().trim().min(1).max(120)).max(5),
  strengths: z.array(z.string().trim().min(1).max(120)).max(5),
  health: healthAssessmentSchema,
  diet: dietAssessmentSchema,
  money: moneyAssessmentSchema,
  notes: notesAssessmentSchema,
  report_markdown: z.string().trim().min(1).max(8000),
  domain_deltas: domainDeltasSchema,
})

export type LifeGenerationResult = z.infer<typeof lifeGenerationResultSchema>

import { createClient } from "@/lib/supabase/server"
import type {
  CreateTransactionInput,
  UpdateTransactionInput,
} from "@/apps/money/schemas/transaction"
import type { MoneyTransaction, MonthSummary } from "@/apps/money/types"
import { DEFAULT_CURRENCY } from "@/apps/money/types"
import {
  normalizeTransaction,
  summarizeTransactions,
} from "@/apps/money/utils/money"
import { formatMonthKey, getMonthBounds } from "@/apps/money/utils/month"

export const getCurrentUserId = async () => {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error("Unauthorized")
  }

  return user.id
}

export const listTransactionsForMonth = async (
  monthKey: string = formatMonthKey()
): Promise<MoneyTransaction[]> => {
  const supabase = await createClient()
  const userId = await getCurrentUserId()
  const { start, end } = getMonthBounds(monthKey)

  const { data, error } = await supabase
    .from("money_transactions")
    .select("*")
    .eq("user_id", userId)
    .gte("occurred_on", start)
    .lte("occurred_on", end)
    .order("occurred_on", { ascending: false })
    .order("created_at", { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []).map((row) =>
    normalizeTransaction(row as Record<string, unknown>)
  )
}

export const getMonthSummary = async (
  monthKey: string = formatMonthKey()
): Promise<MonthSummary> => {
  const transactions = await listTransactionsForMonth(monthKey)
  return summarizeTransactions(transactions, DEFAULT_CURRENCY)
}

export const getRecentTransactions = async (
  limit = 5
): Promise<MoneyTransaction[]> => {
  const supabase = await createClient()
  const userId = await getCurrentUserId()

  const { data, error } = await supabase
    .from("money_transactions")
    .select("*")
    .eq("user_id", userId)
    .order("occurred_on", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit)

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []).map((row) =>
    normalizeTransaction(row as Record<string, unknown>)
  )
}

export const listTransactions = async (input?: {
  query?: string
  type?: "expense" | "income"
  limit?: number
}): Promise<MoneyTransaction[]> => {
  const supabase = await createClient()
  const userId = await getCurrentUserId()
  const limit = input?.limit ?? 40

  let request = supabase
    .from("money_transactions")
    .select("*")
    .eq("user_id", userId)
    .order("occurred_on", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit)

  if (input?.type) {
    request = request.eq("type", input.type)
  }

  const trimmed = input?.query?.trim()
  if (trimmed) {
    const safeQuery = trimmed.replace(/[%(),]/g, " ").trim()
    if (safeQuery) {
      request = request.or(
        `title.ilike.%${safeQuery}%,category.ilike.%${safeQuery}%,notes.ilike.%${safeQuery}%`
      )
    }
  }

  const { data, error } = await request

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []).map((row) =>
    normalizeTransaction(row as Record<string, unknown>)
  )
}

export const createTransaction = async (input: CreateTransactionInput) => {
  const supabase = await createClient()
  const userId = await getCurrentUserId()

  const { data, error } = await supabase
    .from("money_transactions")
    .insert({
      user_id: userId,
      type: input.type,
      amount: input.amount,
      currency: DEFAULT_CURRENCY,
      category: input.category,
      title: input.title,
      notes: input.notes?.trim() ? input.notes.trim() : null,
      occurred_on: input.occurredOn,
    })
    .select("*")
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return normalizeTransaction(data as Record<string, unknown>)
}

export const updateTransaction = async (input: UpdateTransactionInput) => {
  const supabase = await createClient()
  const userId = await getCurrentUserId()

  const { data, error } = await supabase
    .from("money_transactions")
    .update({
      type: input.type,
      amount: input.amount,
      category: input.category,
      title: input.title,
      notes: input.notes?.trim() ? input.notes.trim() : null,
      occurred_on: input.occurredOn,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.id)
    .eq("user_id", userId)
    .select("*")
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return normalizeTransaction(data as Record<string, unknown>)
}

export const deleteTransaction = async (id: string) => {
  const supabase = await createClient()
  const userId = await getCurrentUserId()

  const { data: existing, error: existingError } = await supabase
    .from("money_transactions")
    .select("id")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle()

  if (existingError) {
    throw new Error(existingError.message)
  }

  if (!existing) {
    throw new Error("Transaction not found.")
  }

  const { error } = await supabase
    .from("money_transactions")
    .delete()
    .eq("id", id)
    .eq("user_id", userId)

  if (error) {
    throw new Error(error.message)
  }
}

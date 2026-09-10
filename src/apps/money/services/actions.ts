"use server"

import { revalidatePath } from "next/cache"
import {
  createTransactionSchema,
  updateTransactionSchema,
} from "@/apps/money/schemas/transaction"
import {
  createTransaction,
  deleteTransaction,
  updateTransaction,
} from "@/apps/money/services/transactions"
import type { MoneyTransaction } from "@/apps/money/types"

const revalidateMoney = () => {
  revalidatePath("/money")
  revalidatePath("/dashboard")
}

type ActionResult = {
  success?: boolean
  error?: string
  transaction?: MoneyTransaction
}

export const createTransactionAction = async (
  formData: FormData
): Promise<ActionResult> => {
  const parsed = createTransactionSchema.safeParse({
    type: formData.get("type"),
    amount: formData.get("amount"),
    category: formData.get("category"),
    title: formData.get("title"),
    notes: formData.get("notes") || null,
    occurredOn: formData.get("occurredOn"),
  })

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Invalid transaction data.",
    }
  }

  try {
    const transaction = await createTransaction(parsed.data)
    revalidateMoney()
    return { success: true, transaction }
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Failed to create transaction.",
    }
  }
}

export const updateTransactionAction = async (
  formData: FormData
): Promise<ActionResult> => {
  const parsed = updateTransactionSchema.safeParse({
    id: formData.get("id"),
    type: formData.get("type"),
    amount: formData.get("amount"),
    category: formData.get("category"),
    title: formData.get("title"),
    notes: formData.get("notes") || null,
    occurredOn: formData.get("occurredOn"),
  })

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Invalid transaction data.",
    }
  }

  try {
    const transaction = await updateTransaction(parsed.data)
    revalidateMoney()
    return { success: true, transaction }
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Failed to update transaction.",
    }
  }
}

export const deleteTransactionAction = async (
  formData: FormData
): Promise<ActionResult> => {
  const id = String(formData.get("id") ?? "")

  if (!id) {
    return { error: "Transaction id is required." }
  }

  try {
    await deleteTransaction(id)
    revalidateMoney()
    return { success: true }
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Failed to delete transaction.",
    }
  }
}

"use server"

import { revalidatePath } from "next/cache"
import {
  createDebtSchema,
  recordDebtPaymentSchema,
  updateDebtSchema,
} from "@/apps/money/schemas/debt"
import {
  createDebt,
  deleteDebt,
  recordDebtPayment,
  updateDebt,
} from "@/apps/money/services/debts"
import type { MoneyDebt, MoneyDebtPayment } from "@/apps/money/types"

const revalidateMoney = () => {
  revalidatePath("/money")
  revalidatePath("/dashboard")
}

type DebtActionResult = {
  success?: boolean
  error?: string
  debt?: MoneyDebt
  payment?: MoneyDebtPayment
}

const parseInstallmentsField = (raw: FormDataEntryValue | null) => {
  if (raw == null || raw === "") return undefined
  try {
    const parsed = JSON.parse(String(raw)) as unknown
    if (!Array.isArray(parsed)) return undefined
    return parsed
  } catch {
    return undefined
  }
}

export const createDebtAction = async (
  formData: FormData
): Promise<DebtActionResult> => {
  const installmentRaw = formData.get("installmentAmount")
  const schedule = String(formData.get("schedule") ?? "")
  const parsed = createDebtSchema.safeParse({
    direction: formData.get("direction"),
    counterparty: formData.get("counterparty"),
    title: formData.get("title"),
    originalAmount:
      schedule === "custom"
        ? undefined
        : formData.get("originalAmount") || undefined,
    schedule,
    installmentAmount:
      installmentRaw === null || installmentRaw === ""
        ? undefined
        : installmentRaw,
    nextDueOn: formData.get("nextDueOn") || null,
    installments: parseInstallmentsField(formData.get("installments")),
    notes: formData.get("notes") || null,
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid debt data." }
  }

  try {
    const debt = await createDebt(parsed.data)
    revalidateMoney()
    return { success: true, debt }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to create debt.",
    }
  }
}

export const updateDebtAction = async (
  formData: FormData
): Promise<DebtActionResult> => {
  const installmentRaw = formData.get("installmentAmount")
  const schedule = String(formData.get("schedule") ?? "")
  const parsed = updateDebtSchema.safeParse({
    id: formData.get("id"),
    direction: formData.get("direction"),
    counterparty: formData.get("counterparty"),
    title: formData.get("title"),
    schedule,
    installmentAmount:
      schedule === "custom"
        ? undefined
        : installmentRaw === null || installmentRaw === ""
          ? undefined
          : installmentRaw,
    nextDueOn: formData.get("nextDueOn") || null,
    installments: parseInstallmentsField(formData.get("installments")),
    notes: formData.get("notes") || null,
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid debt data." }
  }

  try {
    const debt = await updateDebt(parsed.data)
    revalidateMoney()
    return { success: true, debt }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to update debt.",
    }
  }
}

export const deleteDebtAction = async (
  formData: FormData
): Promise<DebtActionResult> => {
  const id = String(formData.get("id") ?? "")
  if (!id) {
    return { error: "Debt id is required." }
  }

  try {
    await deleteDebt(id)
    revalidateMoney()
    return { success: true }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to delete debt.",
    }
  }
}

export const recordDebtPaymentAction = async (
  formData: FormData
): Promise<DebtActionResult> => {
  const parsed = recordDebtPaymentSchema.safeParse({
    debtId: formData.get("debtId"),
    amount: formData.get("amount"),
    paidOn: formData.get("paidOn"),
    notes: formData.get("notes") || null,
    logTransaction: formData.get("logTransaction") !== "false",
  })

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Invalid payment data.",
    }
  }

  try {
    const result = await recordDebtPayment(parsed.data)
    revalidateMoney()
    return {
      success: true,
      debt: result.debt,
      payment: result.payment,
    }
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Failed to record payment.",
    }
  }
}

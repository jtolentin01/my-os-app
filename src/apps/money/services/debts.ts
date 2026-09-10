import { createClient } from "@/lib/supabase/server"
import type {
  CreateDebtInput,
  RecordDebtPaymentInput,
  UpdateDebtInput,
} from "@/apps/money/schemas/debt"
import {
  createTransaction,
  deleteTransaction,
  getCurrentUserId,
} from "@/apps/money/services/transactions"
import type {
  MoneyDebt,
  MoneyDebtInstallment,
  MoneyDebtPayment,
} from "@/apps/money/types"
import { DEFAULT_CURRENCY } from "@/apps/money/types"
import {
  advanceDueDate,
  isDueSoon,
  nextOpenInstallmentAmount,
  nextOpenInstallmentDue,
  resolveInitialNextDue,
} from "@/apps/money/utils/debt"
import {
  normalizeDebt,
  normalizeDebtInstallment,
  normalizeDebtPayment,
  summarizeDebts,
  toAmountNumber,
} from "@/apps/money/utils/money"

export const listDebtInstallments = async (
  debtId: string
): Promise<MoneyDebtInstallment[]> => {
  const supabase = await createClient()
  const userId = await getCurrentUserId()

  const { data, error } = await supabase
    .from("money_debt_installments")
    .select("*")
    .eq("user_id", userId)
    .eq("debt_id", debtId)
    .order("due_on", { ascending: true })
    .order("sort_order", { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []).map((row) =>
    normalizeDebtInstallment(row as Record<string, unknown>)
  )
}

const attachInstallments = async (debts: MoneyDebt[]) => {
  const customIds = debts
    .filter((debt) => debt.schedule === "custom")
    .map((debt) => debt.id)

  if (customIds.length === 0) {
    return debts
  }

  const supabase = await createClient()
  const userId = await getCurrentUserId()

  const { data, error } = await supabase
    .from("money_debt_installments")
    .select("*")
    .eq("user_id", userId)
    .in("debt_id", customIds)
    .order("due_on", { ascending: true })
    .order("sort_order", { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  const byDebt = new Map<string, MoneyDebtInstallment[]>()
  for (const row of data ?? []) {
    const installment = normalizeDebtInstallment(row as Record<string, unknown>)
    const list = byDebt.get(installment.debt_id) ?? []
    list.push(installment)
    byDebt.set(installment.debt_id, list)
  }

  return debts.map((debt) =>
    debt.schedule === "custom"
      ? { ...debt, installments: byDebt.get(debt.id) ?? [] }
      : debt
  )
}

export const listDebts = async (input?: {
  status?: "open" | "paid" | "all"
  withInstallments?: boolean
}): Promise<MoneyDebt[]> => {
  const supabase = await createClient()
  const userId = await getCurrentUserId()
  const status = input?.status ?? "open"

  let request = supabase
    .from("money_debts")
    .select("*")
    .eq("user_id", userId)
    .order("status", { ascending: true })
    .order("next_due_on", { ascending: true })
    .order("updated_at", { ascending: false })

  if (status !== "all") {
    request = request.eq("status", status)
  }

  const { data, error } = await request

  if (error) {
    throw new Error(error.message)
  }

  const debts = (data ?? []).map((row) =>
    normalizeDebt(row as Record<string, unknown>)
  )

  if (input?.withInstallments === false) {
    return debts
  }

  return attachInstallments(debts)
}

export const getDebtSummary = async () => {
  const debts = await listDebts({ status: "open", withInstallments: false })
  return summarizeDebts(debts, DEFAULT_CURRENCY)
}

export const getDueSoonDebts = async (limit = 5): Promise<MoneyDebt[]> => {
  const debts = await listDebts({ status: "open", withInstallments: false })
  return debts
    .filter((debt) => isDueSoon(debt.next_due_on))
    .sort((a, b) => {
      const left = a.next_due_on ?? ""
      const right = b.next_due_on ?? ""
      return left.localeCompare(right)
    })
    .slice(0, limit)
}

export const getDebtById = async (id: string): Promise<MoneyDebt | null> => {
  const supabase = await createClient()
  const userId = await getCurrentUserId()

  const { data, error } = await supabase
    .from("money_debts")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  if (!data) return null

  const debt = normalizeDebt(data as Record<string, unknown>)
  if (debt.schedule !== "custom") return debt

  const installments = await listDebtInstallments(debt.id)
  return { ...debt, installments }
}

export const listDebtPayments = async (
  debtId: string,
  limit = 20
): Promise<MoneyDebtPayment[]> => {
  const supabase = await createClient()
  const userId = await getCurrentUserId()

  const { data, error } = await supabase
    .from("money_debt_payments")
    .select("*")
    .eq("user_id", userId)
    .eq("debt_id", debtId)
    .order("paid_on", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit)

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []).map((row) =>
    normalizeDebtPayment(row as Record<string, unknown>)
  )
}

const insertInstallments = async (input: {
  userId: string
  debtId: string
  installments: Array<{ dueOn: string; amount: number }>
}) => {
  const supabase = await createClient()
  const sorted = [...input.installments].sort((a, b) =>
    a.dueOn.localeCompare(b.dueOn)
  )

  const { error } = await supabase.from("money_debt_installments").insert(
    sorted.map((item, index) => ({
      user_id: input.userId,
      debt_id: input.debtId,
      due_on: item.dueOn,
      amount: item.amount,
      paid_amount: 0,
      status: "open",
      sort_order: index,
    }))
  )

  if (error) {
    throw new Error(error.message)
  }

  return sorted
}

export const createDebt = async (input: CreateDebtInput) => {
  const supabase = await createClient()
  const userId = await getCurrentUserId()

  const isCustom = input.schedule === "custom"
  const installments = isCustom ? (input.installments ?? []) : []
  const originalAmount = isCustom
    ? Math.round(
        installments.reduce((sum, item) => sum + item.amount, 0) * 100
      ) / 100
    : toAmountNumber(input.originalAmount)

  if (originalAmount <= 0) {
    throw new Error("Amount must be greater than 0.")
  }

  const installmentAmount = isCustom
    ? toAmountNumber(installments[0]?.amount ?? originalAmount)
    : toAmountNumber(input.installmentAmount ?? originalAmount)

  const nextDueOn = isCustom
    ? nextOpenInstallmentDue(
        installments.map((item) => ({
          due_on: item.dueOn,
          status: "open",
        }))
      )
    : resolveInitialNextDue(input.schedule, input.nextDueOn)

  const { data, error } = await supabase
    .from("money_debts")
    .insert({
      user_id: userId,
      direction: input.direction,
      counterparty: input.counterparty,
      title: input.title,
      original_amount: originalAmount,
      remaining_amount: originalAmount,
      currency: DEFAULT_CURRENCY,
      schedule: input.schedule,
      installment_amount: installmentAmount,
      next_due_on: nextDueOn,
      notes: input.notes?.trim() ? input.notes.trim() : null,
      status: "open",
    })
    .select("*")
    .single()

  if (error) {
    throw new Error(error.message)
  }

  const debt = normalizeDebt(data as Record<string, unknown>)

  if (isCustom) {
    try {
      await insertInstallments({
        userId,
        debtId: debt.id,
        installments,
      })
    } catch (installmentError) {
      await supabase
        .from("money_debts")
        .delete()
        .eq("id", debt.id)
        .eq("user_id", userId)
      throw installmentError
    }

    const saved = await listDebtInstallments(debt.id)
    return { ...debt, installments: saved }
  }

  return debt
}

export const updateDebt = async (input: UpdateDebtInput) => {
  const supabase = await createClient()
  const userId = await getCurrentUserId()

  const existing = await getDebtById(input.id)
  if (!existing) {
    throw new Error("Debt not found.")
  }

  if (existing.status === "paid") {
    throw new Error("Paid debts cannot be edited.")
  }

  const isCustom = input.schedule === "custom"
  const installments = isCustom ? (input.installments ?? []) : []

  if (isCustom && installments.length === 0) {
    throw new Error("Add at least one specific due date.")
  }

  const paidInstallments = (existing.installments ?? []).filter(
    (item) => item.status === "paid"
  )
  const paidTotal = Math.round(
    paidInstallments.reduce((sum, item) => sum + item.amount, 0) * 100
  ) / 100

  const openTotal = isCustom
    ? Math.round(
        installments.reduce((sum, item) => sum + item.amount, 0) * 100
      ) / 100
    : 0

  const originalAmount = isCustom
    ? Math.round((paidTotal + openTotal) * 100) / 100
    : existing.original_amount

  const remainingAmount = isCustom
    ? openTotal
    : existing.remaining_amount

  const installmentAmount = isCustom
    ? toAmountNumber(installments[0]?.amount ?? remainingAmount)
    : toAmountNumber(input.installmentAmount ?? existing.installment_amount)

  const nextDueOn = isCustom
    ? nextOpenInstallmentDue(
        installments.map((item) => ({
          due_on: item.dueOn,
          status: "open",
        }))
      )
    : input.schedule === "once"
      ? resolveInitialNextDue(input.schedule, input.nextDueOn)
      : input.nextDueOn
        ? input.nextDueOn
        : existing.next_due_on

  const { data, error } = await supabase
    .from("money_debts")
    .update({
      direction: input.direction,
      counterparty: input.counterparty,
      title: input.title,
      schedule: input.schedule,
      installment_amount: installmentAmount,
      original_amount: originalAmount,
      remaining_amount: isCustom ? remainingAmount : existing.remaining_amount,
      next_due_on: nextDueOn,
      notes: input.notes?.trim() ? input.notes.trim() : null,
      status: isCustom && remainingAmount <= 0 ? "paid" : "open",
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.id)
    .eq("user_id", userId)
    .select("*")
    .single()

  if (error) {
    throw new Error(error.message)
  }

  if (isCustom) {
    const { error: deleteError } = await supabase
      .from("money_debt_installments")
      .delete()
      .eq("debt_id", input.id)
      .eq("user_id", userId)
      .eq("status", "open")

    if (deleteError) {
      throw new Error(deleteError.message)
    }

    await insertInstallments({
      userId,
      debtId: input.id,
      installments,
    })
  } else if (existing.schedule === "custom") {
    const { error: deleteError } = await supabase
      .from("money_debt_installments")
      .delete()
      .eq("debt_id", input.id)
      .eq("user_id", userId)
      .eq("status", "open")

    if (deleteError) {
      throw new Error(deleteError.message)
    }
  }

  const debt = normalizeDebt(data as Record<string, unknown>)
  if (debt.schedule === "custom") {
    const saved = await listDebtInstallments(debt.id)
    return { ...debt, installments: saved }
  }

  return debt
}

export const deleteDebt = async (id: string) => {
  const supabase = await createClient()
  const userId = await getCurrentUserId()

  const existing = await getDebtById(id)
  if (!existing) {
    throw new Error("Debt not found.")
  }

  const { error } = await supabase
    .from("money_debts")
    .delete()
    .eq("id", id)
    .eq("user_id", userId)

  if (error) {
    throw new Error(error.message)
  }
}

const applyPaymentToInstallments = async (input: {
  userId: string
  debtId: string
  paymentAmount: number
}) => {
  const supabase = await createClient()
  const installments = await listDebtInstallments(input.debtId)
  const open = installments
    .filter((item) => item.status === "open")
    .sort((a, b) => a.due_on.localeCompare(b.due_on))

  let left = input.paymentAmount

  for (const installment of open) {
    if (left <= 0) break
    const need =
      Math.round((installment.amount - installment.paid_amount) * 100) / 100
    if (need <= 0) continue

    const apply = Math.min(left, need)
    const paidAmount =
      Math.round((installment.paid_amount + apply) * 100) / 100
    const status = paidAmount + 0.001 >= installment.amount ? "paid" : "open"

    const { error } = await supabase
      .from("money_debt_installments")
      .update({
        paid_amount: paidAmount,
        status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", installment.id)
      .eq("user_id", input.userId)

    if (error) {
      throw new Error(error.message)
    }

    left = Math.round((left - apply) * 100) / 100
  }

  const refreshed = await listDebtInstallments(input.debtId)
  return {
    nextDueOn: nextOpenInstallmentDue(refreshed),
    installmentAmount: nextOpenInstallmentAmount(refreshed) || 0,
    installments: refreshed,
  }
}

export const recordDebtPayment = async (input: RecordDebtPaymentInput) => {
  const supabase = await createClient()
  const userId = await getCurrentUserId()

  const debt = await getDebtById(input.debtId)
  if (!debt) {
    throw new Error("Debt not found.")
  }

  if (debt.status === "paid") {
    throw new Error("This debt is already paid.")
  }

  const paymentAmount = Math.min(
    toAmountNumber(input.amount),
    debt.remaining_amount
  )

  if (paymentAmount <= 0) {
    throw new Error("Payment amount must be greater than 0.")
  }

  let transactionId: string | null = null
  let paymentId: string | null = null
  let installmentSnapshot: MoneyDebtInstallment[] = []

  try {
    if (input.logTransaction !== false) {
      const isPayingOut = debt.direction === "i_owe"
      const transaction = await createTransaction({
        type: isPayingOut ? "expense" : "income",
        amount: paymentAmount,
        category: "debt",
        title: isPayingOut
          ? `Debt payment · ${debt.counterparty}`
          : `Debt received · ${debt.counterparty}`,
        notes: input.notes?.trim()
          ? input.notes.trim()
          : `Payment for ${debt.title}`,
        occurredOn: input.paidOn,
      })
      transactionId = transaction.id
    }

    const { data: paymentRow, error: paymentError } = await supabase
      .from("money_debt_payments")
      .insert({
        user_id: userId,
        debt_id: debt.id,
        amount: paymentAmount,
        paid_on: input.paidOn,
        notes: input.notes?.trim() ? input.notes.trim() : null,
        transaction_id: transactionId,
      })
      .select("*")
      .single()

    if (paymentError) {
      throw new Error(paymentError.message)
    }

    paymentId = String(paymentRow.id)

    const remaining =
      Math.round((debt.remaining_amount - paymentAmount) * 100) / 100
    const paidOff = remaining <= 0

    let nextDueOn = debt.next_due_on
    let installmentAmount = debt.installment_amount
    let installments = debt.installments

    if (debt.schedule === "custom") {
      installmentSnapshot = await listDebtInstallments(debt.id)
      const applied = await applyPaymentToInstallments({
        userId,
        debtId: debt.id,
        paymentAmount,
      })
      nextDueOn = paidOff ? null : applied.nextDueOn
      installmentAmount = paidOff
        ? debt.installment_amount
        : applied.installmentAmount || debt.installment_amount
      installments = applied.installments
    } else {
      const coveredInstallment =
        paymentAmount + 0.001 >= debt.installment_amount
      nextDueOn = paidOff
        ? null
        : debt.schedule === "once" || !coveredInstallment
          ? debt.next_due_on
          : advanceDueDate(
              debt.schedule,
              debt.next_due_on && debt.next_due_on > input.paidOn
                ? debt.next_due_on
                : input.paidOn
            )
    }

    const { data: updatedDebt, error: updateError } = await supabase
      .from("money_debts")
      .update({
        remaining_amount: Math.max(0, remaining),
        status: paidOff ? "paid" : "open",
        next_due_on: nextDueOn,
        installment_amount: installmentAmount,
        updated_at: new Date().toISOString(),
      })
      .eq("id", debt.id)
      .eq("user_id", userId)
      .select("*")
      .single()

    if (updateError) {
      throw new Error(updateError.message)
    }

    return {
      debt: {
        ...normalizeDebt(updatedDebt as Record<string, unknown>),
        ...(installments ? { installments } : {}),
      },
      payment: normalizeDebtPayment(paymentRow as Record<string, unknown>),
    }
  } catch (error) {
    if (installmentSnapshot.length > 0) {
      for (const item of installmentSnapshot) {
        await supabase
          .from("money_debt_installments")
          .update({
            paid_amount: item.paid_amount,
            status: item.status,
            updated_at: new Date().toISOString(),
          })
          .eq("id", item.id)
          .eq("user_id", userId)
      }
    }
    if (paymentId) {
      await supabase
        .from("money_debt_payments")
        .delete()
        .eq("id", paymentId)
        .eq("user_id", userId)
    }
    if (transactionId) {
      try {
        await deleteTransaction(transactionId)
      } catch {}
    }
    throw error
  }
}

"use client"

import { useMemo, useState, useTransition } from "react"
import { Pencil, Plus, Trash2, Wallet } from "lucide-react"
import {
  createDebtAction,
  deleteDebtAction,
  recordDebtPaymentAction,
  updateDebtAction,
} from "@/apps/money/services/debt-actions"
import type {
  DebtDirection,
  DebtSchedule,
  MoneyDebt,
} from "@/apps/money/types"
import {
  DEBT_DIRECTIONS,
  DEBT_SCHEDULES,
} from "@/apps/money/types"
import {
  formatDirectionLabel,
  formatScheduleLabel,
  isDueSoon,
  isOverdue,
  nextOpenInstallmentAmount,
} from "@/apps/money/utils/debt"
import { formatMoney } from "@/apps/money/utils/money"
import {
  formatCalendarDay,
  formatOccurredOn,
} from "@/apps/money/utils/month"
import { useModalHistory } from "@/platform/hooks/use-modal-history"
import { ensurePushSubscription } from "@/platform/push/ensure-subscription"
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
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

type DraftInstallment = {
  key: string
  dueOn: string
  amount: string
}

const newDraftInstallment = (): DraftInstallment => ({
  key: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  dueOn: formatCalendarDay(),
  amount: "",
})

type DebtEditorDialogProps = {
  debt?: MoneyDebt
  variant?: "create" | "edit"
}

export const DebtEditorDialog = ({
  debt,
  variant = "create",
}: DebtEditorDialogProps) => {
  const isEditing = variant === "edit" && Boolean(debt)
  const [open, setOpen] = useState(false)
  const [error, setError] = useState("")
  const [direction, setDirection] = useState<DebtDirection>(
    debt?.direction ?? "i_owe"
  )
  const [schedule, setSchedule] = useState<DebtSchedule>(
    debt?.schedule ?? "monthly"
  )
  const [draftInstallments, setDraftInstallments] = useState<DraftInstallment[]>(
    [newDraftInstallment()]
  )
  const [isPending, startTransition] = useTransition()
  const editorHistoryId = `debt-editor-${debt?.id ?? "new"}`

  const customTotal = useMemo(() => {
    return draftInstallments.reduce((sum, item) => {
      const amount = Number(item.amount)
      return Number.isFinite(amount) ? sum + amount : sum
    }, 0)
  }, [draftInstallments])

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)
    if (nextOpen) {
      setDirection(debt?.direction ?? "i_owe")
      setSchedule(debt?.schedule ?? "monthly")
      const openInstallments = (debt?.installments ?? []).filter(
        (item) => item.status === "open"
      )
      setDraftInstallments(
        openInstallments.length > 0
          ? openInstallments.map((item) => ({
              key: item.id,
              dueOn: item.due_on,
              amount: String(item.amount),
            }))
          : [newDraftInstallment()]
      )
      setError("")
    }
  }

  useModalHistory({
    open,
    onClose: () => handleOpenChange(false),
    id: editorHistoryId,
  })

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {isEditing ? (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Edit debt"
          onClick={() => handleOpenChange(true)}
        >
          <Pencil className="size-4" />
        </Button>
      ) : (
        <Button type="button" size="sm" onClick={() => handleOpenChange(true)}>
          <Plus className="size-4" />
          Add debt
        </Button>
      )}
      <DialogContent className="max-h-[min(92dvh,720px)] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit debt" : "Add debt"}</DialogTitle>
        </DialogHeader>
        <form
          className="flex flex-col gap-4"
          action={(formData) => {
            startTransition(async () => {
              setError("")
              if (schedule === "custom") {
                formData.set(
                  "installments",
                  JSON.stringify(
                    draftInstallments.map((item) => ({
                      dueOn: item.dueOn,
                      amount: Number(item.amount),
                    }))
                  )
                )
              }

              const pushResult = await ensurePushSubscription()
              if (pushResult.error) {
                setError(pushResult.error)
                return
              }

              const result = isEditing
                ? await updateDebtAction(formData)
                : await createDebtAction(formData)
              if (result.error) {
                setError(result.error)
                return
              }
              handleOpenChange(false)
            })
          }}
        >
          {isEditing && debt ? (
            <input type="hidden" name="id" value={debt.id} />
          ) : null}
          <input type="hidden" name="direction" value={direction} />
          <input type="hidden" name="schedule" value={schedule} />

          <div className="grid gap-2">
            <Label>Direction</Label>
            <Select
              value={direction}
              onValueChange={(value) => {
                if (!value) return
                setDirection(value as DebtDirection)
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DEBT_DIRECTIONS.map((item) => (
                  <SelectItem key={item} value={item}>
                    {formatDirectionLabel(item)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor={`debt-person-${debt?.id ?? "new"}`}>
              Person / label
            </Label>
            <Input
              id={`debt-person-${debt?.id ?? "new"}`}
              name="counterparty"
              required
              maxLength={120}
              defaultValue={debt?.counterparty ?? ""}
              placeholder="Ana, credit card…"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor={`debt-title-${debt?.id ?? "new"}`}>Title</Label>
            <Input
              id={`debt-title-${debt?.id ?? "new"}`}
              name="title"
              required
              maxLength={160}
              defaultValue={debt?.title ?? ""}
              placeholder="Borrowed for rent, laptop loan…"
            />
          </div>

          <div className="grid gap-2">
            <Label>Schedule</Label>
            <Select
              value={schedule}
              onValueChange={(value) => {
                if (!value) return
                setSchedule(value as DebtSchedule)
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DEBT_SCHEDULES.map((item) => (
                  <SelectItem key={item} value={item}>
                    {formatScheduleLabel(item)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {schedule === "custom" ? (
            <div className="grid gap-3">
              <div className="flex items-center justify-between gap-2">
                <Label>Due dates</Label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setDraftInstallments((prev) => [
                      ...prev,
                      newDraftInstallment(),
                    ])
                  }
                >
                  <Plus className="size-4" />
                  Add date
                </Button>
              </div>
              {draftInstallments.map((item, index) => (
                <div
                  key={item.key}
                  className="grid grid-cols-[1fr_1fr_auto] items-end gap-2"
                >
                  <div className="grid gap-2">
                    <Label htmlFor={`debt-due-${item.key}`}>Date</Label>
                    <Input
                      id={`debt-due-${item.key}`}
                      type="date"
                      required
                      value={item.dueOn}
                      onChange={(event) => {
                        const value = event.target.value
                        setDraftInstallments((prev) =>
                          prev.map((row, rowIndex) =>
                            rowIndex === index
                              ? { ...row, dueOn: value }
                              : row
                          )
                        )
                      }}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor={`debt-amt-${item.key}`}>Amount</Label>
                    <Input
                      id={`debt-amt-${item.key}`}
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      min="0.01"
                      required
                      value={item.amount}
                      onChange={(event) => {
                        const value = event.target.value
                        setDraftInstallments((prev) =>
                          prev.map((row, rowIndex) =>
                            rowIndex === index
                              ? { ...row, amount: value }
                              : row
                          )
                        )
                      }}
                      placeholder="0.00"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Remove due date"
                    disabled={draftInstallments.length <= 1}
                    onClick={() =>
                      setDraftInstallments((prev) =>
                        prev.filter((_, rowIndex) => rowIndex !== index)
                      )
                    }
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
              <p className="text-xs text-muted-foreground">
                Total {formatMoney(customTotal)}
                {isEditing && debt
                  ? ` · paid so far ${formatMoney(
                      Math.round(
                        (debt.original_amount - debt.remaining_amount) * 100
                      ) / 100,
                      debt.currency
                    )}`
                  : ""}
              </p>
            </div>
          ) : (
            <>
              {!isEditing ? (
                <div className="grid gap-2">
                  <Label htmlFor="debt-original">Total amount</Label>
                  <Input
                    id="debt-original"
                    name="originalAmount"
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0.01"
                    required
                    placeholder="0.00"
                  />
                </div>
              ) : null}

              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label htmlFor={`debt-installment-${debt?.id ?? "new"}`}>
                    Installment
                  </Label>
                  <Input
                    id={`debt-installment-${debt?.id ?? "new"}`}
                    name="installmentAmount"
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0.01"
                    required={isEditing}
                    defaultValue={debt?.installment_amount ?? ""}
                    placeholder="Optional"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor={`debt-due-${debt?.id ?? "new"}`}>
                    {schedule === "once" ? "Due date" : "Next due"}
                  </Label>
                  <Input
                    id={`debt-due-${debt?.id ?? "new"}`}
                    name="nextDueOn"
                    type="date"
                    required={schedule === "once"}
                    defaultValue={debt?.next_due_on ?? formatCalendarDay()}
                  />
                </div>
              </div>
            </>
          )}

          <div className="grid gap-2">
            <Label htmlFor={`debt-notes-${debt?.id ?? "new"}`}>Notes</Label>
            <Textarea
              id={`debt-notes-${debt?.id ?? "new"}`}
              name="notes"
              maxLength={500}
              rows={3}
              defaultValue={debt?.notes ?? ""}
              placeholder="Optional details"
            />
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending
                ? isEditing
                  ? "Saving..."
                  : "Adding..."
                : isEditing
                  ? "Save"
                  : "Add"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

type DebtPaymentDialogProps = {
  debt: MoneyDebt
}

export const DebtPaymentDialog = ({ debt }: DebtPaymentDialogProps) => {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState("")
  const [isPending, startTransition] = useTransition()
  const defaultAmount = useMemo(() => {
    if (debt.schedule === "custom" && debt.installments) {
      const next = nextOpenInstallmentAmount(debt.installments)
      return Math.min(next || debt.remaining_amount, debt.remaining_amount)
    }
    return Math.min(debt.installment_amount, debt.remaining_amount)
  }, [debt])

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)
    if (nextOpen) setError("")
  }

  useModalHistory({
    open,
    onClose: () => handleOpenChange(false),
    id: `debt-payment-${debt.id}`,
  })

  if (debt.status === "paid") return null

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => handleOpenChange(true)}
      >
        <Wallet className="size-4" />
        Pay
      </Button>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Record payment</DialogTitle>
        </DialogHeader>
        <form
          className="flex flex-col gap-4"
          action={(formData) => {
            startTransition(async () => {
              setError("")
              const result = await recordDebtPaymentAction(formData)
              if (result.error) {
                setError(result.error)
                return
              }
              handleOpenChange(false)
            })
          }}
        >
          <input type="hidden" name="debtId" value={debt.id} />
          <input type="hidden" name="logTransaction" value="true" />

          <p className="text-sm text-muted-foreground">
            {debt.counterparty} · remaining{" "}
            {formatMoney(debt.remaining_amount, debt.currency)}
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor={`pay-amount-${debt.id}`}>Amount</Label>
              <Input
                id={`pay-amount-${debt.id}`}
                name="amount"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0.01"
                max={debt.remaining_amount}
                required
                defaultValue={defaultAmount}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor={`pay-date-${debt.id}`}>Paid on</Label>
              <Input
                id={`pay-date-${debt.id}`}
                name="paidOn"
                type="date"
                required
                defaultValue={formatCalendarDay()}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor={`pay-notes-${debt.id}`}>Notes</Label>
            <Textarea
              id={`pay-notes-${debt.id}`}
              name="notes"
              maxLength={500}
              rows={2}
              placeholder="Optional"
            />
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : "Record payment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

type DebtCardProps = {
  debt: MoneyDebt
}

export const DebtCard = ({ debt }: DebtCardProps) => {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState("")
  const iOwe = debt.direction === "i_owe"
  const overdue = debt.status === "open" && isOverdue(debt.next_due_on)
  const dueSoon =
    debt.status === "open" && !overdue && isDueSoon(debt.next_due_on)
  const upcomingInstallments = (debt.installments ?? [])
    .filter((item) => item.status === "open")
    .slice(0, 3)

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border/70 bg-muted/70 px-3 py-2.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <Badge
              variant="secondary"
              className={cn(
                iOwe
                  ? "bg-primary/10 text-primary"
                  : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
              )}
            >
              {formatDirectionLabel(debt.direction)}
            </Badge>
            <Badge variant="outline" className="font-normal">
              {formatScheduleLabel(debt.schedule)}
            </Badge>
            {debt.status === "paid" ? (
              <Badge variant="outline" className="font-normal">
                Paid
              </Badge>
            ) : null}
            {overdue ? (
              <Badge variant="destructive" className="font-normal">
                Overdue
              </Badge>
            ) : null}
            {dueSoon ? (
              <Badge variant="outline" className="font-normal text-primary">
                Due soon
              </Badge>
            ) : null}
          </div>
          <p className="truncate text-sm font-medium">{debt.title}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {debt.counterparty}
            {debt.next_due_on
              ? ` · next due ${formatOccurredOn(debt.next_due_on)}`
              : ""}
          </p>
          <p className="mt-1 text-sm font-semibold tabular-nums">
            {formatMoney(debt.remaining_amount, debt.currency)}
            <span className="ml-1 text-xs font-normal text-muted-foreground">
              of {formatMoney(debt.original_amount, debt.currency)}
            </span>
          </p>
          {debt.status === "open" && debt.schedule !== "custom" ? (
            <p className="mt-0.5 text-xs text-muted-foreground">
              Installment {formatMoney(debt.installment_amount, debt.currency)}
            </p>
          ) : null}
          {upcomingInstallments.length > 0 ? (
            <div className="mt-2 space-y-1">
              {upcomingInstallments.map((item) => (
                <p
                  key={item.id}
                  className="text-xs text-muted-foreground tabular-nums"
                >
                  {formatOccurredOn(item.due_on)} ·{" "}
                  {formatMoney(
                    Math.round((item.amount - item.paid_amount) * 100) / 100,
                    debt.currency
                  )}
                </p>
              ))}
            </div>
          ) : null}
          {debt.notes ? (
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
              {debt.notes}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <div className="flex items-center gap-1">
            {debt.status === "open" ? (
              <DebtEditorDialog debt={debt} variant="edit" />
            ) : null}
            <form
              action={(formData) => {
                startTransition(async () => {
                  setError("")
                  const result = await deleteDebtAction(formData)
                  if (result.error) setError(result.error)
                })
              }}
            >
              <input type="hidden" name="id" value={debt.id} />
              <Button
                type="submit"
                variant="ghost"
                size="icon-sm"
                aria-label="Delete debt"
                disabled={isPending}
              >
                <Trash2 className="size-4" />
              </Button>
            </form>
          </div>
          <DebtPaymentDialog debt={debt} />
        </div>
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  )
}

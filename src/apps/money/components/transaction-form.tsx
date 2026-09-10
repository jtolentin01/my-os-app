"use client"

import { useMemo, useState, useTransition } from "react"
import { Pencil, Plus, Trash2 } from "lucide-react"
import {
  createTransactionAction,
  deleteTransactionAction,
  updateTransactionAction,
} from "@/apps/money/services/actions"
import type { MoneyTransaction, TransactionType } from "@/apps/money/types"
import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
} from "@/apps/money/types"
import {
  formatCategoryLabel,
  formatMoney,
} from "@/apps/money/utils/money"
import {
  formatCalendarDay,
  formatOccurredOn,
} from "@/apps/money/utils/month"
import { useModalHistory } from "@/platform/hooks/use-modal-history"
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
import { cn } from "@/lib/utils"

type TransactionEditorDialogProps = {
  transaction?: MoneyTransaction
  variant?: "create" | "edit"
}

export const TransactionEditorDialog = ({
  transaction,
  variant = "create",
}: TransactionEditorDialogProps) => {
  const isEditing = variant === "edit" && Boolean(transaction)
  const [open, setOpen] = useState(false)
  const [error, setError] = useState("")
  const [type, setType] = useState<TransactionType>(
    transaction?.type ?? "expense"
  )
  const [category, setCategory] = useState(
    transaction?.category ?? EXPENSE_CATEGORIES[0]
  )
  const [isPending, startTransition] = useTransition()
  const editorHistoryId = `money-editor-${transaction?.id ?? "new"}`

  const categories = useMemo(
    () => (type === "expense" ? EXPENSE_CATEGORIES : INCOME_CATEGORIES),
    [type]
  )

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)
    if (nextOpen) {
      const nextType = transaction?.type ?? "expense"
      setType(nextType)
      setCategory(
        transaction?.category ??
          (nextType === "expense"
            ? EXPENSE_CATEGORIES[0]
            : INCOME_CATEGORIES[0])
      )
      setError("")
    }
  }

  useModalHistory({
    open,
    onClose: () => handleOpenChange(false),
    id: editorHistoryId,
  })

  const handleTypeChange = (nextType: TransactionType) => {
    setType(nextType)
    const nextCategories =
      nextType === "expense" ? EXPENSE_CATEGORIES : INCOME_CATEGORIES
    if (!(nextCategories as readonly string[]).includes(category)) {
      setCategory(nextCategories[0])
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {isEditing ? (
        <DialogTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Edit transaction"
            />
          }
        >
          <Pencil className="size-4" />
        </DialogTrigger>
      ) : (
        <DialogTrigger render={<Button type="button" size="sm" />}>
          <Plus className="size-4" />
          Add
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit transaction" : "Add transaction"}
          </DialogTitle>
        </DialogHeader>
        <form
          className="flex flex-col gap-4"
          action={(formData) => {
            startTransition(async () => {
              setError("")
              const result = isEditing
                ? await updateTransactionAction(formData)
                : await createTransactionAction(formData)
              if (result.error) {
                setError(result.error)
                return
              }
              handleOpenChange(false)
            })
          }}
        >
          {isEditing && transaction ? (
            <input type="hidden" name="id" value={transaction.id} />
          ) : null}
          <input type="hidden" name="type" value={type} />
          <input type="hidden" name="category" value={category} />

          <div className="grid gap-2">
            <Label>Type</Label>
            <Select
              value={type}
              onValueChange={(value) => {
                if (!value) return
                handleTypeChange(value as TransactionType)
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="expense">Expense</SelectItem>
                <SelectItem value="income">Income</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor={`money-title-${transaction?.id ?? "new"}`}>
              Title
            </Label>
            <Input
              id={`money-title-${transaction?.id ?? "new"}`}
              name="title"
              required
              maxLength={160}
              defaultValue={transaction?.title ?? ""}
              placeholder="Coffee, salary, rent..."
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor={`money-amount-${transaction?.id ?? "new"}`}>
                Amount
              </Label>
              <Input
                id={`money-amount-${transaction?.id ?? "new"}`}
                name="amount"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0.01"
                required
                defaultValue={transaction?.amount ?? ""}
                placeholder="0.00"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor={`money-date-${transaction?.id ?? "new"}`}>
                Date
              </Label>
              <Input
                id={`money-date-${transaction?.id ?? "new"}`}
                name="occurredOn"
                type="date"
                required
                defaultValue={
                  transaction?.occurred_on ?? formatCalendarDay()
                }
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Category</Label>
            <Select
              value={category}
              onValueChange={(value) => {
                if (!value) return
                setCategory(value)
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categories.map((item) => (
                  <SelectItem key={item} value={item}>
                    {formatCategoryLabel(item)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor={`money-notes-${transaction?.id ?? "new"}`}>
              Notes
            </Label>
            <Textarea
              id={`money-notes-${transaction?.id ?? "new"}`}
              name="notes"
              maxLength={500}
              rows={3}
              defaultValue={transaction?.notes ?? ""}
              placeholder="Optional details"
            />
          </div>

          {error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : null}

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

type TransactionCardProps = {
  transaction: MoneyTransaction
}

export const TransactionCard = ({ transaction }: TransactionCardProps) => {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState("")
  const isIncome = transaction.type === "income"

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border/70 bg-muted/70 px-3 py-2.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <Badge
              variant="secondary"
              className={cn(
                "capitalize",
                isIncome
                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                  : "bg-primary/10 text-primary"
              )}
            >
              {transaction.type}
            </Badge>
            <Badge variant="outline" className="font-normal">
              {formatCategoryLabel(transaction.category)}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {formatOccurredOn(transaction.occurred_on)}
            </span>
          </div>
          <p className="truncate text-sm font-medium">{transaction.title}</p>
          <p
            className={cn(
              "mt-0.5 text-sm font-semibold tabular-nums",
              isIncome
                ? "text-emerald-700 dark:text-emerald-400"
                : "text-foreground"
            )}
          >
            {isIncome ? "+" : "-"}
            {formatMoney(transaction.amount, transaction.currency)}
          </p>
          {transaction.notes ? (
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
              {transaction.notes}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <TransactionEditorDialog transaction={transaction} variant="edit" />
          <form
            action={(formData) => {
              startTransition(async () => {
                setError("")
                const result = await deleteTransactionAction(formData)
                if (result.error) {
                  setError(result.error)
                }
              })
            }}
          >
            <input type="hidden" name="id" value={transaction.id} />
            <Button
              type="submit"
              variant="ghost"
              size="icon-sm"
              aria-label="Delete transaction"
              disabled={isPending}
            >
              <Trash2 className="size-4" />
            </Button>
          </form>
        </div>
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  )
}

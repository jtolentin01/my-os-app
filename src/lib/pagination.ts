export const PAGE_SIZE = 15

export type PageResult<T> = {
  items: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export const parsePageParam = (value?: string | null) => {
  const parsed = Number.parseInt(String(value ?? "1"), 10)
  if (!Number.isFinite(parsed) || parsed < 1) {
    return 1
  }
  return parsed
}

export const getPageRange = (page: number, pageSize: number = PAGE_SIZE) => {
  const safePage = Math.max(1, page)
  const from = (safePage - 1) * pageSize
  return { from, to: from + pageSize - 1, page: safePage }
}

export const buildPageResult = <T,>(
  items: T[],
  total: number,
  page: number,
  pageSize: number = PAGE_SIZE
): PageResult<T> => {
  const safeTotal = Math.max(0, total)
  const totalPages = Math.max(1, Math.ceil(safeTotal / pageSize) || 1)
  const safePage = Math.min(Math.max(1, page), totalPages)
  return {
    items,
    total: safeTotal,
    page: safePage,
    pageSize,
    totalPages,
  }
}

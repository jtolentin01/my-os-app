const ShellLoading = () => {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
      <div className="flex items-start gap-4">
        <div className="h-16 w-16 shrink-0 animate-pulse rounded-full bg-muted sm:h-20 sm:w-20" />
        <div className="flex flex-1 flex-col gap-3 pt-1">
          <div className="h-8 w-48 max-w-full animate-pulse rounded-md bg-muted" />
          <div className="h-4 w-full max-w-md animate-pulse rounded-md bg-muted" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="h-36 animate-pulse rounded-xl bg-muted" />
        <div className="h-36 animate-pulse rounded-xl bg-muted" />
        <div className="h-36 animate-pulse rounded-xl bg-muted sm:col-span-2" />
      </div>
    </div>
  )
}

export default ShellLoading

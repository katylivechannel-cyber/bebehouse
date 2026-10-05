'use client'

import { useRouter } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'

type PageHeaderProps = {
  title: string
  subtitle?: string
  backHref?: string
}

export function PageHeader({
  title,
  subtitle,
  backHref,
}: PageHeaderProps) {
  const router = useRouter()

  function handleBack() {
    if (window.history.length > 1) {
      router.back()
      return
    }

    router.push(backHref || '/')
  }

  return (
    <header className="flex flex-col gap-3 pt-4">
      {backHref && (
        <button
          type="button"
          onClick={handleBack}
          className="tg-hide -ml-2 flex w-fit items-center gap-0.5 rounded-full py-1 pl-1 pr-3 text-sm text-muted-foreground active:bg-muted"
        >
          <ChevronLeft
            className="size-5"
            strokeWidth={1.75}
            aria-hidden="true"
          />
          Назад
        </button>
      )}

      <div className="flex flex-col gap-1">
        <h1 className="text-balance font-serif text-[34px] font-semibold leading-[1.05]">
          {title}
        </h1>

        {subtitle && (
          <p className="text-sm text-muted-foreground">
            {subtitle}
          </p>
        )}
      </div>
    </header>
  )
}

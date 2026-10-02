'use client'

import { useRouter } from 'next/navigation'
import { Search, X } from 'lucide-react'
import { useState } from 'react'

type SearchBarProps = {
  value?: string
  onChange?: (value: string) => void
}

export function SearchBar({ value, onChange }: SearchBarProps) {
  const router = useRouter()
  const [localValue, setLocalValue] = useState('')
  const isControlled = value !== undefined
  const current = isControlled ? value : localValue

  const update = (next: string) => {
    if (isControlled) onChange?.(next)
    else setLocalValue(next)
  }

  return (
    <form
      role="search"
      onSubmit={(event) => {
        event.preventDefault()
        if (isControlled) {
          ;(document.activeElement as HTMLElement | null)?.blur()
          return
        }
        const query = current.trim()
        router.push(query ? `/catalog?q=${encodeURIComponent(query)}` : '/catalog')
      }}
      className="relative"
    >
      <label htmlFor="search" className="sr-only">
        Поиск
      </label>
      <Search
        className="pointer-events-none absolute left-5 top-1/2 size-5 -translate-y-1/2 text-muted-foreground"
        strokeWidth={1.75}
        aria-hidden="true"
      />
      <input
        id="search"
        type="search"
        inputMode="search"
        enterKeyHint="search"
        autoComplete="off"
        placeholder="Поиск"
        value={current}
        onChange={(event) => update(event.target.value)}
        className="h-14 w-full appearance-none rounded-full border border-border bg-card pl-13 pr-12 text-base text-foreground shadow-[0_1px_0_rgba(62,44,34,0.03)] outline-none transition placeholder:text-muted-foreground focus:border-ring focus:ring-4 focus:ring-accent/60 [&::-webkit-search-cancel-button]:hidden"
      />
      {current && (
        <button
          type="button"
          onClick={() => update('')}
          aria-label="Очистить поиск"
          className="absolute right-3 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full bg-muted text-muted-foreground"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      )}
    </form>
  )
}

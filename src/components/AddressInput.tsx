import { useEffect, useRef, useState } from 'react'
import { Loader2, MapPin } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { suggest, type Place } from '@/lib/geo'

interface AddressInputProps {
  id: string
  label: string
  value: string
  onChange: (text: string) => void
  onSelect: (place: Place) => void
  placeholder?: string
}

/** Text field with Dutch address suggestions while typing. */
export function AddressInput({ id, label, value, onChange, onSelect, placeholder }: AddressInputProps) {
  const [options, setOptions] = useState<Place[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [active, setActive] = useState(-1)
  // text of the last picked suggestion; don't search again for exactly that text
  const picked = useRef('')

  useEffect(() => {
    const q = value.trim()
    if (q.length < 3 || value === picked.current) {
      setOptions([])
      return
    }
    const ctrl = new AbortController()
    // wait until typing pauses before asking the server
    const timer = setTimeout(() => {
      setLoading(true)
      suggest(q, ctrl.signal)
        .then((r) => {
          setOptions(r)
          setActive(-1)
          setOpen(true)
        })
        .catch(() => {})
        .finally(() => setLoading(false))
    }, 250)
    return () => {
      clearTimeout(timer)
      ctrl.abort()
    }
  }, [value])

  function choose(place: Place) {
    picked.current = place.label
    onChange(place.label)
    onSelect(place)
    setOpen(false)
    setOptions([])
  }

  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          type="text"
          autoComplete="off"
          role="combobox"
          aria-expanded={open && options.length > 0}
          aria-controls={`${id}-list`}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => options.length && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={(e) => {
            if (!open || !options.length) return
            if (e.key === 'ArrowDown') setActive((a) => Math.min(a + 1, options.length - 1))
            else if (e.key === 'ArrowUp') setActive((a) => Math.max(a - 1, 0))
            else if (e.key === 'Enter' && active >= 0) choose(options[active])
            else if (e.key === 'Escape') setOpen(false)
            else return
            e.preventDefault()
          }}
          className="pr-9"
        />
        {loading && (
          <Loader2 className="absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
        {open && options.length > 0 && (
          <ul
            id={`${id}-list`}
            role="listbox"
            className="absolute inset-x-0 top-full z-20 mt-1 overflow-hidden rounded-lg border bg-popover text-popover-foreground shadow-md"
          >
            {options.map((o, i) => (
              <li
                key={`${o.label}-${i}`}
                role="option"
                aria-selected={i === active}
                onMouseDown={(e) => {
                  e.preventDefault()
                  choose(o)
                }}
                className={`flex cursor-pointer items-start gap-2 px-3 py-2.5 text-sm ${i === active ? 'bg-muted' : 'hover:bg-muted'}`}
              >
                <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                {o.label}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

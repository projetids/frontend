"use client"

import * as React from "react"
import { cn } from "cn"
import { Popover as PopoverPrimitive } from "radix-ui"
import { CheckIcon, ChevronDownIcon, SearchIcon } from "lucide-react"

// Select recherchable, bâti sur Popover. Il reprend l'API shadcn
// (`Select`, `SelectTrigger`, `SelectValue`, `SelectContent`, `SelectItem`) pour
// rester transparent dans les formulaires existants, mais ajoute un champ de
// recherche qui filtre les options à la frappe. Les options sont navigables au
// clavier (flèches, Home/End, Entrée) et les accents sont ignorés.

type SelectProps = {
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  disabled?: boolean
  children?: React.ReactNode
}

type SelectTriggerProps = React.ComponentProps<"button"> & {
  size?: "sm" | "default"
}

type SelectContentProps = React.ComponentProps<
  typeof PopoverPrimitive.Content
> & {
  /** Masque le champ de recherche (activé par défaut). */
  searchable?: boolean
  searchPlaceholder?: string
}

type SelectItemProps = React.ComponentProps<"button"> & {
  value: string
}

type SelectContextValue = {
  value: string
  open: boolean
  setOpen: (open: boolean) => void
  disabled: boolean
  query: string
  setQuery: (query: string) => void
  options: Map<string, string>
  visibleValues: string[]
  activeValue?: string
  setActiveValue: (value: string) => void
  moveActive: (delta: number) => void
  moveActiveTo: (index: number) => void
  selectValue: (value: string) => void
  listboxId: string
  optionId: (value: string) => string
}

const SelectContext = React.createContext<SelectContextValue | null>(null)

function useSelectContext() {
  const context = React.useContext(SelectContext)
  if (!context) {
    throw new Error(
      "Les composants Select doivent être utilisés dans <Select>."
    )
  }
  return context
}

/** Texte brut d'un noeud React (sert à l'affichage et à la recherche). */
function nodeToText(node: React.ReactNode): string {
  if (node === null || node === undefined || typeof node === "boolean") {
    return ""
  }
  if (typeof node === "string" || typeof node === "number") {
    return String(node)
  }
  if (Array.isArray(node)) {
    return node.map(nodeToText).join("")
  }
  if (React.isValidElement(node)) {
    const props = node.props as { children?: React.ReactNode }
    return nodeToText(props.children)
  }
  return ""
}

/** Normalise une chaîne pour une recherche insensible à la casse et aux accents. */
function normalizeSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
}

function matchesSearch(label: string, query: string): boolean {
  return normalizeSearch(label).includes(query)
}

/**
 * Parcourt l'arbre JSX pour associer chaque `SelectItem` à son libellé. Cela
 * permet d'afficher la valeur sélectionnée et de filtrer même quand le contenu
 * (le popover) n'est pas encore monté.
 */
function collectOptions(
  node: React.ReactNode,
  options: Map<string, string>
): void {
  React.Children.forEach(node, (child) => {
    if (!React.isValidElement(child)) return

    if (child.type === SelectItem) {
      const props = child.props as SelectItemProps
      if (props.value !== undefined) {
        options.set(props.value, nodeToText(props.children))
      }
      return
    }

    const props = child.props as { children?: React.ReactNode }
    if (props && "children" in props) {
      collectOptions(props.children, options)
    }
  })
}

function Select({
  value,
  defaultValue,
  onValueChange,
  disabled = false,
  children,
}: SelectProps) {
  const generatedId = React.useId()
  const listboxId = `${generatedId}-listbox`
  const optionId = React.useCallback(
    (optionValue: string) => `${generatedId}-option-${optionValue}`,
    [generatedId]
  )

  const [uncontrolledValue, setUncontrolledValue] = React.useState(
    defaultValue ?? ""
  )
  const currentValue = value !== undefined ? value : uncontrolledValue

  const [open, setOpen] = React.useState(false)
  const [query, setQueryState] = React.useState("")
  const [activeIndex, setActiveIndex] = React.useState(0)

  const options = new Map<string, string>()
  collectOptions(children, options)

  const normalizedQuery = normalizeSearch(query)
  const visibleValues = Array.from(options.keys()).filter((optionValue) =>
    normalizedQuery
      ? matchesSearch(options.get(optionValue) ?? "", normalizedQuery)
      : true
  )

  const safeIndex =
    visibleValues.length === 0
      ? -1
      : Math.min(activeIndex, visibleValues.length - 1)
  const activeValue = safeIndex >= 0 ? visibleValues[safeIndex] : undefined

  const selectValue = React.useCallback(
    (nextValue: string) => {
      if (value === undefined) setUncontrolledValue(nextValue)
      onValueChange?.(nextValue)
      setOpen(false)
      setQueryState("")
      setActiveIndex(0)
    },
    [onValueChange, value]
  )

  // Recalculé à chaque rendu pour toujours lire les options à jour au moment
  // de l'ouverture (elles peuvent arriver après le premier rendu).
  function setOpenState(nextOpen: boolean) {
    setOpen(nextOpen)
    if (nextOpen) {
      const index = visibleValues.indexOf(currentValue)
      setActiveIndex(index >= 0 ? index : 0)
    } else {
      setQueryState("")
      setActiveIndex(0)
    }
  }

  const setQuery = React.useCallback((nextQuery: string) => {
    setQueryState(nextQuery)
    setActiveIndex(0)
  }, [])

  const setActiveValue = React.useCallback(
    (nextValue: string) => {
      const index = visibleValues.indexOf(nextValue)
      if (index >= 0) setActiveIndex(index)
    },
    [visibleValues]
  )

  const moveActive = React.useCallback(
    (delta: number) => {
      if (visibleValues.length === 0) return
      setActiveIndex((previous) => {
        const current = Math.min(previous, visibleValues.length - 1)
        return (current + delta + visibleValues.length) % visibleValues.length
      })
    },
    [visibleValues.length]
  )

  const moveActiveTo = React.useCallback(
    (index: number) => {
      if (visibleValues.length === 0) return
      setActiveIndex(Math.max(0, Math.min(index, visibleValues.length - 1)))
    },
    [visibleValues.length]
  )

  const contextValue: SelectContextValue = {
    value: currentValue,
    open,
    setOpen: setOpenState,
    disabled,
    query,
    setQuery,
    options,
    visibleValues,
    activeValue,
    setActiveValue,
    moveActive,
    moveActiveTo,
    selectValue,
    listboxId,
    optionId,
  }

  return (
    <SelectContext.Provider value={contextValue}>
      <PopoverPrimitive.Root open={open} onOpenChange={setOpenState}>
        {children}
      </PopoverPrimitive.Root>
    </SelectContext.Provider>
  )
}

function SelectValue({
  className,
  placeholder,
  children,
  ...props
}: React.ComponentProps<"span"> & { placeholder?: string }) {
  const { value, options } = useSelectContext()
  const label = value ? options.get(value) : undefined

  return (
    <span
      data-slot="select-value"
      className={cn(
        "min-w-0 flex-1 truncate",
        !label && !children && "text-muted-foreground",
        className
      )}
      {...props}
    >
      {children ?? label ?? placeholder}
    </span>
  )
}

function SelectTrigger({
  className,
  size = "default",
  children,
  disabled,
  ...props
}: SelectTriggerProps) {
  const { open, disabled: selectDisabled, listboxId } = useSelectContext()

  return (
    <PopoverPrimitive.Trigger asChild disabled={disabled || selectDisabled}>
      <button
        type="button"
        data-slot="select-trigger"
        data-size={size}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        disabled={disabled || selectDisabled}
        className={cn(
          "flex w-fit items-center justify-between gap-1.5 rounded-lg border border-input bg-transparent py-2 pr-2 pl-2.5 text-sm whitespace-nowrap transition-colors outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 data-[size=default]:h-8 data-[size=sm]:h-7 data-[size=sm]:rounded-[min(var(--radius-md),10px)] dark:bg-input/30 dark:hover:bg-input/50 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
          className
        )}
        {...props}
      >
        {children}
        <ChevronDownIcon className="pointer-events-none size-4 shrink-0 text-muted-foreground" />
      </button>
    </PopoverPrimitive.Trigger>
  )
}

function SelectContent({
  className,
  children,
  searchable = true,
  searchPlaceholder = "Rechercher…",
  align = "start",
  sideOffset = 4,
  ...props
}: SelectContentProps) {
  const context = useSelectContext()
  const searchRef = React.useRef<HTMLInputElement>(null)
  const { activeValue, optionId } = context

  // Garde l'option active visible dans la liste pendant la navigation.
  React.useEffect(() => {
    if (!activeValue) return
    const element = document.getElementById(optionId(activeValue))
    element?.scrollIntoView({ block: "nearest" })
  }, [activeValue, optionId])

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault()
        context.moveActive(1)
        break
      case "ArrowUp":
        event.preventDefault()
        context.moveActive(-1)
        break
      case "Home":
        event.preventDefault()
        context.moveActiveTo(0)
        break
      case "End":
        event.preventDefault()
        context.moveActiveTo(context.visibleValues.length - 1)
        break
      case "Enter":
        event.preventDefault()
        if (context.activeValue) context.selectValue(context.activeValue)
        break
      case "Escape":
        event.preventDefault()
        context.setOpen(false)
        break
      case "Tab":
        context.setOpen(false)
        break
    }
  }

  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        data-slot="select-content"
        align={align}
        sideOffset={sideOffset}
        className={cn(
          "z-50 min-w-(--radix-popover-trigger-width) overflow-hidden rounded-lg bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10 outline-none data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
          className
        )}
        onOpenAutoFocus={(event) => {
          if (!searchable) return
          event.preventDefault()
          searchRef.current?.focus()
        }}
        {...props}
      >
        {searchable ? (
          <div className="flex items-center gap-2 border-b px-2.5 py-1.5">
            <SearchIcon className="size-3.5 shrink-0 text-muted-foreground" />
            <input
              ref={searchRef}
              type="text"
              value={context.query}
              onChange={(event) => context.setQuery(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={searchPlaceholder}
              className="h-7 w-full min-w-0 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              autoComplete="off"
              spellCheck={false}
              aria-label="Rechercher dans les options"
              aria-controls={context.listboxId}
              aria-activedescendant={
                context.activeValue
                  ? context.optionId(context.activeValue)
                  : undefined
              }
              aria-autocomplete="list"
            />
          </div>
        ) : null}
        <div
          data-slot="select-listbox"
          id={context.listboxId}
          role="listbox"
          className="max-h-64 overflow-y-auto p-1"
        >
          {context.visibleValues.length === 0 ? (
            <p className="px-2 py-3 text-center text-sm text-muted-foreground">
              {context.query.trim()
                ? "Aucun résultat."
                : "Aucune option disponible."}
            </p>
          ) : (
            children
          )}
        </div>
      </PopoverPrimitive.Content>
    </PopoverPrimitive.Portal>
  )
}

function SelectItem({
  className,
  children,
  value,
  disabled,
  ...props
}: SelectItemProps) {
  const context = useSelectContext()
  const label = nodeToText(children)
  const normalizedQuery = normalizeSearch(context.query)

  // Le filtrage est fait par l'item lui-même : le contenu reste déclaratif et
  // les groupes éventuels fonctionnent sans traitement particulier.
  if (normalizedQuery && !matchesSearch(label, normalizedQuery)) return null

  const selected = context.value === value
  const active = context.activeValue === value

  return (
    <button
      {...props}
      type="button"
      id={context.optionId(value)}
      data-slot="select-item"
      role="option"
      aria-selected={selected}
      data-active={active || undefined}
      disabled={disabled}
      tabIndex={-1}
      className={cn(
        "relative flex w-full cursor-pointer items-center gap-1.5 rounded-md py-1 pr-8 pl-1.5 text-left text-sm outline-hidden select-none hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50 data-[active=true]:bg-accent data-[active=true]:text-accent-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      onClick={() => context.selectValue(value)}
      onMouseEnter={() => context.setActiveValue(value)}
    >
      <span className="pointer-events-none absolute right-2 flex size-4 items-center justify-center">
        {selected ? <CheckIcon className="pointer-events-none size-4" /> : null}
      </span>
      <span className="flex min-w-0 items-center gap-1.5">{children}</span>
    </button>
  )
}

function SelectGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="select-group"
      className={cn("scroll-my-1 p-1", className)}
      {...props}
    />
  )
}

function SelectLabel({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="select-label"
      className={cn("px-1.5 py-1 text-xs text-muted-foreground", className)}
      {...props}
    />
  )
}

function SelectSeparator({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="select-separator"
      className={cn("pointer-events-none -mx-1 my-1 h-px bg-border", className)}
      {...props}
    />
  )
}

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
}

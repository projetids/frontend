import { cn } from "cn"
import { AtomIcon, AtomInput, type AtomInputProps } from "@/components/atoms"

export type MSearchBarProps = AtomInputProps

export function MSearchBar({ className, ...props }: MSearchBarProps) {
  return (
    <div className="relative">
      <AtomIcon
        name="search"
        className="pointer-events-none absolute inset-y-0 left-2.5 my-auto size-4 text-muted-foreground"
      />
      <AtomInput
        type="search"
        className={cn("pl-8", className)}
        {...props}
      />
    </div>
  )
}

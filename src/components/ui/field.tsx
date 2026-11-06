import * as React from "react"
import { cn } from "cn"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"

export function FieldGroup({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("flex flex-col gap-4", className)} {...props} />
}

export function Field({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("flex flex-col gap-2", className)} {...props} />
}

export function FieldLabel({ className, ...props }: React.ComponentProps<typeof Label>) {
  return <Label className={cn(className)} {...props} />
}

export function FieldDescription({ className, ...props }: React.ComponentProps<"p">) {
  return <p className={cn("text-sm text-muted-foreground", className)} {...props} />
}

export function FieldSeparator({
  children,
  className,
  ...props
}: React.ComponentProps<"div"> & { children?: React.ReactNode }) {
  return (
    <div className={cn("relative flex items-center", className)} {...props}>
      <Separator className="flex-1" />
      {children ? (
        <span className="bg-card px-2 text-xs text-muted-foreground">{children}</span>
      ) : null}
      <Separator className="flex-1" />
    </div>
  )
}
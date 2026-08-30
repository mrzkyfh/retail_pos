"use client"

import * as CollapsiblePrimitive from "@radix-ui/react-collapsible"
import { cn } from "@/lib/utils"
import * as React from "react"

const Collapsible = CollapsiblePrimitive.Root

interface CollapsibleTriggerProps
  extends React.ComponentPropsWithoutRef<typeof CollapsiblePrimitive.CollapsibleTrigger> {
  nativeButton?: boolean
  render?: React.ReactElement
}

const CollapsibleTrigger = React.forwardRef<
  React.ElementRef<typeof CollapsiblePrimitive.CollapsibleTrigger>,
  CollapsibleTriggerProps
>(({ className, nativeButton = true, render, children, ...props }, ref) => {
  if (render && !nativeButton) {
    return React.cloneElement(render, {
      ...props,
      ref,
      className: cn(render.props.className, className),
      children,
    // The polymorphic render element can accept the trigger props at runtime.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)
  }

  return (
    <CollapsiblePrimitive.CollapsibleTrigger
      ref={ref}
      className={cn(
        "cursor-pointer transition-all duration-200 ease-in-out",
        className
      )}
      {...props}
    >
      {children}
    </CollapsiblePrimitive.CollapsibleTrigger>
  )
})
CollapsibleTrigger.displayName = "CollapsibleTrigger"

const CollapsibleContent = React.forwardRef<
  React.ElementRef<typeof CollapsiblePrimitive.CollapsibleContent>,
  React.ComponentPropsWithoutRef<typeof CollapsiblePrimitive.CollapsibleContent>
>(({ className, ...props }, ref) => (
  <CollapsiblePrimitive.CollapsibleContent
    ref={ref}
    className={cn(
      "overflow-hidden transition-all duration-300 ease-in-out",
      "data-[state=closed]:animate-collapsible-up",
      "data-[state=open]:animate-collapsible-down",
      className
    )}
    {...props}
  />
))
CollapsibleContent.displayName = "CollapsibleContent"

export { Collapsible, CollapsibleTrigger, CollapsibleContent }

import * as React from "react"
import { cn } from "@/lib/utils"

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-lg border",
      "bg-card text-card-foreground",
      "border-border shadow-sm",
      "transition-all duration-200",
      className,
    )}
    {...props}
  />
))
Card.displayName = "Card"

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div 
    ref={ref} 
    className={cn(
      "p-1.5 pt-0",
      className
    )} 
    {...props} 
  />
))
CardContent.displayName = "CardContent"

export { Card, CardContent }

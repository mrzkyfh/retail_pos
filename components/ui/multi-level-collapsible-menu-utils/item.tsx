import * as React from "react"
import { cn } from "@/lib/utils"

interface ItemProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "md" | "xs"
}

const Item = React.forwardRef<HTMLDivElement, ItemProps>(
  ({ className, size = "md", ...props }, ref) => {
    const sizeClasses = {
      xs: "h-7 px-2 gap-1.5",
      sm: "h-8 px-2.5 gap-2",
      md: "h-10 px-3 gap-2",
    }

    return (
      <div
        ref={ref}
        className={cn(
          "flex items-center rounded-md",
          "transition-all duration-150 ease-in-out",
          sizeClasses[size],
          className
        )}
        {...props}
      />
    )
  }
)
Item.displayName = "Item"

const ItemMedia = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { variant?: "icon" | "image" }
>(({ className, variant = "icon", ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex items-center justify-center flex-shrink-0",
      "transition-colors duration-150",
      variant === "icon" && "w-5 h-5",
      variant === "image" && "w-8 h-8 rounded-md",
      className
    )}
    {...props}
  />
))
ItemMedia.displayName = "ItemMedia"

const ItemTitle = React.forwardRef<
  HTMLSpanElement,
  React.HTMLAttributes<HTMLSpanElement>
>(({ className, ...props }, ref) => (
  <span
    ref={ref}
    className={cn(
      "flex-1 truncate text-sm",
      "transition-colors duration-150",
      className
    )}
    {...props}
  />
))
ItemTitle.displayName = "ItemTitle"

export { Item, ItemMedia, ItemTitle }

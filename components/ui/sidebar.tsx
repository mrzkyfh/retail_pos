import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const SIDEBAR_COOKIE_NAME = "sidebar:state"
const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7
const SIDEBAR_KEYBOARD_SHORTCUT = "b"

type SidebarContext = {
  state: "expanded" | "collapsed"
  open: boolean
  setOpen: (open: boolean) => void
  openMobile: boolean
  setOpenMobile: (open: boolean) => void
  isMobile: boolean
  toggleSidebar: () => void
}

const SidebarContext = React.createContext<SidebarContext | undefined>(
  undefined
)

function useSidebar() {
  const context = React.useContext(SidebarContext)
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider.")
  }

  return context
}

const SidebarProvider = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    defaultOpen?: boolean
    open?: boolean
    onOpenChange?: (open: boolean) => void
  }
>(
  (
    {
      defaultOpen = true,
      open: openProp,
      onOpenChange: setOpenProp,
      className,
      style,
      children,
      ...props
    },
    ref
  ) => {
    const [openMobile, setOpenMobile] = React.useState(false)
    const [state, setState] = React.useState<"expanded" | "collapsed">(
      "expanded"
    )
    const [open, setOpen] = React.useState(defaultOpen)

    // Listen to media query
    React.useEffect(() => {
      const mq = window.matchMedia("(max-width: 1024px)")
      const handleChange = () => {
        if (!mq.matches) {
          setOpenMobile(false)
        }
      }
      mq.addListener(handleChange)
      return () => mq.removeListener(handleChange)
    }, [])

    // Uncontrolled
    const isOpen =
      openProp !== undefined
        ? openProp
        : state === "expanded"
          ? open
          : false

    const setIsOpen = React.useCallback(
      (value: boolean | ((value: boolean) => boolean)) => {
        const openState = typeof value === "function" ? value(isOpen) : value

        if (setOpenProp) {
          setOpenProp(openState)
        } else {
          setOpen(openState)
          setState(openState ? "expanded" : "collapsed")
        }

        document.cookie = `${SIDEBAR_COOKIE_NAME}=${openState}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}`
      },
      [setOpenProp, isOpen]
    )

    const toggleSidebar = React.useCallback(() => {
      return setIsOpen((open) => !open)
    }, [setIsOpen])

    // Keyboard shortcut
    React.useEffect(() => {
      const handleKeyDown = (event: KeyboardEvent) => {
        if (
          event.key === SIDEBAR_KEYBOARD_SHORTCUT &&
          (event.metaKey || event.ctrlKey)
        ) {
          event.preventDefault()
          toggleSidebar()
        }
      }

      window.addEventListener("keydown", handleKeyDown)
      return () => window.removeEventListener("keydown", handleKeyDown)
    }, [toggleSidebar])

    return (
      <SidebarContext.Provider
        value={{
          state: state,
          open: isOpen,
          setOpen: setIsOpen,
          openMobile,
          setOpenMobile,
          isMobile: false,
          toggleSidebar,
        }}
      >
        <div
          style={{
            "--sidebar-width": "16rem",
            ...style,
          } as React.CSSProperties}
          className={cn(
            "flex h-full w-full flex-col bg-background",
            className
          )}
          ref={ref}
          {...props}
        >
          {children}
        </div>
      </SidebarContext.Provider>
    )
  }
)
SidebarProvider.displayName = "SidebarProvider"

const Sidebar = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    side?: "left" | "right"
    variant?: "sidebar" | "floating" | "inset"
    collapsible?: "offcanvas" | "icon" | "none"
  }
>(
  (
    {
      side = "left",
      variant = "sidebar",
      collapsible = "offcanvas",
      className,
      ...props
    },
    ref
  ) => {
    const { open, openMobile, setOpenMobile, isMobile, state } = useSidebar()

    // Adjust this if you want the sidebar on the right instead
    if (isMobile) {
      if (variant === "floating" || variant === "inset") {
        return null
      }

      return (
        <div
          className={cn(
            "fixed inset-0 z-40 bg-background/80 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            openMobile && "inset-0"
          )}
          onClick={() => setOpenMobile(false)}
        />
      )
    }

    if (variant === "floating" || variant === "inset") {
      return null
    }

    const isCollapsed = state === "collapsed"

    return (
      <div
        ref={ref}
        data-side={side}
        data-state={open ? "open" : "closed"}
        data-collapsible={collapsible}
        className={cn(
          "relative hidden h-svh w-[--sidebar-width] flex-col border-r bg-background transition-[width,margin] duration-300 ease-in-out data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon))] lg:flex",
          isCollapsed && collapsible === "icon" && "w-16",
          className
        )}
        {...props}
      />
    )
  }
)
Sidebar.displayName = "Sidebar"

const SidebarTrigger = React.forwardRef<
  React.ElementRef<"button">,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, onClick, ...props }, ref) => {
  const { toggleSidebar } = useSidebar()

  return (
    <button
      ref={ref}
      onClick={(event) => {
        onClick?.(event)
        toggleSidebar()
      }}
      className={cn("h-8 w-8", className)}
      {...props}
    />
  )
})
SidebarTrigger.displayName = "SidebarTrigger"

const SidebarRail = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, ...props }, ref) => (
  <button
    ref={ref}
    data-sidebar="rail"
    className={cn(
      "absolute inset-y-0 z-20 hidden w-4 -translate-x-1/2 select-none transition-all ease-in-out hover:w-8 hover:pl-0 sm:flex lg:translate-x-0",
      "left-full data-[side=left]:-right-4",
      className
    )}
    {...props}
  />
))
SidebarRail.displayName = "SidebarRail"

const SidebarInset = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("relative flex h-full w-full flex-col", className)}
    {...props}
  />
))
SidebarInset.displayName = "SidebarInset"

const sidebarMenuButtonVariants = cva(
  "peer/menu-button flex w-full items-center gap-2 overflow-hidden rounded-md px-2 py-1.5 text-sm font-medium text-foreground outline-none ring-sidebar-ring transition-[width,height,padding] hover:bg-sidebar-accent focus-visible:ring-2 active:bg-sidebar-accent disabled:pointer-events-none disabled:opacity-50 group-data-[collapsible=icon]/sidebar:justify-center group-data-[collapsible=icon]/sidebar:!p-2 [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        outline:
          "border border-sidebar-border bg-background hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
      },
      size: {
        default: "h-8 px-2",
        sm: "h-7 rounded-md px-2 text-xs",
        lg: "h-12 rounded-md px-2 text-sm group-data-[collapsible=icon]/sidebar:!p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

const SidebarMenuButton = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> &
    VariantProps<typeof sidebarMenuButtonVariants> & {
      asChild?: boolean
      isActive?: boolean
      tooltip?: string | React.ComponentProps<typeof SidebarMenuButtonTooltip>
    }
>(
  (
    {
      variant = "default",
      size = "default",
      asChild = false,
      isActive = false,
      className,
      tooltip,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : "button"

    const button = (
      <Comp
        ref={ref}
        data-sidebar="menu-button"
        data-active={isActive}
        className={cn(
          sidebarMenuButtonVariants({ variant, size }),
          isActive && "bg-sidebar-accent text-sidebar-accent-foreground",
          className
        )}
        {...props}
      />
    )

    if (!tooltip) {
      return button
    }

    return (
      <SidebarMenuButtonTooltip {...(typeof tooltip === "string" ? { children: tooltip } : tooltip)}>
        {button}
      </SidebarMenuButtonTooltip>
    )
  }
)
SidebarMenuButton.displayName = "SidebarMenuButton"

type SidebarMenuButtonTooltipProps = {
  children: React.ReactNode
  delayDuration?: number
  side?: "top" | "right" | "bottom" | "left"
}

const SidebarMenuButtonTooltip = ({ children }: SidebarMenuButtonTooltipProps) => {
  return <>{children}</>
}

const SidebarMenu = React.forwardRef<
  HTMLUListElement,
  React.HTMLAttributes<HTMLUListElement>
>(({ className, ...props }, ref) => (
  <ul
    ref={ref}
    data-sidebar="menu"
    className={cn("flex w-full min-w-0 flex-col gap-1", className)}
    {...props}
  />
))
SidebarMenu.displayName = "SidebarMenu"

const SidebarMenuItem = React.forwardRef<
  HTMLLIElement,
  React.HTMLAttributes<HTMLLIElement>
>(({ className, ...props }, ref) => (
  <li
    ref={ref}
    data-sidebar="menu-item"
    className={cn("group/menu-item relative", className)}
    {...props}
  />
))
SidebarMenuItem.displayName = "SidebarMenuItem"

const SidebarMenuSkeleton = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    showIcon?: boolean
  }
>(({ className, showIcon = false, ...props }, ref) => (
  <div
    ref={ref}
    data-sidebar="menu-skeleton"
    data-show-icon={showIcon}
    className={cn("rounded-md bg-sidebar-accent px-2 py-1.5", className)}
    {...props}
  />
))
SidebarMenuSkeleton.displayName = "SidebarMenuSkeleton"

const SidebarMenuSub = React.forwardRef<
  HTMLUListElement,
  React.HTMLAttributes<HTMLUListElement>
>(({ className, ...props }, ref) => (
  <ul
    ref={ref}
    data-sidebar="menu-sub"
    className={cn(
      "border-l border-sidebar-border bg-sidebar px-1.5 py-0.5 group-data-[collapsible=icon]/sidebar:hidden",
      className
    )}
    {...props}
  />
))
SidebarMenuSub.displayName = "SidebarMenuSub"

const SidebarMenuSubItem = React.forwardRef<
  HTMLLIElement,
  React.HTMLAttributes<HTMLLIElement>
>(({ ...props }, ref) => <li ref={ref} {...props} />)
SidebarMenuSubItem.displayName = "SidebarMenuSubItem"

const SidebarMenuSubButton = React.forwardRef<
  HTMLAnchorElement,
  React.AnchorHTMLAttributes<HTMLAnchorElement> & {
    asChild?: boolean
    size?: "sm" | "md"
    isActive?: boolean
  }
>(({ asChild = false, size = "md", isActive, className, ...props }, ref) => {
  const Comp = asChild ? Slot : "a"

  return (
    <Comp
      ref={ref}
      data-sidebar="menu-sub-button"
      data-size={size}
      data-active={isActive}
      className={cn(
        "flex h-7 min-w-0 -translate-x-px items-center gap-2 rounded-md px-2 text-xs font-medium text-sidebar-foreground outline-none ring-sidebar-ring hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 [&>svg]:size-4 [&>svg]:shrink-0",
        "data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground",
        className
      )}
      {...props}
    />
  )
})
SidebarMenuSubButton.displayName = "SidebarMenuSubButton"

export {
  Sidebar,
  SidebarProvider,
  useSidebar,
  SidebarTrigger,
  SidebarRail,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
}

"use client"

import * as React from "react"
import { Check, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

interface SelectContextValue {
    value: string
    label: string
    onValueChange: (value: string, label: string) => void
    open: boolean
    setOpen: (open: boolean) => void
}

const SelectContext = React.createContext<SelectContextValue | null>(null)

interface SelectProps {
    children: React.ReactNode
    /** Controlled value */
    value?: string
    /** Uncontrolled initial value */
    defaultValue?: string
    onValueChange?: (value: string) => void
}

export const Select = ({ children, value: controlledValue, defaultValue, onValueChange }: SelectProps) => {
    const [open, setOpen] = React.useState(false)
    const [internalValue, setInternalValue] = React.useState(defaultValue ?? "")
    const [label, setLabel] = React.useState("")
    const containerRef = React.useRef<HTMLDivElement>(null)

    const isControlled = controlledValue !== undefined
    const value = isControlled ? controlledValue : internalValue

    const handleValueChange = React.useCallback((newValue: string, newLabel: string) => {
        setLabel(newLabel)
        if (!isControlled) setInternalValue(newValue)
        onValueChange?.(newValue)
    }, [isControlled, onValueChange])

    // Close on outside click
    React.useEffect(() => {
        if (!open) return
        const handler = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpen(false)
            }
        }
        document.addEventListener("mousedown", handler)
        return () => document.removeEventListener("mousedown", handler)
    }, [open])

    return (
        <SelectContext.Provider value={{ value, label, onValueChange: handleValueChange, open, setOpen }}>
            <div className="relative" ref={containerRef}>{children}</div>
        </SelectContext.Provider>
    )
}

interface SelectTriggerProps {
    children: React.ReactNode
    className?: string
}

export const SelectTrigger = ({ children, className }: SelectTriggerProps) => {
    const ctx = React.useContext(SelectContext)
    return (
        <button
            type="button"
            onClick={() => ctx?.setOpen(!ctx.open)}
            aria-haspopup="listbox"
            aria-expanded={ctx?.open}
            className={cn("flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50", className)}
        >
            {children}
            <ChevronDown className="h-4 w-4 opacity-50 shrink-0" />
        </button>
    )
}

interface SelectValueProps {
    placeholder?: string
}

export const SelectValue = ({ placeholder }: SelectValueProps) => {
    const ctx = React.useContext(SelectContext)
    return <span>{ctx?.label || placeholder}</span>
}

interface SelectContentProps {
    children: React.ReactNode
}

export const SelectContent = ({ children }: SelectContentProps) => {
    const ctx = React.useContext(SelectContext)
    if (!ctx?.open) return null
    return (
        <div
            role="listbox"
            className="absolute z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md animate-in fade-in-80 w-full mt-1"
        >
            <div className="p-1">{children}</div>
        </div>
    )
}

interface SelectItemProps {
    children: React.ReactNode
    value: string
    className?: string
}

export const SelectItem = ({ children, value, className }: SelectItemProps) => {
    const ctx = React.useContext(SelectContext)
    const isSelected = ctx?.value === value
    const label = typeof children === "string" ? children : ""

    // Sync label for defaultValue on first match
    React.useEffect(() => {
        if (isSelected && ctx && !ctx.label && label) {
            ctx.onValueChange(value, label)
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    return (
        <div
            role="option"
            aria-selected={isSelected}
            onClick={() => {
                ctx?.onValueChange(value, label)
                ctx?.setOpen(false)
            }}
            onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                    ctx?.onValueChange(value, label)
                    ctx?.setOpen(false)
                }
            }}
            tabIndex={0}
            className={cn("relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50", className)}
        >
            <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                {isSelected && <Check className="h-4 w-4" />}
            </span>
            {children}
        </div>
    )
}

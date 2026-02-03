import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-all duration-200 ease-out disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 active:scale-[0.98] touch-manipulation",
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/25 hover:brightness-110',
        destructive:
          'bg-destructive text-white shadow-lg shadow-destructive/20 hover:shadow-xl hover:shadow-destructive/25 hover:brightness-110',
        outline:
          'border-2 border-border bg-background hover:bg-muted hover:border-muted-foreground/20 text-foreground',
        secondary:
          'bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border',
        ghost:
          'hover:bg-muted hover:text-foreground text-muted-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
        success:
          'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 hover:shadow-xl hover:shadow-emerald-500/25 hover:brightness-110',
        warning:
          'bg-amber-500 text-white shadow-lg shadow-amber-500/20 hover:shadow-xl hover:shadow-amber-500/25 hover:brightness-110',
      },
      size: {
        default: 'h-11 px-5 py-2.5 min-h-[44px]',
        sm: 'h-9 rounded-lg gap-1.5 px-3.5 min-h-[36px] text-xs',
        lg: 'h-12 rounded-xl px-7 min-h-[48px] text-base',
        xl: 'h-14 rounded-2xl px-8 min-h-[56px] text-lg',
        icon: 'size-11 min-w-[44px] min-h-[44px]',
        'icon-sm': 'size-9 min-w-[36px] min-h-[36px] rounded-lg',
        'icon-lg': 'size-12 min-w-[48px] min-h-[48px]',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : 'button'

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }

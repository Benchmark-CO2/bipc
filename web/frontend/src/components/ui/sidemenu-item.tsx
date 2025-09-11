import { cn } from '@/lib/utils';
import { cva, VariantProps } from 'class-variance-authority';
import React, { ComponentClass } from 'react';

interface SidemenuItemProps {
  children?: React.ReactNode
  title?: string
  hide?: boolean
}

const SidemenuItemsVariants = cva(
  'flex items-center justify-between  transition-all rounded-md h-10 p-2 group',
  {
    variants: {
      variant: {
        default: 'has-[a[data-status="active"]]:bg-active!',
        link: 'flex items-center justify-between has-[a[data-status="active"]]:bg-transparent! transition-all rounded-md h-10 p-2 group'
      }
    },
    defaultVariants: {
      variant: 'default',
    }
  }
)

const SidemenuItem = ({ children, title, hide = false, variant, className }: SidemenuItemProps & VariantProps<typeof SidemenuItemsVariants> & { className?: ComponentClass}) => {
  return (
    <div className={
      cn(SidemenuItemsVariants({ variant, className }), {
        'hidden': hide
      })
    }>
      {title && <span>{title}</span>}
      {children}
    </div>
  )
}

export default SidemenuItem
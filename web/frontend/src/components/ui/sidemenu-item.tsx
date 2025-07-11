import { cn } from '@/lib/utils';
import React from 'react';

interface SidemenuItemProps {
  children?: React.ReactNode
  title?: string
  hide?: boolean
}
const SidemenuItem = ({ children, title, hide = false}: SidemenuItemProps) => {
  return (
    <div className={
      cn('flex items-center justify-between has-[a[data-status="active"]]:bg-active! transition-all rounded-md h-10 p-2 group', {
        'hidden': hide
      })
    }>
      {title && <span>{title}</span>}
      {children}
    </div>
  )
}

export default SidemenuItem
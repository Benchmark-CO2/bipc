import { Search, FileText, Package } from 'lucide-react'
import { cn } from '@/lib/utils'

interface NotFoundListProps {
  message?: string
  description?: string
  icon?: 'search' | 'file' | 'package' | React.ReactElement
  className?: string
  showIcon?: boolean
  button?: React.ReactNode
}

const NotFoundList = ({
  message = 'Nenhum dado encontrado',
  description = 'Não foi possível encontrar nenhum item com os critérios especificados.',
  icon = 'search',
  className,
  showIcon = true,
  button = null
}: NotFoundListProps) => {
  const getIcon = () => {
    if (!showIcon) return null

    if (typeof icon === 'string') {
      const iconProps = { size: 64, className: 'text-muted-foreground/40' }

      switch (icon) {
        case 'search':
          return <Search {...iconProps} />
        case 'file':
          return <FileText {...iconProps} />
        case 'package':
          return <Package {...iconProps} />
        default:
          return <Search {...iconProps} />
      }
    }

    return icon
  }

  return (
    <div
      className={cn(
        'flex w-full flex-col items-center justify-center rounded-md border bg-zinc-100 px-6 py-16 text-center text-zinc-500 dark:bg-zinc-800',
        className
      )}
    >
      {showIcon && <div className='mb-6'>{getIcon()}</div>}

      <div className='space-y-2'>
        <h3 className='text-lg font-semibold text-foreground'>{message}</h3>

        {description && <p className='max-w-md text-sm text-muted-foreground'>{description}</p>}
      </div>
      {button && <div className='mt-4'>{button}</div>}
    </div>
  )
}

export default NotFoundList

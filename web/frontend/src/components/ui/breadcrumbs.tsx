import { Link, useMatches } from '@tanstack/react-router'

const BreadCrumbs = () => {
  const matches = useMatches({
    select: (matches) => {
      return matches.filter((match) => !!(match as { loaderData?: { crumb?: string } }).loaderData?.crumb)
    }
  })

  const crumbs = matches.map((match) => {
    const { crumb } = match.loaderData as { crumb: string }
    return crumb
  })

  const crumbsLength = crumbs.length

  const crumbsList = crumbs.map((crumb, index) => {
    return (
      <li key={index} className='inline-flex items-center justify-between gap-2'>
        <Link
          to={matches[index].pathname}
          className='inline-flex items-center text-sm font-medium text-zinc-700 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white'
        >
          {crumb}
        </Link>
        {index < crumbsLength - 1 && (
          <svg
            className='h-6 w-6 text-zinc-400 dark:text-zinc-600'
            fill='none'
            viewBox='0 0 24 24'
            stroke='currentColor'
          >
            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M13 7l5 5-5 5m6-5H6' />
          </svg>
        )}
      </li>
    )
  })

  return (
    <nav className={`w-[100% + 24px] m-[-24px] mb-0 flex h-auto items-center ${crumbsList.length > 0 ? 'p-4' : 'p-0'}`}>
      <ol className='inline-flex items-center space-x-1 md:space-x-3'>{crumbsList}</ol>
    </nav>
  )
}

export default BreadCrumbs

import React from 'react'

interface IScreen {
  children: React.ReactNode
}
const Screen = ({ children }: IScreen) => {
  return <main className='h-full w-full overflow-auto p-6'>{children}</main>
}

export default Screen

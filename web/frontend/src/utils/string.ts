const getInitials = (name: string) => {
  const parts = name.split(' ')
  const initials = parts.map(part => part[0].toUpperCase()).join('')
  return initials
}

export const stringUtils = {
  getInitials,
}
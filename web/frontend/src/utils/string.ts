const getInitials = (name: string) => {
  const parts = name.split(' ')
  const initials = parts.map(part => part[0].toUpperCase()).join('')
  return initials
}

const toCamelCase = (str: string) => {
  return str.replace(/(?:^\w|[A-Z]|\b\w|\s+)/g, (match, index) => {
    if (+match === 0) return ''
    return index === 0 ? match.toLowerCase() : match.toUpperCase()
  })
}

export const stringUtils = {
  getInitials,
  toCamelCase
}
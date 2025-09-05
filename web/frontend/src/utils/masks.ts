const cepMask = (value: string) => {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{5})(\d)/, '$1-$2')
    .replace(/(-\d{3})\d+?$/, '$1')
}

const dateMask = (value: string) => {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{2})(\d)/, '$1/$2')
    .replace(/(\/\d{2})(\d)/, '$1/$2')
    .replace(/(\/\d{4})\d+?$/, '$1')
}

export const masks = {
  cep: cepMask,
  date: dateMask,
}
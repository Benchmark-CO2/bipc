export const getFromStorage = <T>(
  key: string,
  initialState: T,
  storage: 'localStorage' | 'sessionStorage' = 'localStorage'
): T => {
  try {
    const item = window[storage].getItem(key)
    if (!item) {
      return initialState
    }
    return JSON.parse(item) as T
  } catch (error) {
    console.error(`Error getting item from ${storage}:`, error)
    return initialState
  }
}

export const setToStorage = <T>(
  key: string,
  value: T,
  storage: 'localStorage' | 'sessionStorage' = 'localStorage'
): void => {
  try {
    window[storage].setItem(key, JSON.stringify(value))
  } catch (error) {
    console.error(`Error setting item to ${storage}:`, error)
  }
}

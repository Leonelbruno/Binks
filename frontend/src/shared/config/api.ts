import { parseApiUrl } from './validation'

export const apiUrl = parseApiUrl(import.meta.env.VITE_API_URL)

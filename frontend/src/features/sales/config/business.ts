import { parseBusinessId } from '../../../shared/config/validation'

export const businessId = parseBusinessId(import.meta.env.VITE_BUSINESS_ID)

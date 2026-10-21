import { api } from '../../../shared/services/api'
import type { Catalog } from '../types/catalog.types'

export function getCatalog(
    businessId: number,
    signal?: AbortSignal,
): Promise<Catalog> {
    return api.get<Catalog>(
        `/api/businesses/${businessId}/catalog`,
        { signal },
    )
}
export type CatalogVariant = {
    id: number
    name: string
    priceCents: number
    sortOrder: number
}

export type CatalogProduct = {
    id: number
    name: string
    description: string | null
    sortOrder: number
    variants: CatalogVariant[]
}

export type CatalogCategory = {
    id: number
    name: string
    description: string | null
    sortOrder: number
    products: CatalogProduct[]
}

export type Catalog = {
    categories: CatalogCategory[]
}

export type CatalogResponse = {
    data: Catalog
}
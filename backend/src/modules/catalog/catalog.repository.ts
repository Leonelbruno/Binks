import type { Queryable } from "../../shared/database/queryable.js";

export type CatalogVariant = {
    id: number;
    name: string;
    priceCents: number;
    sortOrder: number;
};

export type CatalogProduct = {
    id: number;
    name: string;
    description: string | null;
    sortOrder: number;
    variants: CatalogVariant[];
};

export type CatalogCategory = {
    id: number;
    name: string;
    description: string | null;
    sortOrder: number;
    products: CatalogProduct[];
};

export type Catalog = {
    categories: CatalogCategory[];
};

type CatalogRow = {
    category_id: number;
    category_name: string;
    category_description: string | null;
    category_sort_order: number;

    product_id: number | null;
    product_name: string | null;
    product_description: string | null;
    product_sort_order: number | null;

    variant_id: number | null;
    variant_name: string | null;
    variant_price_cents: number | null;
    variant_sort_order: number | null;
};

export function createCatalogRepository(db: Queryable) {
    async function getByBusiness(
        businessId: number,
    ): Promise<Catalog> {
        const { rows } = await db.query<CatalogRow>(
            `
      SELECT
        c.id AS category_id,
        c.name AS category_name,
        c.description AS category_description,
        c.sort_order AS category_sort_order,

        p.id AS product_id,
        p.name AS product_name,
        p.description AS product_description,
        p.sort_order AS product_sort_order,

        pv.id AS variant_id,
        pv.name AS variant_name,
        pv.price_cents AS variant_price_cents,
        pv.sort_order AS variant_sort_order

      FROM category c

      LEFT JOIN product p
        ON p.business_id = c.business_id
        AND p.category_id = c.id
        AND p.active = true

      LEFT JOIN product_variant pv
        ON pv.business_id = c.business_id
        AND pv.product_id = p.id
        AND pv.active = true

      WHERE c.business_id = $1
        AND c.active = true

      ORDER BY
        c.sort_order,
        c.name,
        c.id,
        p.sort_order,
        p.name,
        p.id,
        pv.sort_order,
        pv.name,
        pv.id
      `,
            [businessId],
        );

        const categories = new Map<number, CatalogCategory>();

        for (const row of rows) {
            let category = categories.get(row.category_id);

            if (!category) {
                category = {
                    id: row.category_id,
                    name: row.category_name,
                    description: row.category_description,
                    sortOrder: row.category_sort_order,
                    products: [],
                };

                categories.set(row.category_id, category);
            }

            if (row.product_id === null || row.product_name === null) {
                continue;
            }

            let product = category.products.find(
                (item) => item.id === row.product_id,
            );

            if (!product) {
                product = {
                    id: row.product_id,
                    name: row.product_name,
                    description: row.product_description,
                    sortOrder: row.product_sort_order!,
                    variants: [],
                };

                category.products.push(product);
            }

            if (
                row.variant_id !== null &&
                row.variant_name !== null &&
                row.variant_price_cents !== null &&
                row.variant_sort_order !== null
            ) {
                product.variants.push({
                    id: row.variant_id,
                    name: row.variant_name,
                    priceCents: row.variant_price_cents,
                    sortOrder: row.variant_sort_order,
                });
            }
        }

        return {
            categories: [...categories.values()],
        };
    }

    return {
        getByBusiness,
    };
}

export type CatalogRepository = ReturnType<
    typeof createCatalogRepository
>;
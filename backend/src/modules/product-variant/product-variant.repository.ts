import type { Queryable } from "../../shared/database/queryable.js";
import type {
    CreateProductVariantInput,
    UpdateProductVariantInput,
} from "./product-variant.schemas.js";

export type ProductVariant = {
    id: number;
    businessId: number;
    productId: number;
    name: string;
    priceCents: number;
    active: boolean;
    sortOrder: number;
    createdAt: Date;
    updatedAt: Date;
};

type ProductVariantRow = {
    id: number;
    business_id: number;
    product_id: number;
    name: string;
    price_cents: number;
    active: boolean;
    sort_order: number;
    created_at: Date;
    updated_at: Date;
};

export type OrderableVariant = {
    id: number;
    productName: string;
    variantName: string;
    priceCents: number;
    active: boolean;
};

const COLUMNS =
    "id, business_id, product_id, name, price_cents, active, sort_order, created_at, updated_at";

const UPDATABLE_COLUMNS = {
    name: "name",
    priceCents: "price_cents",
    sortOrder: "sort_order",
    active: "active",
} as const;

function toProductVariant(row: ProductVariantRow): ProductVariant {
    return {
        id: row.id,
        businessId: row.business_id,
        productId: row.product_id,
        name: row.name,
        priceCents: row.price_cents,
        active: row.active,
        sortOrder: row.sort_order,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

export function createProductVariantRepository(db: Queryable) {
    async function list(
        businessId: number,
        productId: number,
        filters: { active?: boolean } = {},
    ): Promise<ProductVariant[]> {
        const { rows } = await db.query<ProductVariantRow>(
            `SELECT ${COLUMNS}
       FROM product_variant
       WHERE business_id = $1
         AND product_id = $2
         AND ($3::boolean IS NULL OR active = $3)
       ORDER BY sort_order, name, id`,
            [businessId, productId, filters.active ?? null],
        );

        return rows.map(toProductVariant);
    }

    async function findById(
        businessId: number,
        productId: number,
        variantId: number,
    ): Promise<ProductVariant | null> {
        const { rows } = await db.query<ProductVariantRow>(
            `SELECT ${COLUMNS}
       FROM product_variant
       WHERE business_id = $1
         AND product_id = $2
         AND id = $3`,
            [businessId, productId, variantId],
        );

        return rows[0] ? toProductVariant(rows[0]) : null;
    }

    async function create(
        businessId: number,
        productId: number,
        input: CreateProductVariantInput,
    ): Promise<ProductVariant> {
        const { rows } = await db.query<ProductVariantRow>(
            `INSERT INTO product_variant (
        business_id,
        product_id,
        name,
        price_cents,
        sort_order
      )
       VALUES (
         $1,
         $2,
         $3,
         $4,
         COALESCE(
           $5,
           (
             SELECT COALESCE(MAX(sort_order), -1) + 1
             FROM product_variant
             WHERE business_id = $1
               AND product_id = $2
           )
         )
       )
       RETURNING ${COLUMNS}`,
            [
                businessId,
                productId,
                input.name,
                input.priceCents,
                input.sortOrder ?? null,
            ],
        );

        return toProductVariant(rows[0]!);
    }

    async function update(
        businessId: number,
        productId: number,
        variantId: number,
        input: UpdateProductVariantInput,
    ): Promise<ProductVariant | null> {
        const assignments: string[] = [];
        const values: unknown[] = [businessId, productId, variantId];

        for (const [key, column] of Object.entries(UPDATABLE_COLUMNS) as [
            keyof typeof UPDATABLE_COLUMNS,
            string,
        ][]) {
            const value = input[key];

            if (value !== undefined) {
                values.push(value);
                assignments.push(`${column} = $${values.length}`);
            }
        }

        if (assignments.length === 0) {
            return findById(businessId, productId, variantId);
        }

        const { rows } = await db.query<ProductVariantRow>(
            `UPDATE product_variant
       SET ${assignments.join(", ")}
       WHERE business_id = $1
         AND product_id = $2
         AND id = $3
       RETURNING ${COLUMNS}`,
            values,
        );

        return rows[0] ? toProductVariant(rows[0]) : null;
    }
    async function findOrderableByIds(
        businessId: number,
        variantIds: number[],
    ): Promise<OrderableVariant[]> {
        if (variantIds.length === 0) {
            return [];
        }

        const { rows } = await db.query<{
            id: number;
            product_name: string;
            variant_name: string;
            price_cents: number;
            active: boolean;
        }>(
            `
    SELECT
      pv.id,
      p.name AS product_name,
      pv.name AS variant_name,
      pv.price_cents,
      (pv.active AND p.active) AS active
    FROM product_variant pv
    INNER JOIN product p
      ON p.business_id = pv.business_id
      AND p.id = pv.product_id
    WHERE pv.business_id = $1
      AND pv.id = ANY($2::int[])
    `,
            [businessId, variantIds],
        );

        return rows.map((row) => ({
            id: row.id,
            productName: row.product_name,
            variantName: row.variant_name,
            priceCents: row.price_cents,
            active: row.active,
        }));
    }
    return {
    list,
    findById,
    findOrderableByIds,
    create,
    update,
};
}

export type ProductVariantRepository = ReturnType<
    typeof createProductVariantRepository
>;
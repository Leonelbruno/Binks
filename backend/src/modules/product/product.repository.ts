import type { Queryable } from "../../shared/database/queryable.js";
import type {
    CreateProductInput,
    UpdateProductInput,
} from "./product.schemas.js";

export type Product = {
    id: number;
    businessId: number;
    categoryId: number;
    name: string;
    description: string | null;
    active: boolean;
    sortOrder: number;
    createdAt: Date;
    updatedAt: Date;
};

type ProductRow = {
    id: number;
    business_id: number;
    category_id: number;
    name: string;
    description: string | null;
    active: boolean;
    sort_order: number;
    created_at: Date;
    updated_at: Date;
};

const COLUMNS =
    "id, business_id, category_id, name, description, active, sort_order, created_at, updated_at";

const UPDATABLE_COLUMNS = {
    categoryId: "category_id",
    name: "name",
    description: "description",
    sortOrder: "sort_order",
    active: "active",
} as const;

function toProduct(row: ProductRow): Product {
    return {
        id: row.id,
        businessId: row.business_id,
        categoryId: row.category_id,
        name: row.name,
        description: row.description,
        active: row.active,
        sortOrder: row.sort_order,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

export function createProductRepository(db: Queryable) {
    async function list(
        businessId: number,
        filters: { active?: boolean } = {},
    ): Promise<Product[]> {
        const { rows } = await db.query<ProductRow>(
            `SELECT ${COLUMNS} FROM product
       WHERE business_id = $1 AND ($2::boolean IS NULL OR active = $2)
       ORDER BY category_id, sort_order, name, id`,
            [businessId, filters.active ?? null],
        );

        return rows.map(toProduct);
    }

    async function findById(
        businessId: number,
        productId: number,
    ): Promise<Product | null> {
        const { rows } = await db.query<ProductRow>(
            `SELECT ${COLUMNS} FROM product
       WHERE business_id = $1 AND id = $2`,
            [businessId, productId],
        );

        return rows[0] ? toProduct(rows[0]) : null;
    }

    async function create(
        businessId: number,
        input: CreateProductInput,
    ): Promise<Product> {
        const { rows } = await db.query<ProductRow>(
            `INSERT INTO product (
        business_id,
        category_id,
        name,
        description,
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
             FROM product
             WHERE business_id = $1 AND category_id = $2
           )
         )
       )
       RETURNING ${COLUMNS}`,
            [
                businessId,
                input.categoryId,
                input.name,
                input.description ?? null,
                input.sortOrder ?? null,
            ],
        );

        return toProduct(rows[0]!);
    }

    async function update(
        businessId: number,
        productId: number,
        input: UpdateProductInput,
    ): Promise<Product | null> {
        const assignments: string[] = [];
        const values: unknown[] = [businessId, productId];

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
            return findById(businessId, productId);
        }

        const { rows } = await db.query<ProductRow>(
            `UPDATE product
       SET ${assignments.join(", ")}
       WHERE business_id = $1 AND id = $2
       RETURNING ${COLUMNS}`,
            values,
        );

        return rows[0] ? toProduct(rows[0]) : null;
    }

    return {
        list,
        findById,
        create,
        update,
    };
}

export type ProductRepository = ReturnType<typeof createProductRepository>;
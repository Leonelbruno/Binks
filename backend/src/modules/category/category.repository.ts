import type { Queryable } from "../../shared/database/queryable.js";
import type {
  CreateCategoryInput,
  UpdateCategoryInput,
} from "./category.schemas.js";

export type Category = {
  id: number;
  businessId: number;
  name: string;
  description: string | null;
  active: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
};

type CategoryRow = {
  id: number;
  business_id: number;
  name: string;
  description: string | null;
  active: boolean;
  sort_order: number;
  created_at: Date;
  updated_at: Date;
};

const COLUMNS =
  "id, business_id, name, description, active, sort_order, created_at, updated_at";

const UPDATABLE_COLUMNS = {
  name: "name",
  description: "description",
  sortOrder: "sort_order",
  active: "active",
} as const;

function toCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    businessId: row.business_id,
    name: row.name,
    description: row.description,
    active: row.active,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function createCategoryRepository(db: Queryable) {
  async function list(
    businessId: number,
    filters: { active?: boolean } = {},
  ): Promise<Category[]> {
    const { rows } = await db.query<CategoryRow>(
      `SELECT ${COLUMNS} FROM category
       WHERE business_id = $1 AND ($2::boolean IS NULL OR active = $2)
       ORDER BY sort_order, name, id`,
      [businessId, filters.active ?? null],
    );
    return rows.map(toCategory);
  }

  async function findById(
    businessId: number,
    categoryId: number,
  ): Promise<Category | null> {
    const { rows } = await db.query<CategoryRow>(
      `SELECT ${COLUMNS} FROM category WHERE business_id = $1 AND id = $2`,
      [businessId, categoryId],
    );
    return rows[0] ? toCategory(rows[0]) : null;
  }

  async function create(
    businessId: number,
    input: CreateCategoryInput,
  ): Promise<Category> {
    const { rows } = await db.query<CategoryRow>(
      `INSERT INTO category (business_id, name, description, sort_order)
       VALUES (
         $1, $2, $3,
         COALESCE($4, (SELECT COALESCE(MAX(sort_order), -1) + 1 FROM category WHERE business_id = $1))
       )
       RETURNING ${COLUMNS}`,
      [
        businessId,
        input.name,
        input.description ?? null,
        input.sortOrder ?? null,
      ],
    );
    return toCategory(rows[0]!);
  }

  async function update(
    businessId: number,
    categoryId: number,
    input: UpdateCategoryInput,
  ): Promise<Category | null> {
    const assignments: string[] = [];
    const values: unknown[] = [businessId, categoryId];

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
      return findById(businessId, categoryId);
    }

    const { rows } = await db.query<CategoryRow>(
      `UPDATE category SET ${assignments.join(", ")}
       WHERE business_id = $1 AND id = $2
       RETURNING ${COLUMNS}`,
      values,
    );
    return rows[0] ? toCategory(rows[0]) : null;
  }

  return { list, findById, create, update };
}

export type CategoryRepository = ReturnType<typeof createCategoryRepository>;

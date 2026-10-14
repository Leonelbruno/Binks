import type { Queryable } from "../../shared/database/queryable.js";

export type Business = {
  id: number;
  name: string;
  slug: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type BusinessRow = {
  id: number;
  name: string;
  slug: string;
  active: boolean;
  created_at: Date;
  updated_at: Date;
};

const COLUMNS = "id, name, slug, active, created_at, updated_at";

function toBusiness(row: BusinessRow): Business {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    active: row.active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function createBusinessRepository(db: Queryable) {
  async function findById(businessId: number): Promise<Business | null> {
    const { rows } = await db.query<BusinessRow>(
      `SELECT ${COLUMNS} FROM business WHERE id = $1`,
      [businessId],
    );
    return rows[0] ? toBusiness(rows[0]) : null;
  }

  return { findById };
}

export type BusinessRepository = ReturnType<typeof createBusinessRepository>;

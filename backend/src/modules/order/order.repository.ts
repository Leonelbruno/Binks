import type { Database, Queryable } from "../../shared/database/queryable.js";

export const ORDER_SOURCES = ["LOCAL", "WHATSAPP", "PEDIDOS_YA"] as const;
export const ORDER_STATUSES = [
  "IN_PROGRESS",
  "READY",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "CANCELLED",
] as const;

export type OrderSource = (typeof ORDER_SOURCES)[number];
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export type OrderItem = {
  id: number;
  variantId: number;
  productName: string;
  variantName: string;
  quantity: number;
  unitPriceCents: number;
  subtotalCents: number;
};

export type Order = {
  id: number;
  businessId: number;
  orderNumber: number;
  source: OrderSource;
  status: OrderStatus;
  totalCents: number;
  items: OrderItem[];
  createdAt: Date;
  updatedAt: Date;
};

export type NewOrderItem = {
  variantId: number;
  productName: string;
  variantName: string;
  quantity: number;
  unitPriceCents: number;
};

export type NewOrder = {
  source: OrderSource;
  status: OrderStatus;
  items: NewOrderItem[];
};

type OrderRow = {
  id: number;
  business_id: number;
  order_number: number;
  source: OrderSource;
  status: OrderStatus;
  total_cents: number;
  created_at: Date;
  updated_at: Date;
};

type OrderItemRow = {
  id: number;
  variant_id: number;
  product_name: string;
  variant_name: string;
  quantity: number;
  unit_price_cents: number;
  subtotal_cents: number;
};

const ORDER_COLUMNS =
  "id, business_id, order_number, source, status, total_cents, created_at, updated_at";

const ITEM_COLUMNS =
  "id, variant_id, product_name, variant_name, quantity, unit_price_cents, subtotal_cents";

function toOrderItem(row: OrderItemRow): OrderItem {
  return {
    id: row.id,
    variantId: row.variant_id,
    productName: row.product_name,
    variantName: row.variant_name,
    quantity: row.quantity,
    unitPriceCents: row.unit_price_cents,
    subtotalCents: row.subtotal_cents,
  };
}

function toOrder(row: OrderRow, items: OrderItemRow[]): Order {
  return {
    id: row.id,
    businessId: row.business_id,
    orderNumber: row.order_number,
    source: row.source,
    status: row.status,
    totalCents: row.total_cents,
    items: items.map(toOrderItem),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function loadOrder(
  db: Queryable,
  businessId: number,
  orderId: number,
): Promise<Order | null> {
  const orderResult = await db.query<OrderRow>(
    `SELECT ${ORDER_COLUMNS} FROM orders WHERE business_id = $1 AND id = $2`,
    [businessId, orderId],
  );
  const orderRow = orderResult.rows[0];
  if (!orderRow) return null;

  const itemsResult = await db.query<OrderItemRow>(
    `SELECT ${ITEM_COLUMNS} FROM order_item
     WHERE business_id = $1 AND order_id = $2
     ORDER BY id`,
    [businessId, orderId],
  );
  return toOrder(orderRow, itemsResult.rows);
}

async function nextOrderNumber(
  db: Queryable,
  businessId: number,
): Promise<number> {
  const { rows } = await db.query<{ last_number: number }>(
    `INSERT INTO order_counter (business_id, last_number) VALUES ($1, 1)
     ON CONFLICT (business_id)
     DO UPDATE SET last_number = order_counter.last_number + 1
     RETURNING last_number`,
    [businessId],
  );
  return rows[0]!.last_number;
}

async function insertItems(
  db: Queryable,
  businessId: number,
  orderId: number,
  items: NewOrderItem[],
): Promise<void> {
  if (items.length === 0) return;

  await db.query(
    `INSERT INTO order_item
       (business_id, order_id, variant_id, product_name, variant_name, quantity, unit_price_cents)
     SELECT $1, $2, v.variant_id, v.product_name, v.variant_name, v.quantity, v.unit_price_cents
     FROM unnest($3::int[], $4::text[], $5::text[], $6::int[], $7::int[])
       AS v(variant_id, product_name, variant_name, quantity, unit_price_cents)`,
    [
      businessId,
      orderId,
      items.map((item) => item.variantId),
      items.map((item) => item.productName),
      items.map((item) => item.variantName),
      items.map((item) => item.quantity),
      items.map((item) => item.unitPriceCents),
    ],
  );
}

export function createOrderRepository(db: Database) {
  async function create(businessId: number, input: NewOrder): Promise<Order> {
    const client = await db.connect();
    try {
      await client.query("BEGIN");

      const orderNumber = await nextOrderNumber(client, businessId);
      const { rows } = await client.query<{ id: number }>(
        `INSERT INTO orders (business_id, order_number, source, status, total_cents)
         VALUES ($1, $2, $3, $4, 0)
         RETURNING id`,
        [businessId, orderNumber, input.source, input.status],
      );
      const orderId = rows[0]!.id;

      await insertItems(client, businessId, orderId, input.items);

      await client.query(
        `UPDATE orders
         SET total_cents = (
           SELECT COALESCE(SUM(subtotal_cents), 0) FROM order_item WHERE order_id = $2
         )
         WHERE business_id = $1 AND id = $2`,
        [businessId, orderId],
      );

      const order = await loadOrder(client, businessId, orderId);
      await client.query("COMMIT");
      return order!;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async function findById(
    businessId: number,
    orderId: number,
  ): Promise<Order | null> {
    return loadOrder(db, businessId, orderId);
  }

  return { create, findById };
}

export type OrderRepository = ReturnType<typeof createOrderRepository>;

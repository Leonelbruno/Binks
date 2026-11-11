ALTER TABLE product_variant
  ADD CONSTRAINT product_variant_business_id_id_key UNIQUE (business_id, id);

CREATE TABLE order_counter (
  business_id INTEGER NOT NULL,
  last_number INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT order_counter_pkey PRIMARY KEY (business_id),
  CONSTRAINT order_counter_business_fkey FOREIGN KEY (business_id) REFERENCES business (id),
  CONSTRAINT order_counter_last_number_check CHECK (last_number >= 0)
);

CREATE TABLE orders (
  id           INTEGER GENERATED ALWAYS AS IDENTITY,
  business_id  INTEGER     NOT NULL,
  order_number INTEGER     NOT NULL,
  source       TEXT        NOT NULL,
  status       TEXT        NOT NULL,
  total_cents  INTEGER     NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT orders_pkey PRIMARY KEY (id),
  CONSTRAINT orders_business_fkey FOREIGN KEY (business_id) REFERENCES business (id),
  CONSTRAINT orders_business_id_id_key UNIQUE (business_id, id),
  CONSTRAINT orders_business_id_order_number_key UNIQUE (business_id, order_number),
  CONSTRAINT orders_order_number_check CHECK (order_number > 0),
  CONSTRAINT orders_source_check CHECK (source IN ('LOCAL', 'WHATSAPP', 'PEDIDOS_YA')),
  CONSTRAINT orders_status_check CHECK (
    status IN ('IN_PROGRESS', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED')
  ),
  CONSTRAINT orders_total_cents_check CHECK (total_cents >= 0)
);

CREATE INDEX orders_business_id_status_created_at_idx
  ON orders (business_id, status, created_at DESC);

CREATE INDEX orders_business_id_created_at_idx
  ON orders (business_id, created_at DESC);

CREATE TABLE order_item (
  id               INTEGER GENERATED ALWAYS AS IDENTITY,
  business_id      INTEGER     NOT NULL,
  order_id         INTEGER     NOT NULL,
  variant_id       INTEGER     NOT NULL,
  product_name     TEXT        NOT NULL,
  variant_name     TEXT        NOT NULL,
  quantity         INTEGER     NOT NULL,
  unit_price_cents INTEGER     NOT NULL,
  subtotal_cents   INTEGER GENERATED ALWAYS AS (unit_price_cents * quantity) STORED,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT order_item_pkey PRIMARY KEY (id),
  CONSTRAINT order_item_business_fkey FOREIGN KEY (business_id) REFERENCES business (id),
  CONSTRAINT order_item_order_fkey FOREIGN KEY (business_id, order_id)
    REFERENCES orders (business_id, id),
  CONSTRAINT order_item_variant_fkey FOREIGN KEY (business_id, variant_id)
    REFERENCES product_variant (business_id, id),
  CONSTRAINT order_item_order_id_variant_id_key UNIQUE (order_id, variant_id),
  CONSTRAINT order_item_quantity_check CHECK (quantity > 0),
  CONSTRAINT order_item_unit_price_cents_check CHECK (unit_price_cents >= 0)
);

CREATE TRIGGER orders_set_updated_at
  BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE business (
  id         INTEGER GENERATED ALWAYS AS IDENTITY,
  name       TEXT        NOT NULL,
  slug       TEXT        NOT NULL,
  active     BOOLEAN     NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT business_pkey PRIMARY KEY (id),
  CONSTRAINT business_slug_key UNIQUE (slug),
  CONSTRAINT business_name_not_blank CHECK (btrim(name) <> ''),
  CONSTRAINT business_slug_not_blank CHECK (btrim(slug) <> '')
);

CREATE TABLE category (
  id          INTEGER GENERATED ALWAYS AS IDENTITY,
  business_id INTEGER     NOT NULL,
  name        TEXT        NOT NULL,
  description TEXT,
  active      BOOLEAN     NOT NULL DEFAULT true,
  sort_order  INTEGER     NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT category_pkey PRIMARY KEY (id),
  CONSTRAINT category_business_fkey FOREIGN KEY (business_id) REFERENCES business (id),
  CONSTRAINT category_business_id_id_key UNIQUE (business_id, id),
  CONSTRAINT category_business_id_name_key UNIQUE (business_id, name),
  CONSTRAINT category_name_not_blank CHECK (btrim(name) <> '')
);

CREATE TABLE product (
  id          INTEGER GENERATED ALWAYS AS IDENTITY,
  business_id INTEGER     NOT NULL,
  category_id INTEGER     NOT NULL,
  name        TEXT        NOT NULL,
  description TEXT,
  active      BOOLEAN     NOT NULL DEFAULT true,
  sort_order  INTEGER     NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT product_pkey PRIMARY KEY (id),
  CONSTRAINT product_business_fkey FOREIGN KEY (business_id) REFERENCES business (id),
  CONSTRAINT product_category_fkey FOREIGN KEY (business_id, category_id)
    REFERENCES category (business_id, id),
  CONSTRAINT product_business_id_id_key UNIQUE (business_id, id),
  CONSTRAINT product_business_id_category_id_name_key UNIQUE (business_id, category_id, name),
  CONSTRAINT product_name_not_blank CHECK (btrim(name) <> '')
);

CREATE TABLE product_variant (
  id          INTEGER GENERATED ALWAYS AS IDENTITY,
  business_id INTEGER     NOT NULL,
  product_id  INTEGER     NOT NULL,
  name        TEXT        NOT NULL,
  price_cents INTEGER     NOT NULL,
  active      BOOLEAN     NOT NULL DEFAULT true,
  sort_order  INTEGER     NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT product_variant_pkey PRIMARY KEY (id),
  CONSTRAINT product_variant_business_fkey FOREIGN KEY (business_id) REFERENCES business (id),
  CONSTRAINT product_variant_product_fkey FOREIGN KEY (business_id, product_id)
    REFERENCES product (business_id, id),
  CONSTRAINT product_variant_product_id_name_key UNIQUE (product_id, name),
  CONSTRAINT product_variant_name_not_blank CHECK (btrim(name) <> ''),
  CONSTRAINT product_variant_price_cents_check CHECK (price_cents >= 0)
);

CREATE TRIGGER business_set_updated_at
  BEFORE UPDATE ON business FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER category_set_updated_at
  BEFORE UPDATE ON category FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER product_set_updated_at
  BEFORE UPDATE ON product FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER product_variant_set_updated_at
  BEFORE UPDATE ON product_variant FOR EACH ROW EXECUTE FUNCTION set_updated_at();
-- 001_init.sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  email varchar(255) NOT NULL UNIQUE,
  password_hash varchar(255) NOT NULL,
  role varchar(32) NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE distributors (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES users(id),
  name varchar(255),
  coverage_geojson jsonb,
  max_capacity int DEFAULT 10,
  current_capacity int DEFAULT 0,
  contact jsonb,
  active_flag boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TYPE order_status AS ENUM ('new','assigned','pending','accepted','picked_up','delivered','cancelled');

CREATE TABLE orders (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  woo_order_id varchar(128) UNIQUE,
  customer_name varchar(255),
  customer_phone varchar(50),
  customer_email varchar(255),
  address_text text,
  lat double precision,
  lng double precision,
  amount_total numeric(12,2),
  status order_status DEFAULT 'new',
  assigned_distributor_id uuid REFERENCES distributors(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE assignments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id uuid REFERENCES orders(id),
  distributor_id uuid REFERENCES distributors(id),
  score numeric,
  status varchar(32) DEFAULT 'pending',
  offered_at timestamptz DEFAULT now(),
  responded_at timestamptz
);

CREATE TABLE invoices (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id uuid REFERENCES orders(id),
  pdf_path varchar(1024),
  emailed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE order_events (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id uuid REFERENCES orders(id),
  event_type varchar(64),
  payload jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE logs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  level varchar(16),
  service varchar(64),
  message text,
  meta jsonb,
  created_at timestamptz DEFAULT now()
);

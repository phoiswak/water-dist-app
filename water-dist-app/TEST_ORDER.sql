-- TEST ORDER - Run this in pgAdmin to create a test order
-- This simulates an order coming from WooCommerce

-- First, make sure you have a distributor with location
-- You can check with: SELECT * FROM distributors;

-- If you don't have a distributor yet, create one:
INSERT INTO distributors (name, max_capacity, current_capacity, active_flag, lat, lng, contact)
VALUES (
  'Test Distributor - Johannesburg',
  10,
  0,
  true,
  -26.2041,  -- Johannesburg latitude
  28.0473,   -- Johannesburg longitude
  '{"email": "phosiwak@gmail.com", "phone": "0821234567"}'::jsonb
)
ON CONFLICT DO NOTHING;

-- Create a test order
INSERT INTO orders (
  woo_order_id,
  customer_name,
  customer_phone,
  customer_email,
  address_text,
  lat,
  lng,
  amount_total,
  status
) VALUES (
  'TEST-' || (SELECT EXTRACT(EPOCH FROM NOW())::TEXT),
  'John Doe',
  '0821234567',
  'john@example.com',
  '123 Main Street, Sandton, Johannesburg, 2000, South Africa',
  -26.1076,  -- Sandton coordinates
  28.0567,
  150.00,
  'new'
);

-- Assign it to the distributor (simulating auto-assignment)
WITH latest_order AS (
  SELECT id FROM orders ORDER BY created_at DESC LIMIT 1
),
nearest_distributor AS (
  SELECT id FROM distributors WHERE active_flag = true LIMIT 1
)
UPDATE orders o
SET
  status = 'assigned',
  assigned_distributor_id = (SELECT id FROM nearest_distributor)
FROM latest_order
WHERE o.id = latest_order.id;

-- Create assignment record
WITH latest_order AS (
  SELECT id FROM orders ORDER BY created_at DESC LIMIT 1
),
nearest_distributor AS (
  SELECT id FROM distributors WHERE active_flag = true LIMIT 1
)
INSERT INTO assignments (order_id, distributor_id, score, status)
SELECT
  latest_order.id,
  nearest_distributor.id,
  95.5,
  'pending'
FROM latest_order, nearest_distributor;

-- View the results
SELECT
  o.woo_order_id,
  o.customer_name,
  o.status,
  o.amount_total,
  d.name as assigned_to
FROM orders o
LEFT JOIN distributors d ON o.assigned_distributor_id = d.id
ORDER BY o.created_at DESC
LIMIT 5;

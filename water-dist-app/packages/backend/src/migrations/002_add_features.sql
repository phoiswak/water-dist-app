-- 002_add_features.sql
-- Add missing features for BRD compliance

-- Add latitude and longitude to distributors table (if not exists)
ALTER TABLE distributors
ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS lng DOUBLE PRECISION;

-- Update assignments table to track acceptance/rejection
ALTER TABLE assignments
ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Add proof of delivery to orders
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS proof_of_delivery_url VARCHAR(1024),
ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  order_id UUID REFERENCES orders(id),
  type VARCHAR(32) NOT NULL, -- 'sms', 'email', 'push'
  recipient VARCHAR(255) NOT NULL,
  subject VARCHAR(255),
  message TEXT NOT NULL,
  sent_at TIMESTAMPTZ,
  status VARCHAR(32) DEFAULT 'pending', -- 'pending', 'sent', 'failed'
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);
CREATE INDEX IF NOT EXISTS idx_notifications_order ON notifications(order_id);

-- Insert sample distributor locations (Johannesburg, Cape Town, Durban)
-- You should update these with real distributor addresses

-- Example: Johannesburg distributor
-- UPDATE distributors SET lat = -26.2041, lng = 28.0473 WHERE name = 'JHB Distributor';

-- Example: Cape Town distributor
-- UPDATE distributors SET lat = -33.9249, lng = 18.4241 WHERE name = 'CPT Distributor';

-- Example: Durban distributor
-- UPDATE distributors SET lat = -29.8587, lng = 31.0218 WHERE name = 'DBN Distributor';

COMMENT ON COLUMN distributors.lat IS 'Latitude of distributor warehouse/base location';
COMMENT ON COLUMN distributors.lng IS 'Longitude of distributor warehouse/base location';

-- CREATE delivery_zones table
CREATE TABLE IF NOT EXISTS delivery_zones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name_ar TEXT NOT NULL,
  name_en TEXT NOT NULL,
  delivery_fee DECIMAL(10, 2) NOT NULL CHECK (delivery_fee >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE delivery_zones ENABLE ROW LEVEL SECURITY;

-- Public policies
CREATE POLICY "Public can view delivery zones" ON delivery_zones FOR SELECT USING (TRUE);

-- Restaurant owner policies
CREATE POLICY "Restaurant owners can manage their delivery zones" 
ON delivery_zones FOR ALL 
USING (auth.uid()::text IN (SELECT id::text FROM users WHERE restaurant_id = delivery_zones.restaurant_id));

-- Add index
CREATE INDEX IF NOT EXISTS idx_delivery_zones_restaurant_id ON delivery_zones(restaurant_id);

-- Add update trigger
DROP TRIGGER IF EXISTS update_delivery_zones_updated_at ON delivery_zones;
CREATE TRIGGER update_delivery_zones_updated_at BEFORE UPDATE ON delivery_zones FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

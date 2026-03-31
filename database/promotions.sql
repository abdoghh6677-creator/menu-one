-- =====================================================
-- جدول العروض والإعلانات
-- =====================================================

CREATE TABLE IF NOT EXISTS public.promotions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  title_ar TEXT,
  description TEXT,
  description_ar TEXT,
  image_url TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  starts_at TIMESTAMPTZ DEFAULT NOW(),
  ends_at TIMESTAMPTZ,
  display_duration_seconds INTEGER NOT NULL DEFAULT 4,

  -- Discount settings
  discount_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  apply_to TEXT NOT NULL DEFAULT 'all', -- 'all' or 'item'
  menu_item_id UUID,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure apply_to has valid values and link to menu item (optional)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_promotions_apply_to'
  ) THEN
    ALTER TABLE public.promotions
      ADD CONSTRAINT chk_promotions_apply_to CHECK (apply_to IN ('all', 'item'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'promotions' AND constraint_name = 'fk_promotions_menu_item'
  ) THEN
    ALTER TABLE public.promotions
      ADD CONSTRAINT fk_promotions_menu_item
      FOREIGN KEY (menu_item_id)
      REFERENCES public.menu_items(id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_promotions_restaurant_id ON promotions(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_promotions_active ON promotions(restaurant_id, is_active);
CREATE INDEX IF NOT EXISTS idx_promotions_menu_item_id ON promotions(menu_item_id);

-- Trigger للـ updated_at
DROP TRIGGER IF EXISTS update_promotions_updated_at ON promotions;
CREATE TRIGGER update_promotions_updated_at
  BEFORE UPDATE ON promotions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;

-- العملاء يشوفون العروض النشطة فقط
CREATE POLICY "Public can view active promotions"
  ON promotions FOR SELECT
  USING (is_active = TRUE AND (ends_at IS NULL OR ends_at > NOW()));

-- المطعم يدير عروضه
CREATE POLICY "Restaurant owners can manage promotions"
  ON promotions FOR ALL
  USING (auth.uid()::text IN (
    SELECT id::text FROM users WHERE restaurant_id = promotions.restaurant_id
  ));

-- Real-time
ALTER TABLE public.promotions REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE promotions;

-- Grant
GRANT SELECT ON promotions TO anon, authenticated;

NOTIFY pgrst, 'reload schema';

DO $$ BEGIN
  RAISE NOTICE '✓ تم إنشاء جدول العروض بنجاح!';
END $$;

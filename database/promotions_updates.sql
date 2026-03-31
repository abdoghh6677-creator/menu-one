-- =====================================================
-- إضافة دعم خصومات العروض (نسبة مئوية) على صنف واحد أو على كل الأصناف
-- =====================================================

ALTER TABLE public.promotions
  ADD COLUMN IF NOT EXISTS discount_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS apply_to TEXT NOT NULL DEFAULT 'all',
  ADD COLUMN IF NOT EXISTS menu_item_id UUID;

-- قيد لضمان القيم المتوقعة لـ apply_to
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_promotions_apply_to'
  ) THEN
    ALTER TABLE public.promotions
      ADD CONSTRAINT chk_promotions_apply_to CHECK (apply_to IN ('all', 'item'));
  END IF;
END $$;

-- علاقة اختيارية بصنف معين
DO $$
BEGIN
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

CREATE INDEX IF NOT EXISTS idx_promotions_menu_item_id ON promotions(menu_item_id);

NOTIFY pgrst, 'reload schema';

DO $$ BEGIN
  RAISE NOTICE '✓ تم تحديث جدول العروض لدعم الخصومات على الأصناف.';
END $$;

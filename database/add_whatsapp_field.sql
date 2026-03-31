-- =====================================================
-- إضافة حقل رقم واتساب للمطاعم
-- =====================================================

-- إضافة عمود رقم واتساب للمطاعم
ALTER TABLE public.restaurants
ADD COLUMN IF NOT EXISTS whatsapp_number TEXT;

-- إعادة تحميل الـ schema
NOTIFY pgrst, 'reload schema';

DO $$ BEGIN
  RAISE NOTICE '✅ تم إضافة حقل رقم واتساب للمطاعم';
END $$;
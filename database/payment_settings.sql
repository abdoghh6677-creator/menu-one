-- =====================================================
-- إعدادات الدفع - InstaPay والدفع عند الاستلام
-- شغّل هذا في Supabase SQL Editor
-- =====================================================

ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS payment_settings JSONB DEFAULT '{
    "cash_enabled": true,
    "instapay_enabled": false,
    "instapay_link": "",
    "instapay_whatsapp": ""
  }'::jsonb;

-- تحديث البيانات الموجودة
UPDATE public.restaurants
SET payment_settings = '{
  "cash_enabled": true,
  "instapay_enabled": false,
  "instapay_link": "",
  "instapay_whatsapp": ""
}'::jsonb
WHERE payment_settings IS NULL;

NOTIFY pgrst, 'reload schema';

DO $$ BEGIN
  RAISE NOTICE '✓ تم إضافة إعدادات الدفع بنجاح!';
END $$;

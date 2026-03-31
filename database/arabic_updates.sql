-- =====================================================
-- تحديثات قاعدة البيانات - دعم اللغة العربية وأنواع الطلبات
-- شغّل هذا في Supabase SQL Editor
-- =====================================================

-- 1. إضافة حقول اللغة العربية لجدول menu_items
ALTER TABLE public.menu_items
  ADD COLUMN IF NOT EXISTS name_ar TEXT,
  ADD COLUMN IF NOT EXISTS description_ar TEXT,
  ADD COLUMN IF NOT EXISTS category_ar TEXT;

-- 2. نسخ البيانات الحالية للحقول العربية (للبيانات الموجودة)
UPDATE public.menu_items
SET name_ar = name
WHERE name_ar IS NULL;

-- 3. إضافة عمود أنواع الطلبات لجدول restaurants
ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS order_types_enabled JSONB DEFAULT '{"dine_in": true, "takeaway": true, "delivery": false}'::jsonb;

-- 4. تحديث البيانات الموجودة بالقيم الافتراضية
UPDATE public.restaurants
SET order_types_enabled = '{"dine_in": true, "takeaway": true, "delivery": false}'::jsonb
WHERE order_types_enabled IS NULL;

-- 5. تحديث RLS policy للمنيو لتشمل الحقول الجديدة
-- (لا تغيير مطلوب - السياسات الموجودة تشمل كل الحقول)

-- 6. إعادة تحميل الـ schema
NOTIFY pgrst, 'reload schema';

-- تحقق
DO $$
BEGIN
  RAISE NOTICE '✓ تم إضافة حقول اللغة العربية لجدول menu_items';
  RAISE NOTICE '✓ تم إضافة عمود order_types_enabled لجدول restaurants';
  RAISE NOTICE '✓ جاهز للاستخدام!';
END $$;

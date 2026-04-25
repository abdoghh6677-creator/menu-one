-- =====================================================
-- حل شامل لمشكلة ترجمة الفئات
-- =====================================================
-- هذا السكريبت يضيف حقل category (الإنجليزية) وينسخ البيانات من جدول menu_categories

-- 1. إضافة حقل category الإنجليزي للأصناف
ALTER TABLE public.menu_items
  ADD COLUMN IF NOT EXISTS category TEXT;

-- 2. ملء البيانات من جدول menu_categories
-- نسخ اسم الفئة (name) من menu_categories إلى category_ar في menu_items
UPDATE public.menu_items mi
SET category_ar = mc.name
FROM public.menu_categories mc
WHERE mi.category_id = mc.id
  AND (mi.category_ar IS NULL OR mi.category_ar = '');

-- 3. ملء البيانات الإنجليزية من description في menu_categories
UPDATE public.menu_items mi
SET category = mc.description
FROM public.menu_categories mc
WHERE mi.category_id = mc.id
  AND (mi.category IS NULL OR mi.category = '')
  AND mc.description IS NOT NULL;

-- 4. للأصناف التي لا تملك category_id، نستخدم القيم الموجودة (للتوافق مع البيانات القديمة)
-- هذا للحفاظ على البيانات القديمة التي قد تكون مدخلة يدويًا

-- 5. التحقق من البيانات
SELECT 
  id,
  name,
  name_ar,
  category_id,
  category_ar,
  category,
  created_at
FROM public.menu_items
LIMIT 10;

-- 6. ملخص الإحصائيات
SELECT 
  COUNT(*) as total_items,
  COUNT(CASE WHEN category_ar IS NOT NULL THEN 1 END) as items_with_ar_category,
  COUNT(CASE WHEN category IS NOT NULL THEN 1 END) as items_with_en_category,
  COUNT(CASE WHEN category_id IS NOT NULL THEN 1 END) as items_with_category_id
FROM public.menu_items;

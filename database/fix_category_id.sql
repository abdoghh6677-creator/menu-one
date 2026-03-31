-- إصلاح مشكلة عمود category_id المفقود
-- تشغيل هذا في SQL Editor في Supabase

-- إضافة عمود category_id إلى جدول menu_items إذا لم يكن موجوداً
ALTER TABLE menu_items
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES menu_categories(id) ON DELETE SET NULL;

-- إضافة فهرس للعمود الجديد
CREATE INDEX IF NOT EXISTS idx_menu_items_category_id ON menu_items(category_id);

-- التحقق من وجود الجدول والأعمدة
SELECT
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'menu_items'
  AND column_name IN ('id', 'category_id', 'restaurant_id', 'name')
ORDER BY ordinal_position;
-- إنشاء الجداول الأساسية المطلوبة
-- تشغيل هذا في SQL Editor في Supabase

-- تمكين الامتدادات
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. جدول menu_categories (إذا لم يكن موجوداً)
CREATE TABLE IF NOT EXISTS menu_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(restaurant_id, name)
);

-- 2. إضافة عمود category_id إلى menu_items (إذا لم يكن موجوداً)
ALTER TABLE menu_items
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES menu_categories(id) ON DELETE SET NULL;

-- 3. إضافة فهارس
CREATE INDEX IF NOT EXISTS idx_menu_categories_restaurant_id ON menu_categories(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_category_id ON menu_items(category_id);

-- 4. تفعيل RLS
ALTER TABLE menu_categories ENABLE ROW LEVEL SECURITY;

-- 5. إضافة سياسات RLS
DROP POLICY IF EXISTS "Restaurant owners can manage menu categories" ON menu_categories;
CREATE POLICY "Restaurant owners can manage menu categories" ON menu_categories
  FOR ALL USING (restaurant_id::text = (auth.jwt() ->> 'restaurant_id'));

-- 6. التحقق من النتيجة
SELECT
  'menu_categories' as table_name,
  COUNT(*) as record_count
FROM menu_categories
UNION ALL
SELECT
  'menu_items with category_id' as table_name,
  COUNT(*) as record_count
FROM menu_items
WHERE category_id IS NOT NULL;
# إصلاح خطأ عمود category_id المفقود

## المشكلة
```
ERROR: 42703: column "category_id" does not exist
ERROR: 42P01: relation "menu_categories" does not exist
```

هذا الخطأ يحدث لأن:
1. جدول `menu_categories` غير موجود
2. جدول `menu_items` موجود لكن بدون عمود `category_id`

## الحل السريع

### الخطوة 1: تشغيل SQL الإنشاء
اذهب إلى **Supabase Dashboard → SQL Editor** وانسخ محتوى الملف `database/create_missing_tables.sql` وشغّله:

```sql
-- تمكين الامتدادات
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- إنشاء جدول menu_categories
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

-- إضافة عمود category_id إلى menu_items
ALTER TABLE menu_items
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES menu_categories(id) ON DELETE SET NULL;

-- إضافة فهارس
CREATE INDEX IF NOT EXISTS idx_menu_categories_restaurant_id ON menu_categories(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_category_id ON menu_items(category_id);
```

### الخطوة 2: التحقق من النتيجة
```sql
-- التحقق من وجود الجداول
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('menu_categories', 'menu_items');

-- التحقق من عمود category_id
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'menu_items'
  AND column_name = 'category_id';
```

## ملاحظات مهمة

### ❌ لا تشغّل ملفات README كـ SQL
ملفات `.md` تحتوي على تعليقات markdown (#) وليست SQL صالحة.

### ✅ شغّل الملفات الصحيحة
- `database/create_missing_tables.sql` - لإنشاء الجداول المفقودة
- `database/all_changes.sql` - للإعداد الكامل (إذا لم يتم من قبل)

### 🔍 التحقق من البيانات الحالية
من النتيجة التي قدمتها، جدول `menu_items` موجود مع الأعمدة:
- ✅ `id` (uuid)
- ✅ `name` (text)
- ✅ `base_price` (numeric)
- ❌ `category_id` (مفقود)

بعد تشغيل الإصلاح، ستحصل على:
- ✅ جدول `menu_categories`
- ✅ عمود `category_id` في `menu_items`
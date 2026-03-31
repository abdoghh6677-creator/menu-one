-- التحقق من وجود الجداول والأعمدة المطلوبة

-- التحقق من وجود جدول menu_categories
SELECT 'menu_categories exists' as check_result
WHERE EXISTS (
  SELECT 1 FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name = 'menu_categories'
);

-- التحقق من وجود جدول menu_items
SELECT 'menu_items exists' as check_result
WHERE EXISTS (
  SELECT 1 FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name = 'menu_items'
);

-- التحقق من أعمدة menu_items
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'menu_items'
  AND column_name IN ('id', 'restaurant_id', 'category_id', 'name', 'base_price')
ORDER BY column_name;

-- التحقق من أعمدة menu_categories
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'menu_categories'
  AND column_name IN ('id', 'restaurant_id', 'name', 'description')
ORDER BY column_name;
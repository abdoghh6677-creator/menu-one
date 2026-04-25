-- ===== فحص المطاعم الموجودة =====

-- 1. عرض جميع المطاعم وحالتها
SELECT 
  id,
  name,
  slug,
  is_active,
  owner_id,
  created_at
FROM restaurants
ORDER BY created_at DESC;

-- 2. عرض عدد المطاعم النشطة
SELECT 
  COUNT(*) as total_restaurants,
  SUM(CASE WHEN is_active = true THEN 1 ELSE 0 END) as active_restaurants,
  SUM(CASE WHEN is_active = false THEN 1 ELSE 0 END) as inactive_restaurants
FROM restaurants;

-- 3. عرض جميع الأصناف في كل مطعم
SELECT 
  r.name as restaurant_name,
  r.slug,
  COUNT(mc.id) as categories_count,
  COUNT(mi.id) as menu_items_count
FROM restaurants r
LEFT JOIN menu_categories mc ON r.id = mc.restaurant_id AND mc.is_active = true
LEFT JOIN menu_items mi ON r.id = mi.restaurant_id AND mi.is_available = true
WHERE r.is_active = true
GROUP BY r.id, r.name, r.slug;

-- 4. تفعيل جميع المطاعم (في حالة كانت غير النشطة)
UPDATE restaurants SET is_active = true WHERE is_active = false;

-- 5. التحقق من OID للمالك (في حالة كان هناك مالك)
SELECT 
  id,
  name,
  slug,
  owner_id,
  is_active
FROM restaurants
LIMIT 5;
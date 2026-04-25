-- ===== إضافة مطعم تجريبي للاختبار =====

-- حذف المطعم القديم إن وجد (اختياري)
-- DELETE FROM restaurants WHERE slug = 'test-restaurant';

-- إضافة مطعم جديد
INSERT INTO restaurants (
  name,
  slug,
  description,
  phone,
  email,
  address,
  website,
  logo_url,
  cover_url,
  owner_id,
  is_active,
  order_types_enabled,
  payment_settings,
  whatsapp_number,
  business_hours
) VALUES (
  'مطعم التجربة',
  'test-restaurant',
  'مطعم اختبار',
  '+201000000000',
  'test@restaurant.com',
  'المنصة',
  'https://example.com',
  NULL,
  NULL,
  (SELECT id FROM auth.users LIMIT 1), -- استخدم أول مستخدم
  true,
  '{"dine_in": true, "takeaway": true, "delivery": false}'::jsonb,
  '{"cash_enabled": true, "instapay_enabled": false, "instapay_link": "", "instapay_whatsapp": ""}'::jsonb,
  '+201000000000',
  '{"monday": {"open": "09:00", "close": "22:00", "closed": false}, "tuesday": {"open": "09:00", "close": "22:00", "closed": false}, "wednesday": {"open": "09:00", "close": "22:00", "closed": false}, "thursday": {"open": "09:00", "close": "22:00", "closed": false}, "friday": {"open": "09:00", "close": "22:00", "closed": false}, "saturday": {"open": "09:00", "close": "22:00", "closed": false}, "sunday": {"open": "09:00", "close": "22:00", "closed": false}}'::jsonb
) ON CONFLICT (slug) DO NOTHING;

-- تفعيل جميع المطاعم الموجودة
UPDATE restaurants SET is_active = true;

-- عرض المطاعم المتاحة الآن
SELECT id, name, slug, is_active FROM restaurants;
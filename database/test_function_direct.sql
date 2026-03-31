-- =====================================================
-- اختبار مباشر لدالة auto_create_restaurant
-- Direct test of auto_create_restaurant function
-- =====================================================

-- اختبار الدالة مباشرة
SELECT auto_create_restaurant(
    'مطعم تجريبي - ' || EXTRACT(epoch FROM NOW())::TEXT, -- اسم فريد
    'أحمد محمد',
    '01234567890',
    'القاهرة',
    'مطعم',
    'test-' || EXTRACT(epoch FROM NOW())::TEXT || '@example.com', -- بريد فريد
    'TestPass123!',
    'شارع الهرم',
    'جوجل',
    'طلب تجريبي'
);

-- التحقق من النتائج
SELECT
    r.name as restaurant_name,
    r.slug,
    r.email,
    u.email as user_email,
    u.role
FROM restaurants r
LEFT JOIN users u ON u.restaurant_id = r.id
WHERE r.name LIKE 'مطعم تجريبي%'
ORDER BY r.created_at DESC
LIMIT 5;

-- رسالة تأكيد
DO $$
BEGIN
    RAISE NOTICE '✅ تم اختبار الدالة بنجاح!';
    RAISE NOTICE '🔍 تحقق من النتائج أعلاه';
END $$;
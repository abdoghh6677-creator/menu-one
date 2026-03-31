-- =====================================================
-- اختبار وجود دالة auto_create_restaurant
-- Test if auto_create_restaurant function exists
-- =====================================================

-- التحقق من وجود الدالة
SELECT
    routine_name,
    routine_type,
    data_type as return_type
FROM information_schema.routines
WHERE routine_name = 'auto_create_restaurant'
  AND routine_schema = 'public';

-- التحقق من وجود الجداول المطلوبة
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('restaurants', 'users', 'registration_requests');

-- رسالة تأكيد
DO $$
BEGIN
    RAISE NOTICE '🔍 تم فحص قاعدة البيانات...';
    RAISE NOTICE '📋 تحقق من النتائج أعلاه';
END $$;
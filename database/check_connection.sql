-- =====================================================
-- فحص إعدادات CORS والاتصال
-- Check CORS settings and connection
-- =====================================================

-- فحص الاتصال الأساسي
SELECT version();

-- فحص الامتدادات
SELECT name, default_version, installed_version
FROM pg_available_extensions
WHERE name IN ('uuid-ossp', 'pgcrypto');

-- فحص الجداول
SELECT schemaname, tablename
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('restaurants', 'users', 'registration_requests', 'staff_permissions');

-- فحص الدوال
SELECT proname, pg_get_function_identity_arguments(oid) as args
FROM pg_proc
WHERE proname IN ('auto_create_restaurant', 'restaurant_login')
AND pg_function_is_visible(oid);

-- رسالة تأكيد
DO $$
BEGIN
    RAISE NOTICE '🔍 تم فحص قاعدة البيانات...';
    RAISE NOTICE '📊 تحقق من النتائج أعلاه';
END $$;
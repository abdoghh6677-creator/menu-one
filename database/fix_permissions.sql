-- =====================================================
-- إصلاح صلاحيات الدوال للتسجيل
-- Fix function permissions for registration
-- =====================================================

-- السماح بتنفيذ الدوال للتطوير
GRANT EXECUTE ON FUNCTION auto_create_restaurant(text, text, text, text, text, text, text, text, text, text) TO anon;
GRANT EXECUTE ON FUNCTION restaurant_login(text, text) TO anon;

-- التأكد من وجود الصلاحيات على staff_permissions
DROP POLICY IF EXISTS "Allow all operations for development" ON staff_permissions;
CREATE POLICY "Allow all operations for development" ON staff_permissions FOR ALL USING (true);

-- رسالة تأكيد
DO $$
BEGIN
    RAISE NOTICE '✅ تم إصلاح صلاحيات الدوال!';
    RAISE NOTICE '🚀 الآن يمكن للتطبيق الوصول للدوال';
END $$;
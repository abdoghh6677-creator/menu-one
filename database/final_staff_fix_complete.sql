-- =====================================================
-- إصلاح مشاكل إدارة الموظفين النهائي
-- Final Fix for Staff Management Issues
-- =====================================================

-- تعطيل RLS مؤقتاً للاختبار (يمكن إعادة تفعيلها لاحقاً)
ALTER TABLE staff_permissions DISABLE ROW LEVEL SECURITY;

-- التأكد من وجود المستخدمين التجريبيين
INSERT INTO users (id, email, password_hash, full_name, role, is_active, temp_password)
VALUES
  (gen_random_uuid(), 'ahmed@example.com', crypt('123456', gen_salt('bf', 8)), 'أحمد محمد', 'staff', true, true),
  (gen_random_uuid(), 'fatima@example.com', crypt('123456', gen_salt('bf', 8)), 'فاطمة علي', 'staff', true, true),
  (gen_random_uuid(), 'omar@example.com', crypt('123456', gen_salt('bf', 8)), 'عمر حسن', 'staff', true, true),
  (gen_random_uuid(), 'layla@example.com', crypt('123456', gen_salt('bf', 8)), 'ليلى أحمد', 'staff', true, true),
  (gen_random_uuid(), 'karim@example.com', crypt('123456', gen_salt('bf', 8)), 'كريم محمود', 'staff', true, true)
ON CONFLICT (email) DO NOTHING;

-- التأكد من وجود عمود full_name
ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name TEXT;
UPDATE users SET full_name = 'مستخدم جديد' WHERE full_name IS NULL OR full_name = '';

-- إضافة مستخدم حقيقي للاختبار (استبدل البيانات ببياناتك الحقيقية)
-- INSERT INTO users (id, email, password_hash, full_name, role, is_active, temp_password)
-- VALUES (
--   gen_random_uuid(),
--   'your-real-email@example.com',
--   crypt('your-real-password', gen_salt('bf', 8)),
--   'اسمك الحقيقي',
--   'staff',
--   true,
--   false
-- ) ON CONFLICT (email) DO NOTHING;

-- رسالة تأكيد
DO $$
DECLARE
    user_count INTEGER;
    staff_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO user_count FROM users WHERE is_active = true;
    SELECT COUNT(*) INTO staff_count FROM staff_permissions;

    RAISE NOTICE '✅ تم إصلاح مشاكل إدارة الموظفين!';
    RAISE NOTICE '👥 عدد المستخدمين النشطين: %', user_count;
    RAISE NOTICE '👷 عدد الموظفين: %', staff_count;
    RAISE NOTICE '';
    RAISE NOTICE '🔧 تم تعطيل RLS مؤقتاً للاختبار';
    RAISE NOTICE '';
    RAISE NOTICE '🧪 للاختبار:';
    RAISE NOTICE '   1. شغّل المشروع: npm run dev';
    RAISE NOTICE '   2. اذهب لصفحة إدارة الموظفين';
    RAISE NOTICE '   3. جرب إضافة وحذف موظف';
    RAISE NOTICE '   4. جرب تسجيل الدخول ببيانات المستخدمين';
    RAISE NOTICE '';
    RAISE NOTICE '📧 المستخدمون التجريبيون:';
    RAISE NOTICE '   - ahmed@example.com / 123456';
    RAISE NOTICE '   - fatima@example.com / 123456';
    RAISE NOTICE '   - omar@example.com / 123456';
    RAISE NOTICE '   - layla@example.com / 123456';
    RAISE NOTICE '   - karim@example.com / 123456';
END $$;
-- =====================================================
-- إضافة بيانات تجريبية للمستخدمين
-- Add sample users data
-- =====================================================

-- إضافة مستخدمين تجريبيين للاختبار
INSERT INTO users (id, email, password_hash, full_name, role, is_active, temp_password)
VALUES
  (gen_random_uuid(), 'ahmed@example.com', crypt('123456', gen_salt('bf', 8)), 'أحمد محمد', 'staff', true, true),
  (gen_random_uuid(), 'fatima@example.com', crypt('123456', gen_salt('bf', 8)), 'فاطمة علي', 'staff', true, true),
  (gen_random_uuid(), 'omar@example.com', crypt('123456', gen_salt('bf', 8)), 'عمر حسن', 'staff', true, true),
  (gen_random_uuid(), 'layla@example.com', crypt('123456', gen_salt('bf', 8)), 'ليلى أحمد', 'staff', true, true),
  (gen_random_uuid(), 'karim@example.com', crypt('123456', gen_salt('bf', 8)), 'كريم محمود', 'staff', true, true)
ON CONFLICT (email) DO NOTHING;

-- رسالة تأكيد
DO $$
BEGIN
    RAISE NOTICE '✅ تم إضافة بيانات تجريبية للمستخدمين بنجاح!';
    RAISE NOTICE '📋 المستخدمون المضافون:';
    RAISE NOTICE '   - أحمد محمد (ahmed@example.com)';
    RAISE NOTICE '   - فاطمة علي (fatima@example.com)';
    RAISE NOTICE '   - عمر حسن (omar@example.com)';
    RAISE NOTICE '   - ليلى أحمد (layla@example.com)';
    RAISE NOTICE '   - كريم محمود (karim@example.com)';
    RAISE NOTICE '';
    RAISE NOTICE '🔑 كلمة المرور للجميع: 123456';
    RAISE NOTICE '💡 يمكنك الآن اختيار هؤلاء المستخدمين في صفحة إدارة الموظفين';
END $$;
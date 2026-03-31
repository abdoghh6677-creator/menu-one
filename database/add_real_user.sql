-- =====================================================
-- إضافة مستخدم حقيقي جديد
-- Add New Real User
-- =====================================================

-- استبدل هذه البيانات ببيانات المستخدم الحقيقي
-- Replace these values with the real user data

INSERT INTO users (
  id,
  email,
  password_hash,
  full_name,
  role,
  is_active,
  temp_password,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(), -- سيتم إنشاء UUID تلقائياً
  'user@example.com', -- استبدل بالبريد الإلكتروني الحقيقي
  crypt('password123', gen_salt('bf', 8)), -- استبدل بكلمة المرور الحقيقية
  'اسم المستخدم الحقيقي', -- استبدل بالاسم الحقيقي
  'staff', -- يمكن تغييره إلى 'owner' أو 'manager'
  true, -- تفعيل الحساب
  false, -- كلمة مرور دائمة (ليس مؤقتة)
  NOW(),
  NOW()
) ON CONFLICT (email) DO NOTHING;

-- لإضافة المستخدم كموظف في مطعم معين، قم بتشغيل هذا الاستعلام بعد إضافة المستخدم:
-- (استبدل RESTAURANT_ID_HERE بمعرف المطعم الحقيقي)

-- INSERT INTO staff_permissions (
--   restaurant_id,
--   user_id,
--   email,
--   role,
--   can_view_orders,
--   can_view_menu,
--   can_manage_staff
-- ) VALUES (
--   'RESTAURANT_ID_HERE', -- معرف المطعم
--   (SELECT id FROM users WHERE email = 'user@example.com'), -- معرف المستخدم الجديد
--   'user@example.com', -- البريد الإلكتروني
--   'staff', -- الدور
--   true, -- يمكنه رؤية الطلبات
--   true, -- يمكنه رؤية القائمة
--   false -- لا يمكنه إدارة الموظفين
-- );

-- رسالة تأكيد
DO $$
DECLARE
    new_user_id UUID;
BEGIN
    -- جلب معرف المستخدم الجديد
    SELECT id INTO new_user_id FROM users WHERE email = 'user@example.com';

    RAISE NOTICE '✅ تم إضافة المستخدم بنجاح!';
    RAISE NOTICE '👤 اسم المستخدم: اسم المستخدم الحقيقي';
    RAISE NOTICE '📧 البريد الإلكتروني: user@example.com';
    RAISE NOTICE '🔑 كلمة المرور: password123';
    RAISE NOTICE '🆔 معرف المستخدم: %', new_user_id;
    RAISE NOTICE '';
    RAISE NOTICE '💡 لإضافة هذا المستخدم كموظف في مطعم:';
    RAISE NOTICE '   1. اذهب إلى صفحة إدارة الموظفين';
    RAISE NOTICE '   2. اضغط "إضافة موظف"';
    RAISE NOTICE '   3. اختر المستخدم من القائمة';
    RAISE NOTICE '   4. حدد الصلاحيات المطلوبة';
END $$;
-- =====================================================
-- إضافة مستخدم حقيقي واحد - مثال
-- Add One Real User - Example
-- =====================================================

-- ⚠️ استبدل هذه البيانات ببياناتك الحقيقية ⚠️

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
  gen_random_uuid(),
  'mohamed@example.com',           -- ← غيّر هذا لبريدك الحقيقي
  crypt('mypassword123', gen_salt('bf', 8)),  -- ← غيّر هذا لكلمة مرورك
  'محمد أحمد',                     -- ← غيّر هذا لاسمك الحقيقي
  'staff',                         -- يمكن تغييره لـ 'owner' أو 'manager'
  true,
  false,                           -- كلمة مرور دائمة
  NOW(),
  NOW()
) ON CONFLICT (email) DO NOTHING;

-- رسالة تأكيد
DO $$
DECLARE
    new_user_id UUID;
    new_user_email TEXT := 'mohamed@example.com';  -- ← غيّر هذا لبريدك الحقيقي
BEGIN
    SELECT id INTO new_user_id FROM users WHERE email = new_user_email;

    IF new_user_id IS NOT NULL THEN
        RAISE NOTICE '✅ تم إضافة المستخدم بنجاح!';
        RAISE NOTICE '👤 الاسم: محمد أحمد';
        RAISE NOTICE '📧 البريد: mohamed@example.com';
        RAISE NOTICE '🔑 كلمة المرور: mypassword123';
        RAISE NOTICE '🆔 المعرف: %', new_user_id;
        RAISE NOTICE '';
        RAISE NOTICE '📋 الخطوات التالية:';
        RAISE NOTICE '   1. شغّل المشروع: npm run dev';
        RAISE NOTICE '   2. اذهب لصفحة إدارة الموظفين';
        RAISE NOTICE '   3. أضف هذا المستخدم كموظف';
        RAISE NOTICE '   4. جرب تسجيل الدخول به';
    ELSE
        RAISE NOTICE '❌ فشل في إضافة المستخدم - ربما البريد مستخدم مسبقاً';
    END IF;
END $$;
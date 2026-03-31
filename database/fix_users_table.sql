-- =====================================================
-- إصلاح مشكلة جدول users - إضافة full_name
-- Fix users table - Add full_name column
-- =====================================================

-- إضافة عمود full_name إلى جدول users
ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name TEXT;

-- تحديث البيانات الموجودة
UPDATE users SET full_name = 'مستخدم جديد' WHERE full_name IS NULL;

-- التأكد من أن العمود غير فارغ
ALTER TABLE users ALTER COLUMN full_name SET DEFAULT 'مستخدم جديد';
ALTER TABLE users ALTER COLUMN full_name SET NOT NULL;

-- رسالة تأكيد
DO $$
BEGIN
    RAISE NOTICE '✅ تم إضافة عمود full_name إلى جدول users بنجاح!';
    RAISE NOTICE '📋 التغييرات:';
    RAISE NOTICE '   ✅ إضافة عمود full_name';
    RAISE NOTICE '   ✅ تحديث البيانات الموجودة';
    RAISE NOTICE '   ✅ تعيين قيمة افتراضية';
END $$;
-- =====================================================
-- إصلاح مشكلة عمود restaurant_type المفقود
-- Fix missing restaurant_type column issue
-- =====================================================

-- إضافة عمود restaurant_type إذا لم يكن موجوداً
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS restaurant_type TEXT;

-- تحديث البيانات الموجودة بالقيمة الافتراضية
UPDATE restaurants SET restaurant_type = 'مطعم' WHERE restaurant_type IS NULL;

-- رسالة تأكيد
DO $$
BEGIN
    RAISE NOTICE '✅ تم إصلاح مشكلة عمود restaurant_type!';
    RAISE NOTICE '✅ النظام جاهز للتسجيل التلقائي!';
END $$;
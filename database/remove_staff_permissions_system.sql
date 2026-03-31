-- =====================================================
-- إزالة نظام صلاحيات الموظفين نهائياً
-- Remove Staff Permissions System Completely
-- =====================================================

-- ⚠️ تحذير: هذا الملف سيحذف نظام الصلاحيات بالكامل ⚠️
-- Warning: This file will completely remove the permissions system

-- حذف الجدول staff_permissions
DROP TABLE IF EXISTS staff_permissions CASCADE;

-- حذف النوع المخصص إذا كان موجوداً
DROP TYPE IF EXISTS staff_role CASCADE;

-- رسالة تأكيد
DO $$
BEGIN
    RAISE NOTICE '✅ تم حذف نظام صلاحيات الموظفين بنجاح!';
    RAISE NOTICE '';
    RAISE NOTICE '📋 الخطوات التالية:';
    RAISE NOTICE '   1. قم بتحديث الكود لإزالة دوال الصلاحيات';
    RAISE NOTICE '   2. أعد تشغيل المشروع: npm run dev';
    RAISE NOTICE '   3. اختبر النظام - جميع الموظفين الآن لديهم نفس الصلاحيات';
    RAISE NOTICE '';
    RAISE NOTICE '🔄 إذا كنت تريد إعادة النظام، قم بتشغيل final_staff_fix_complete.sql مرة أخرى';
END $$;
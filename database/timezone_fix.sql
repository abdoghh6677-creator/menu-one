-- إعداد المنطقة الزمنية لمصر (القاهرة)
-- تشغيل هذا في SQL Editor في Supabase

-- تعيين المنطقة الزمنية للجلسة الحالية
SET TIME ZONE 'Africa/Cairo';

-- تحديث إعدادات قاعدة البيانات لتستخدم التوقيت المصري
ALTER DATABASE postgres SET timezone = 'Africa/Cairo';

-- التأكد من أن الدوال تستخدم التوقيت الصحيح
-- يمكنك إضافة هذا إلى أي دالة تحتاج تحويل توقيت
-- مثال: SELECT NOW() AT TIME ZONE 'Africa/Cairo';

-- للتحقق من التوقيت الحالي
SELECT NOW(), NOW() AT TIME ZONE 'Africa/Cairo';
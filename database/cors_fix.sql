-- =====================================================
-- إصلاح إعدادات CORS للمطورين
-- Fix CORS settings for developers
-- =====================================================

-- إنشاء function لتجاوز CORS مؤقتاً للتطوير
CREATE OR REPLACE FUNCTION cors_headers()
RETURNS text
LANGUAGE plpgsql
AS $$
BEGIN
    -- هذا للاستخدام في development فقط
    RETURN 'Access-Control-Allow-Origin: *';
END;
$$;

-- رسالة تأكيد
DO $$
BEGIN
    RAISE NOTICE '⚠️  تأكد من إعدادات CORS في Supabase Dashboard!';
    RAISE NOTICE '📍 اذهب إلى: Settings → API → CORS';
    RAISE NOTICE '✅ أضف localhost:5175 إلى Allowed Origins';
    RAISE NOTICE '✅ أو استخدم * للتطوير (غير آمن للإنتاج)';
END $$;
-- =====================================================
-- تشغيل دالة التسجيل التلقائي
-- Execute auto registration function
-- =====================================================

-- تشغيل الدالة للتأكد من عملها
SELECT auto_create_restaurant(
    'مطعم تجريبي', -- p_restaurant_name
    'أحمد محمد',   -- p_owner_name
    '01234567890', -- p_phone
    'القاهرة',     -- p_city
    'مطعم',        -- p_restaurant_type
    'test@example.com', -- p_email (اختياري)
    'شارع الهرم',  -- p_address (اختياري)
    'جوجل',        -- p_heard_from (اختياري)
    'طلب تجريبي'   -- p_notes (اختياري)
);

-- رسالة تأكيد
DO $$
BEGIN
    RAISE NOTICE '✓ تم اختبار دالة التسجيل التلقائي بنجاح!';
    RAISE NOTICE '✓ يمكنك الآن تشغيل المشروع وتجربة التسجيل!';
END $$;
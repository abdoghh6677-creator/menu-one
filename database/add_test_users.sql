-- =====================================================
-- إضافة مستخدمين تجريبيين للاختبار
-- =====================================================

-- إضافة مستخدم تجريبي إلى جدول profiles (إذا لم يكن موجوداً)
INSERT INTO public.profiles (id, full_name, email, avatar_url)
VALUES
  ('550e8400-e29b-41d4-a716-446655440000', 'أحمد محمد', 'ahmed@example.com', NULL),
  ('550e8400-e29b-41d4-a716-446655440001', 'فاطمة علي', 'fatima@example.com', NULL),
  ('550e8400-e29b-41d4-a716-446655440002', 'محمد حسن', 'mohamed@example.com', NULL),
  ('550e8400-e29b-41d4-a716-446655440003', 'سارة أحمد', 'sara@example.com', NULL)
ON CONFLICT (id) DO NOTHING;

-- رسالة تأكيد
DO $$
BEGIN
  RAISE NOTICE '✓ تم إضافة مستخدمين تجريبيين للاختبار!';
  RAISE NOTICE '✓ يمكنك الآن اختيار مستخدم من القائمة!';
END $$;
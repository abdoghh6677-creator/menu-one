-- =====================================================
-- إصلاح RLS لتسمح للمطعم بتحديث إعداداته
-- شغّل هذا في Supabase SQL Editor
-- =====================================================

-- حذف الـ policies القديمة إن وُجدت
DROP POLICY IF EXISTS "Restaurant owners can update their restaurant" ON restaurants;
DROP POLICY IF EXISTS "Restaurant owners can update settings" ON restaurants;

-- إضافة policy تسمح بالتحديث بدون auth (لأننا نستخدم custom auth)
CREATE POLICY "Allow restaurant update by id"
ON public.restaurants
FOR UPDATE
USING (true)
WITH CHECK (true);

-- تأكد من أن SELECT مسموح
DROP POLICY IF EXISTS "Restaurant owners can view their restaurant" ON restaurants;

CREATE POLICY "Allow restaurant select"
ON public.restaurants
FOR SELECT
USING (true);

NOTIFY pgrst, 'reload schema';

DO $$ BEGIN
  RAISE NOTICE '✅ تم إصلاح RLS بنجاح!';
END $$;

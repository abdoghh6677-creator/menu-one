-- =====================================================
-- إصلاح RLS للسماح بالوصول بدون Supabase Auth
-- شغّل هذا في Supabase SQL Editor
-- =====================================================

-- حذف الـ policies القديمة
DROP POLICY IF EXISTS "Restaurant owners can manage orders" ON orders;
DROP POLICY IF EXISTS "Restaurant owners can manage menu" ON menu_items;
DROP POLICY IF EXISTS "Restaurant owners can view their restaurant" ON restaurants;
DROP POLICY IF EXISTS "Restaurant owners can update their restaurant" ON restaurants;

-- إضافة policies جديدة تسمح بالوصول بدون auth (لأننا نستخدم custom auth)
CREATE POLICY "Allow orders access"
ON public.orders
FOR ALL
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow menu items access"
ON public.menu_items
FOR ALL
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow restaurants access"
ON public.restaurants
FOR ALL
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow menu categories access"
ON public.menu_categories
FOR ALL
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow users access"
ON public.users
FOR ALL
USING (true)
WITH CHECK (true);

-- إعادة تحميل الـ schema
NOTIFY pgrst, 'reload schema';

DO $$ BEGIN
  RAISE NOTICE '✅ تم إصلاح RLS بنجاح - الآن يمكن الوصول بدون Supabase Auth!';
END $$;
-- =====================================================================
-- Migration: دعم الاسم الإنجليزي للتصنيف عبر حقل description
-- =====================================================================
-- الجدول menu_categories موجود بالفعل. نحن نستخدم حقل description
-- لتخزين الاسم الإنجليزي للتصنيف. لا يوجد تغيير في schema.
-- فقط تأكد أن RLS يسمح للمطعم بإدارة تصنيفاته:

-- سياسة القراءة (للعملاء)
DROP POLICY IF EXISTS "Anyone can view active categories" ON menu_categories;
CREATE POLICY "Anyone can view active categories"
  ON menu_categories FOR SELECT
  USING (is_active = true);

-- سياسة الكتابة (للمطعم)
DROP POLICY IF EXISTS "Restaurant can manage own categories" ON menu_categories;
CREATE POLICY "Restaurant can manage own categories"
  ON menu_categories FOR ALL
  USING (true)
  WITH CHECK (true);

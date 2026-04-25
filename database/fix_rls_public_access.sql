-- إصلاح RLS للسماح بالوصول العام لقراءة البيانات

-- ===== RESTAURANTS TABLE =====
-- السماح بقراءة المطاعم النشطة للجميع
ALTER TABLE restaurants DISABLE ROW LEVEL SECURITY;
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;

-- سياسة قراءة عامة للمطاعم النشطة
CREATE POLICY "Allow public read restaurants" ON restaurants
  FOR SELECT
  USING (is_active = true);

-- سياسة للمالكين للقراءة والتحديث
CREATE POLICY "Restaurant owners can manage restaurants" ON restaurants
  FOR ALL
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- ===== MENU_ITEMS TABLE =====
-- السماح بقراءة الأصناف المتاحة للجميع
ALTER TABLE menu_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;

-- سياسة قراءة عامة للأصناف المتاحة
CREATE POLICY "Allow public read menu_items" ON menu_items
  FOR SELECT
  USING (is_available = true);

-- سياسة للمالكين
CREATE POLICY "Restaurant staff can manage menu_items" ON menu_items
  FOR ALL
  USING (
    restaurant_id IN (
      SELECT id FROM restaurants WHERE owner_id = auth.uid()
    )
  )
  WITH CHECK (
    restaurant_id IN (
      SELECT id FROM restaurants WHERE owner_id = auth.uid()
    )
  );

-- ===== MENU_CATEGORIES TABLE =====
ALTER TABLE menu_categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE menu_categories ENABLE ROW LEVEL SECURITY;

-- سياسة قراءة عامة للتصنيفات النشطة
CREATE POLICY "Allow public read menu_categories" ON menu_categories
  FOR SELECT
  USING (is_active = true);

-- سياسة للمالكين
CREATE POLICY "Restaurant staff can manage categories" ON menu_categories
  FOR ALL
  USING (
    restaurant_id IN (
      SELECT id FROM restaurants WHERE owner_id = auth.uid()
    )
  )
  WITH CHECK (
    restaurant_id IN (
      SELECT id FROM restaurants WHERE owner_id = auth.uid()
    )
  );

-- ===== PROMOTIONS TABLE =====
ALTER TABLE promotions DISABLE ROW LEVEL SECURITY;
ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;

-- سياسة قراءة عامة للعروض النشطة
CREATE POLICY "Allow public read promotions" ON promotions
  FOR SELECT
  USING (is_active = true);

-- سياسة للمالكين
CREATE POLICY "Restaurant staff can manage promotions" ON promotions
  FOR ALL
  USING (
    restaurant_id IN (
      SELECT id FROM restaurants WHERE owner_id = auth.uid()
    )
  )
  WITH CHECK (
    restaurant_id IN (
      SELECT id FROM restaurants WHERE owner_id = auth.uid()
    )
  );

-- ===== ORDERS TABLE =====
-- السماح بالعملاء بقراءة طلباتهم فقط (بدون RLS للقراءة العامة)
ALTER TABLE orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- سياسة الإدراج للجميع (العملاء يمكنهم إنشاء طلبات)
CREATE POLICY "Allow public insert orders" ON orders
  FOR INSERT
  WITH CHECK (true);

-- سياسة القراءة (العملاء يقرؤون بـ order ID من الرابط)
CREATE POLICY "Allow public read orders by id" ON orders
  FOR SELECT
  USING (true);

-- سياسة التحديث للمالكين فقط
CREATE POLICY "Restaurant staff can update orders" ON orders
  FOR UPDATE
  USING (
    restaurant_id IN (
      SELECT id FROM restaurants WHERE owner_id = auth.uid()
    )
  )
  WITH CHECK (
    restaurant_id IN (
      SELECT id FROM restaurants WHERE owner_id = auth.uid()
    )
  );

-- ===== VERIFY POLICIES =====
-- تحقق من السياسات المضافة
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  qual,
  with_check
FROM pg_policies
WHERE tablename IN ('restaurants', 'menu_items', 'menu_categories', 'promotions', 'orders')
ORDER BY tablename, policyname;
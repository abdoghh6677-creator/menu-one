-- ============================================================
-- Migration: Staff Permissions + Inventory + Manual Orders
-- شغّل هذا في Supabase SQL Editor مرة واحدة
-- ============================================================

-- 1. إضافة عمود full_name للمستخدمين إن لم يكن موجوداً
ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name TEXT;

-- 2. جدول صلاحيات الموظفين (يُنشأ إن لم يكن موجوداً)
CREATE TABLE IF NOT EXISTS staff_permissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT DEFAULT 'staff' CHECK (role IN ('owner', 'manager', 'cashier', 'staff')),
  -- الطلبات
  can_view_orders BOOLEAN DEFAULT true,
  can_accept_orders BOOLEAN DEFAULT true,
  can_reject_orders BOOLEAN DEFAULT false,
  can_complete_orders BOOLEAN DEFAULT true,
  can_edit_orders BOOLEAN DEFAULT false,
  can_create_manual_orders BOOLEAN DEFAULT false,
  -- المنيو
  can_view_menu BOOLEAN DEFAULT true,
  can_edit_menu BOOLEAN DEFAULT false,
  can_add_menu_items BOOLEAN DEFAULT false,
  can_delete_menu_items BOOLEAN DEFAULT false,
  -- المخزون
  can_view_inventory BOOLEAN DEFAULT false,
  can_edit_inventory BOOLEAN DEFAULT false,
  -- التقارير
  can_view_reports BOOLEAN DEFAULT false,
  can_export_data BOOLEAN DEFAULT false,
  -- العروض
  can_view_promotions BOOLEAN DEFAULT false,
  can_manage_promotions BOOLEAN DEFAULT false,
  -- الإعدادات
  can_view_settings BOOLEAN DEFAULT false,
  can_edit_settings BOOLEAN DEFAULT false,
  -- الموظفون
  can_manage_staff BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(restaurant_id, user_id)
);

-- 3. إضافة أعمدة مخزون على menu_items
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS track_inventory BOOLEAN DEFAULT false;
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS stock_quantity INTEGER DEFAULT NULL;
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS low_stock_threshold INTEGER DEFAULT 5;

-- 4. جدول مخزون المواد الخام (Raw Materials)
CREATE TABLE IF NOT EXISTS raw_materials (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  unit TEXT NOT NULL DEFAULT 'قطعة',
  current_stock DECIMAL(10,3) NOT NULL DEFAULT 0,
  minimum_stock DECIMAL(10,3) NOT NULL DEFAULT 0,
  cost_per_unit DECIMAL(10,2) DEFAULT 0,
  supplier_name TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. جدول ربط المواد الخام بأصناف المنيو
CREATE TABLE IF NOT EXISTS menu_item_ingredients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  menu_item_id UUID NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  raw_material_id UUID NOT NULL REFERENCES raw_materials(id) ON DELETE CASCADE,
  quantity_used DECIMAL(10,3) NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(menu_item_id, raw_material_id)
);

-- 6. جدول حركات المخزون (سجل التعديلات)
CREATE TABLE IF NOT EXISTS inventory_movements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  material_id UUID REFERENCES raw_materials(id) ON DELETE SET NULL,
  menu_item_id UUID REFERENCES menu_items(id) ON DELETE SET NULL,
  movement_type TEXT NOT NULL CHECK (movement_type IN ('in', 'out', 'adjustment')),
  quantity DECIMAL(10,3) NOT NULL,
  reason TEXT,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. دالة إنشاء مستخدم موظف جديد
CREATE OR REPLACE FUNCTION create_staff_user(
  p_restaurant_id UUID,
  p_email TEXT,
  p_password_hash TEXT,
  p_full_name TEXT,
  p_role TEXT DEFAULT 'staff'
)
RETURNS TABLE(user_id UUID, success BOOLEAN, message TEXT)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_user_id UUID;
BEGIN
  INSERT INTO users (restaurant_id, email, password_hash, full_name, temp_password, role)
  VALUES (p_restaurant_id, p_email, p_password_hash, p_full_name, TRUE, 'staff')
  RETURNING id INTO v_user_id;

  RETURN QUERY SELECT v_user_id, TRUE, 'تم إنشاء الموظف بنجاح'::TEXT;
EXCEPTION WHEN unique_violation THEN
  RETURN QUERY SELECT NULL::UUID, FALSE, 'البريد الإلكتروني مستخدم بالفعل'::TEXT;
WHEN OTHERS THEN
  RETURN QUERY SELECT NULL::UUID, FALSE, SQLERRM;
END; $$;

-- 8. RLS
ALTER TABLE staff_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE raw_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_item_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_permissions_all" ON staff_permissions;
CREATE POLICY "staff_permissions_all" ON staff_permissions FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "raw_materials_all" ON raw_materials;
CREATE POLICY "raw_materials_all" ON raw_materials FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "menu_item_ingredients_all" ON menu_item_ingredients;
CREATE POLICY "menu_item_ingredients_all" ON menu_item_ingredients FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "inventory_movements_all" ON inventory_movements;
CREATE POLICY "inventory_movements_all" ON inventory_movements FOR ALL USING (true) WITH CHECK (true);

-- فهارس للأداء
CREATE INDEX IF NOT EXISTS idx_staff_permissions_restaurant ON staff_permissions(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_staff_permissions_user ON staff_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_raw_materials_restaurant ON raw_materials(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_ingredients_menu_item ON menu_item_ingredients(menu_item_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_restaurant ON inventory_movements(restaurant_id);

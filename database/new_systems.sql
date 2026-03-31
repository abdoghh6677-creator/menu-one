-- ================================================================
-- Migration: نظام الصلاحيات + المخزون + الطلب اليدوي
-- شغّل هذا الملف مرة واحدة في Supabase SQL Editor
-- ================================================================

-- 1. إضافة حقل full_name للمستخدمين
ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name TEXT;

-- 2. جدول صلاحيات الموظفين (يحل محل القديم تماماً)
DROP TABLE IF EXISTS staff_permissions CASCADE;
CREATE TABLE staff_permissions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role        TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('manager','cashier','staff')),
  -- الطلبات
  can_view_orders     BOOLEAN NOT NULL DEFAULT true,
  can_accept_orders   BOOLEAN NOT NULL DEFAULT false,
  can_reject_orders   BOOLEAN NOT NULL DEFAULT false,
  can_complete_orders BOOLEAN NOT NULL DEFAULT false,
  can_create_manual_order BOOLEAN NOT NULL DEFAULT false,
  -- المنيو
  can_view_menu       BOOLEAN NOT NULL DEFAULT true,
  can_edit_menu       BOOLEAN NOT NULL DEFAULT false,
  can_add_menu_items  BOOLEAN NOT NULL DEFAULT false,
  can_delete_menu_items BOOLEAN NOT NULL DEFAULT false,
  -- المخزون
  can_view_inventory  BOOLEAN NOT NULL DEFAULT false,
  can_edit_inventory  BOOLEAN NOT NULL DEFAULT false,
  -- التقارير
  can_view_reports    BOOLEAN NOT NULL DEFAULT false,
  -- العروض
  can_view_promotions BOOLEAN NOT NULL DEFAULT false,
  can_manage_promotions BOOLEAN NOT NULL DEFAULT false,
  -- الإعدادات
  can_view_settings   BOOLEAN NOT NULL DEFAULT false,
  can_edit_settings   BOOLEAN NOT NULL DEFAULT false,
  -- إدارة الموظفين (للمالك فقط)
  can_manage_staff    BOOLEAN NOT NULL DEFAULT false,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(restaurant_id, user_id)
);

CREATE INDEX idx_sp_restaurant ON staff_permissions(restaurant_id);
CREATE INDEX idx_sp_user       ON staff_permissions(user_id);

ALTER TABLE staff_permissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sp_all" ON staff_permissions;
CREATE POLICY "sp_all" ON staff_permissions FOR ALL USING (true) WITH CHECK (true);

-- 3. جدول المخزون البسيط (كمية على الصنف)
ALTER TABLE menu_items
  ADD COLUMN IF NOT EXISTS track_inventory  BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS stock_quantity   INTEGER CHECK (stock_quantity IS NULL OR stock_quantity >= 0),
  ADD COLUMN IF NOT EXISTS min_stock_alert  INTEGER DEFAULT 5,
  ADD COLUMN IF NOT EXISTS name_ar          TEXT,
  ADD COLUMN IF NOT EXISTS description_ar   TEXT,
  ADD COLUMN IF NOT EXISTS category_ar      TEXT,
  ADD COLUMN IF NOT EXISTS category         TEXT,
  ADD COLUMN IF NOT EXISTS sizes            JSONB  DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS addons           JSONB  DEFAULT '[]'::jsonb;

-- 4. جدول المخزون المتقدم (مواد خام)
CREATE TABLE IF NOT EXISTS inventory_ingredients (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  unit          TEXT NOT NULL DEFAULT 'kg',
  current_qty   NUMERIC(10,3) NOT NULL DEFAULT 0 CHECK (current_qty >= 0),
  min_qty       NUMERIC(10,3) NOT NULL DEFAULT 0,
  cost_per_unit NUMERIC(10,2),
  supplier_name TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ing_restaurant ON inventory_ingredients(restaurant_id);
ALTER TABLE inventory_ingredients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ing_all" ON inventory_ingredients;
CREATE POLICY "ing_all" ON inventory_ingredients FOR ALL USING (true) WITH CHECK (true);

-- 5. جدول ربط الأصناف بالمكونات (recipe)
CREATE TABLE IF NOT EXISTS item_ingredients (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_item_id    UUID NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  ingredient_id   UUID NOT NULL REFERENCES inventory_ingredients(id) ON DELETE CASCADE,
  qty_per_unit    NUMERIC(10,3) NOT NULL DEFAULT 1,
  UNIQUE(menu_item_id, ingredient_id)
);

ALTER TABLE item_ingredients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ii_all" ON item_ingredients;
CREATE POLICY "ii_all" ON item_ingredients FOR ALL USING (true) WITH CHECK (true);

-- 6. جدول حركات المخزون (log)
CREATE TABLE IF NOT EXISTS inventory_movements (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  ingredient_id UUID REFERENCES inventory_ingredients(id) ON DELETE SET NULL,
  menu_item_id  UUID REFERENCES menu_items(id) ON DELETE SET NULL,
  movement_type TEXT NOT NULL CHECK (movement_type IN ('in','out','adjust','order_deduct')),
  qty           NUMERIC(10,3) NOT NULL,
  note          TEXT,
  created_by    UUID REFERENCES users(id) ON DELETE SET NULL,
  order_id      UUID REFERENCES orders(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mov_restaurant  ON inventory_movements(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_mov_ingredient  ON inventory_movements(ingredient_id);
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "mov_all" ON inventory_movements;
CREATE POLICY "mov_all" ON inventory_movements FOR ALL USING (true) WITH CHECK (true);

-- 7. إنشاء موظف جديد (owner يستخدمها)
CREATE OR REPLACE FUNCTION create_staff_user(
  p_restaurant_id UUID,
  p_email         TEXT,
  p_password_hash TEXT,
  p_full_name     TEXT,
  p_role          TEXT DEFAULT 'staff'
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_id UUID;
BEGIN
  INSERT INTO users (restaurant_id, email, password_hash, full_name, role, temp_password, is_active)
  VALUES (p_restaurant_id, LOWER(p_email), p_password_hash, p_full_name, 'staff', true, true)
  RETURNING id INTO v_id;

  INSERT INTO staff_permissions (restaurant_id, user_id, role,
    can_view_orders, can_accept_orders, can_reject_orders, can_complete_orders,
    can_create_manual_order, can_view_menu, can_view_inventory)
  VALUES (p_restaurant_id, v_id, p_role,
    true, p_role IN ('manager','cashier'), p_role = 'manager', p_role IN ('manager','cashier'),
    p_role IN ('manager','cashier'), true, p_role = 'manager');

  RETURN v_id;
END; $$;

-- 8. دالة خصم المخزون عند إنشاء طلب
CREATE OR REPLACE FUNCTION deduct_inventory_on_order(p_order_id UUID)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_order orders%ROWTYPE;
  v_item  JSONB;
  v_menu_item_id UUID;
  v_qty  INTEGER;
  v_ing  RECORD;
BEGIN
  SELECT * INTO v_order FROM orders WHERE id = p_order_id;
  IF NOT FOUND THEN RETURN; END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(v_order.items)
  LOOP
    v_menu_item_id := (v_item->>'menu_item_id')::UUID;
    v_qty          := COALESCE((v_item->>'quantity')::INTEGER, 1);

    -- خصم المخزون البسيط (stock_quantity)
    UPDATE menu_items
    SET stock_quantity = GREATEST(0, stock_quantity - v_qty)
    WHERE id = v_menu_item_id AND track_inventory = true AND stock_quantity IS NOT NULL;

    -- خصم المكونات
    FOR v_ing IN
      SELECT ii.ingredient_id, ii.qty_per_unit
      FROM item_ingredients ii WHERE ii.menu_item_id = v_menu_item_id
    LOOP
      UPDATE inventory_ingredients
      SET current_qty = GREATEST(0, current_qty - (v_ing.qty_per_unit * v_qty)),
          updated_at  = NOW()
      WHERE id = v_ing.ingredient_id;

      INSERT INTO inventory_movements
        (restaurant_id, ingredient_id, menu_item_id, movement_type, qty, note, order_id)
      VALUES
        (v_order.restaurant_id, v_ing.ingredient_id, v_menu_item_id,
         'order_deduct', v_ing.qty_per_unit * v_qty, 'خصم تلقائي من طلب', p_order_id);
    END LOOP;
  END LOOP;
END; $$;

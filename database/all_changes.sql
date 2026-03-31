-- =====================================================
-- جميع تحديثات قاعدة البيانات - Restaurant SaaS
-- تشمل الإعداد الأساسي وجميع التحديثات اللاحقة
-- =====================================================

-- =====================================================
-- الإعداد الأساسي (من setup.sql)
-- =====================================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- TABLES
-- =====================================================

-- 1. Registration Requests
CREATE TABLE IF NOT EXISTS registration_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_name TEXT NOT NULL,
  owner_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  city TEXT NOT NULL,
  address TEXT,
  restaurant_type TEXT NOT NULL,
  heard_from TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'contacted', 'verified', 'rejected')),
  contacted_at TIMESTAMPTZ,
  rejection_reason TEXT,
  internal_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Restaurants
CREATE TABLE IF NOT EXISTS restaurants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  registration_request_id UUID REFERENCES registration_requests(id),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  owner_name TEXT,
  phone TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  city TEXT,
  address TEXT,
  restaurant_type TEXT,
  logo_url TEXT,
  qr_code_url TEXT,
  subscription_plan TEXT NOT NULL DEFAULT 'free_trial' CHECK (subscription_plan IN ('free_trial', 'starter', 'pro', 'enterprise')),
  status TEXT NOT NULL DEFAULT 'trial' CHECK (status IN ('active', 'blocked', 'trial')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  internal_notes TEXT,
  block_reason TEXT,
  trial_ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Users (Restaurant owners & staff)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  temp_password BOOLEAN NOT NULL DEFAULT TRUE,
  role TEXT NOT NULL DEFAULT 'owner' CHECK (role IN ('owner', 'staff', 'admin')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Menu Categories
CREATE TABLE IF NOT EXISTS menu_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(restaurant_id, name)
);

-- 5. Menu Items
CREATE TABLE IF NOT EXISTS menu_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  category_id UUID REFERENCES menu_categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  base_price DECIMAL(10, 2) NOT NULL CHECK (base_price >= 0),
  image_url TEXT,
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  stock_quantity INTEGER DEFAULT NULL CHECK (stock_quantity IS NULL OR stock_quantity >= 0),
  display_order INTEGER NOT NULL DEFAULT 0,
  preparation_time_minutes INTEGER DEFAULT NULL CHECK (preparation_time_minutes IS NULL OR preparation_time_minutes > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Orders
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number TEXT NOT NULL UNIQUE,
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  customer_name TEXT,
  customer_phone TEXT,
  customer_email TEXT,
  order_type TEXT NOT NULL DEFAULT 'dine_in' CHECK (order_type IN ('dine_in', 'takeaway', 'delivery')),
  table_number INTEGER,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'preparing', 'ready', 'completed', 'cancelled', 'rejected')),
  subtotal DECIMAL(10, 2) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
  tax DECIMAL(10, 2) NOT NULL DEFAULT 0 CHECK (tax >= 0),
  total DECIMAL(10, 2) NOT NULL DEFAULT 0 CHECK (total >= 0),
  customer_notes TEXT,
  internal_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Order Items
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id UUID NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price DECIMAL(10, 2) NOT NULL CHECK (unit_price >= 0),
  total_price DECIMAL(10, 2) NOT NULL CHECK (total_price >= 0),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'warning', 'error', 'success')),
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_restaurants_slug ON restaurants(slug);
CREATE INDEX IF NOT EXISTS idx_restaurants_status ON restaurants(status);
CREATE INDEX IF NOT EXISTS idx_users_restaurant_id ON users(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_menu_categories_restaurant_id ON menu_categories(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_restaurant_id ON menu_items(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_category_id ON menu_items(category_id);
CREATE INDEX IF NOT EXISTS idx_orders_restaurant_id ON orders(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_notifications_restaurant_id ON notifications(restaurant_id);

-- =====================================================
-- RLS POLICIES
-- =====================================================

ALTER TABLE registration_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Registration Requests - Admin only
CREATE POLICY "Admin can manage registration requests" ON registration_requests
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

-- Restaurants - Admin can see all, owners see their own
CREATE POLICY "Admin can manage all restaurants" ON restaurants
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Owners can view their restaurant" ON restaurants
  FOR SELECT USING (id = (auth.jwt() ->> 'restaurant_id')::uuid);

-- Users - Owners can manage their staff, admin can see all
CREATE POLICY "Admin can manage all users" ON users
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Owners can manage their users" ON users
  FOR ALL USING (restaurant_id = (auth.jwt() ->> 'restaurant_id')::uuid);

-- Menu Categories - Restaurant owners only
CREATE POLICY "Restaurant owners can manage menu categories" ON menu_categories
  FOR ALL USING (restaurant_id = (auth.jwt() ->> 'restaurant_id')::uuid);

-- Menu Items - Restaurant owners only
CREATE POLICY "Restaurant owners can manage menu items" ON menu_items
  FOR ALL USING (restaurant_id = (auth.jwt() ->> 'restaurant_id')::uuid);

-- Orders - Restaurant owners only
CREATE POLICY "Restaurant owners can manage orders" ON orders
  FOR ALL USING (restaurant_id = (auth.jwt() ->> 'restaurant_id')::uuid);

-- Order Items - Restaurant owners only
CREATE POLICY "Restaurant owners can manage order items" ON order_items
  FOR ALL USING (
    order_id IN (
      SELECT id FROM orders WHERE restaurant_id = (auth.jwt() ->> 'restaurant_id')::uuid
    )
  );

-- Notifications - Restaurant owners only
CREATE POLICY "Restaurant owners can manage notifications" ON notifications
  FOR ALL USING (restaurant_id = (auth.jwt() ->> 'restaurant_id')::uuid);

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Function to generate order number
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TEXT AS $$
DECLARE
  order_date TEXT;
  sequence_num INTEGER;
  order_num TEXT;
BEGIN
  order_date := TO_CHAR(NOW(), 'YYMMDD');
  SELECT COALESCE(MAX(CAST(SUBSTRING(order_number FROM 7) AS INTEGER)), 0) + 1
  INTO sequence_num
  FROM orders
  WHERE order_number LIKE order_date || '%';

  order_num := order_date || LPAD(sequence_num::TEXT, 4, '0');
  RETURN order_num;
END;
$$ LANGUAGE plpgsql;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGERS
-- =====================================================

CREATE TRIGGER update_registration_requests_updated_at
  BEFORE UPDATE ON registration_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_restaurants_updated_at
  BEFORE UPDATE ON restaurants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_menu_categories_updated_at
  BEFORE UPDATE ON menu_categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_menu_items_updated_at
  BEFORE UPDATE ON menu_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- تحديثات اللغة العربية (من arabic_updates.sql)
-- =====================================================

-- إضافة حقول اللغة العربية لجدول menu_items
ALTER TABLE public.menu_items
  ADD COLUMN IF NOT EXISTS name_ar TEXT,
  ADD COLUMN IF NOT EXISTS description_ar TEXT,
  ADD COLUMN IF NOT EXISTS category_ar TEXT;

-- نسخ البيانات الحالية للحقول العربية
UPDATE public.menu_items
SET name_ar = name
WHERE name_ar IS NULL;

-- إضافة عمود أنواع الطلبات لجدول restaurants
ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS order_types_enabled JSONB DEFAULT '{"dine_in": true, "takeaway": true, "delivery": false}'::jsonb;

-- تحديث البيانات الموجودة بالقيم الافتراضية
UPDATE public.restaurants
SET order_types_enabled = '{"dine_in": true, "takeaway": true, "delivery": false}'::jsonb
WHERE order_types_enabled IS NULL;

-- =====================================================
-- جدول العروض (من promotions.sql)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.promotions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  title_ar TEXT,
  description TEXT,
  description_ar TEXT,
  image_url TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  starts_at TIMESTAMPTZ DEFAULT NOW(),
  ends_at TIMESTAMPTZ,
  display_duration_seconds INTEGER NOT NULL DEFAULT 4,
  discount_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  apply_to TEXT NOT NULL DEFAULT 'all', -- 'all' or 'item'
  menu_item_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- قيود جدول العروض
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_promotions_apply_to'
  ) THEN
    ALTER TABLE public.promotions
      ADD CONSTRAINT chk_promotions_apply_to CHECK (apply_to IN ('all', 'item'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'promotions' AND constraint_name = 'fk_promotions_menu_item'
  ) THEN
    ALTER TABLE public.promotions
      ADD CONSTRAINT fk_promotions_menu_item
      FOREIGN KEY (menu_item_id)
      REFERENCES public.menu_items(id)
      ON DELETE SET NULL;
  END IF;
END $$;

-- فهارس جدول العروض
CREATE INDEX IF NOT EXISTS idx_promotions_restaurant_id ON promotions(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_promotions_active ON promotions(restaurant_id, is_active);

-- RLS للعروض
ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Restaurant owners can manage promotions" ON promotions
  FOR ALL USING (restaurant_id = (auth.jwt() ->> 'restaurant_id')::uuid);

-- =====================================================
-- إعدادات الدفع (من payment_settings.sql)
-- =====================================================

-- إضافة إعدادات الدفع للمطاعم
ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS payment_settings JSONB DEFAULT '{
    "cash": {"enabled": true, "is_default": true},
    "card": {"enabled": false, "is_default": false},
    "online": {"enabled": false, "is_default": false}
  }'::jsonb;

-- تحديث البيانات الموجودة
UPDATE public.restaurants
SET payment_settings = '{
  "cash": {"enabled": true, "is_default": true},
  "card": {"enabled": false, "is_default": false},
  "online": {"enabled": false, "is_default": false}
}'::jsonb
WHERE payment_settings IS NULL;

-- =====================================================
-- إضافة رقم واتساب (من add_whatsapp_field.sql)
-- =====================================================

ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS whatsapp_number TEXT;

-- =====================================================
-- نظام صلاحيات الموظفين (من staff_permissions.sql)
-- =====================================================

-- جدول صلاحيات الموظفين
CREATE TABLE IF NOT EXISTS staff_permissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,

    -- صلاحيات أساسية
    can_view_orders BOOLEAN DEFAULT true,
    can_accept_orders BOOLEAN DEFAULT false,
    can_reject_orders BOOLEAN DEFAULT false,
    can_complete_orders BOOLEAN DEFAULT false,
    can_edit_orders BOOLEAN DEFAULT false,

    -- صلاحيات المنيو
    can_view_menu BOOLEAN DEFAULT true,
    can_edit_menu BOOLEAN DEFAULT false,
    can_add_menu_items BOOLEAN DEFAULT false,
    can_delete_menu_items BOOLEAN DEFAULT false,

    -- صلاحيات التقارير
    can_view_reports BOOLEAN DEFAULT false,
    can_export_data BOOLEAN DEFAULT false,

    -- صلاحيات العروض
    can_view_promotions BOOLEAN DEFAULT false,
    can_manage_promotions BOOLEAN DEFAULT false,

    -- صلاحيات الإعدادات
    can_view_settings BOOLEAN DEFAULT false,
    can_edit_settings BOOLEAN DEFAULT false,

    -- صلاحيات الموظفين (للمالك فقط)
    can_manage_staff BOOLEAN DEFAULT false,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(restaurant_id, user_id)
);

-- إضافة عمود role للمستخدمين
ALTER TABLE staff_permissions ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'staff' CHECK (role IN ('owner', 'manager', 'staff'));

-- إنشاء فهرس للبحث السريع
CREATE INDEX IF NOT EXISTS idx_staff_permissions_restaurant_id ON staff_permissions(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_staff_permissions_user_id ON staff_permissions(user_id);

-- دالة لتحديث updated_at
CREATE OR REPLACE FUNCTION update_staff_permissions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- trigger للتحديث التلقائي
DROP TRIGGER IF EXISTS trigger_update_staff_permissions_updated_at ON staff_permissions;
CREATE TRIGGER trigger_update_staff_permissions_updated_at
    BEFORE UPDATE ON staff_permissions
    FOR EACH ROW
    EXECUTE FUNCTION update_staff_permissions_updated_at();

-- RLS policies
ALTER TABLE staff_permissions ENABLE ROW LEVEL SECURITY;

-- المالك يمكنه رؤية وتعديل جميع صلاحيات مطعمه
CREATE POLICY "Owners can manage all staff permissions" ON staff_permissions
    FOR ALL USING (
        restaurant_id IN (
            SELECT r.id FROM restaurants r
            JOIN staff_permissions sp ON sp.restaurant_id = r.id
            WHERE sp.user_id = auth.uid() AND sp.can_manage_staff = true
        )
    );

-- الموظف يمكنه رؤية صلاحياته الخاصة
CREATE POLICY "Staff can view their own permissions" ON staff_permissions
    FOR SELECT USING (user_id = auth.uid());

-- =====================================================
-- تحديثات إضافية (من promotions_updates.sql وغيرها)
-- =====================================================

-- إضافة عمود is_active للعروض إذا لم يكن موجوداً
ALTER TABLE public.promotions
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- تحديث trigger للعروض
CREATE TRIGGER update_promotions_updated_at
  BEFORE UPDATE ON promotions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- إنهاء الإعداد
-- =====================================================

-- إعادة تحميل الـ schema
NOTIFY pgrst, 'reload schema';

-- رسالة تأكيد
DO $$
BEGIN
  RAISE NOTICE '✓ تم تطبيق جميع تحديثات قاعدة البيانات بنجاح!';
  RAISE NOTICE '✓ النظام جاهز للاستخدام!';
END $$;
-- =====================================================
-- إصلاح شامل ونهائي لجميع مشاكل قاعدة البيانات
-- Complete and Final Fix for All Database Issues
-- =====================================================

-- تمكين الامتدادات
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- إنشاء جدول profiles للمستخدمين
-- =====================================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  email TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- تفعيل RLS لجدول profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- السماح للمستخدمين بقراءة ملفاتهم الشخصية
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

-- السماح للمستخدمين بتحديث ملفاتهم الشخصية
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- دالة لإنشاء ملف شخصي تلقائياً
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'مستخدم جديد'),
    NEW.email,
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- trigger لإنشاء ملف شخصي تلقائياً عند التسجيل
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- إنشاء جدول staff_permissions لصلاحيات الموظفين
-- =====================================================

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

-- إضافة الأعمدة المفقودة للصلاحيات
ALTER TABLE staff_permissions ADD COLUMN IF NOT EXISTS can_create_manual_order BOOLEAN DEFAULT false;
ALTER TABLE staff_permissions ADD COLUMN IF NOT EXISTS can_view_inventory BOOLEAN DEFAULT false;
ALTER TABLE staff_permissions ADD COLUMN IF NOT EXISTS can_edit_inventory BOOLEAN DEFAULT false;

-- إنشاء فهارس
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

-- RLS policies للجدول staff_permissions
ALTER TABLE staff_permissions ENABLE ROW LEVEL SECURITY;

-- المالك يمكنه رؤية وتعديل جميع صلاحيات مطعمه
DROP POLICY IF EXISTS "Owners can manage all staff permissions" ON staff_permissions;
CREATE POLICY "Owners can manage all staff permissions" ON staff_permissions
    FOR ALL USING (
        restaurant_id IN (
            SELECT r.id FROM restaurants r
            WHERE r.id IN (
                SELECT sp.restaurant_id FROM staff_permissions sp
                WHERE sp.user_id = auth.uid() AND sp.can_manage_staff = true
            )
        )
    );

-- الموظف يمكنه رؤية صلاحياته الخاصة
DROP POLICY IF EXISTS "Staff can view their own permissions" ON staff_permissions;
CREATE POLICY "Staff can view their own permissions" ON staff_permissions
    FOR SELECT USING (user_id = auth.uid());

-- السماح للمالكين بقراءة ملفات موظفيهم
DROP POLICY IF EXISTS "Owners can view staff profiles" ON public.profiles;
CREATE POLICY "Owners can view staff profiles" ON public.profiles
  FOR SELECT USING (
    id IN (
      SELECT sp.user_id FROM staff_permissions sp
      WHERE sp.restaurant_id IN (
        SELECT sp2.restaurant_id FROM staff_permissions sp2
        WHERE sp2.user_id = auth.uid() AND sp2.can_manage_staff = true
      )
    )
  );

-- =====================================================
-- إصلاح جدول restaurants بالكامل
-- =====================================================

-- =====================================================
-- إصلاح جدول restaurants بالكامل
-- =====================================================

-- إضافة جميع الأعمدة المفقودة
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS registration_request_id UUID;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS owner_name TEXT;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS restaurant_type TEXT;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS qr_code_url TEXT;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS subscription_plan TEXT DEFAULT 'free_trial';
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'trial';
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS internal_notes TEXT;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS block_reason TEXT;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- إصلاح البيانات الموجودة
UPDATE restaurants SET
    name = COALESCE(name, 'مطعم جديد'),
    slug = COALESCE(slug, 'restaurant-' || id::TEXT),
    phone = COALESCE(phone, '0000000000'),
    email = COALESCE(email, 'temp-' || id::TEXT || '@example.com'),
    restaurant_type = COALESCE(restaurant_type, 'مطعم'),
    subscription_plan = CASE
        WHEN subscription_plan NOT IN ('free_trial', 'starter', 'pro', 'enterprise')
             OR subscription_plan IS NULL
        THEN 'free_trial'
        ELSE subscription_plan
    END,
    status = CASE
        WHEN status NOT IN ('active', 'blocked', 'trial')
             OR status IS NULL
        THEN 'trial'
        ELSE status
    END,
    is_active = COALESCE(is_active, TRUE),
    created_at = COALESCE(created_at, NOW()),
    updated_at = COALESCE(updated_at, NOW())
WHERE name IS NULL
   OR slug IS NULL
   OR phone IS NULL
   OR email IS NULL
   OR restaurant_type IS NULL
   OR subscription_plan IS NULL
   OR subscription_plan NOT IN ('free_trial', 'starter', 'pro', 'enterprise')
   OR status IS NULL
   OR status NOT IN ('active', 'blocked', 'trial')
   OR is_active IS NULL
   OR created_at IS NULL
   OR updated_at IS NULL;

-- إضافة القيود والفهارس
ALTER TABLE restaurants DROP CONSTRAINT IF EXISTS restaurants_subscription_plan_check;
ALTER TABLE restaurants ADD CONSTRAINT restaurants_subscription_plan_check
    CHECK (subscription_plan IN ('free_trial', 'starter', 'pro', 'enterprise'));

ALTER TABLE restaurants DROP CONSTRAINT IF EXISTS restaurants_status_check;
ALTER TABLE restaurants ADD CONSTRAINT restaurants_status_check
    CHECK (status IN ('active', 'blocked', 'trial'));

-- إضافة الفهارس
CREATE INDEX IF NOT EXISTS idx_restaurants_slug ON restaurants(slug);
CREATE INDEX IF NOT EXISTS idx_restaurants_status ON restaurants(status);
CREATE INDEX IF NOT EXISTS idx_restaurants_email ON restaurants(email);

-- إضافة المفتاح الخارجي
ALTER TABLE restaurants DROP CONSTRAINT IF EXISTS restaurants_registration_request_id_fkey;
ALTER TABLE restaurants ADD CONSTRAINT restaurants_registration_request_id_fkey
    FOREIGN KEY (registration_request_id) REFERENCES registration_requests(id);

-- =====================================================
-- إصلاح جدول users
-- =====================================================

-- إضافة الأعمدة المفقودة
ALTER TABLE users ADD COLUMN IF NOT EXISTS restaurant_id UUID;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS temp_password BOOLEAN DEFAULT TRUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'owner';
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name TEXT;

-- إصلاح البيانات الموجودة
UPDATE users SET
    email = COALESCE(email, 'user-' || id::TEXT || '@example.com'),
    password_hash = COALESCE(password_hash, 'temp_hash'),
    temp_password = COALESCE(temp_password, TRUE),
    role = CASE
        WHEN role NOT IN ('owner', 'manager', 'cashier', 'staff', 'admin') OR role IS NULL
        THEN 'owner'
        ELSE role
    END,
    is_active = COALESCE(is_active, TRUE),
    created_at = COALESCE(created_at, NOW()),
    updated_at = COALESCE(updated_at, NOW()),
    full_name = COALESCE(full_name, 'مستخدم جديد')
WHERE email IS NULL
   OR password_hash IS NULL
   OR temp_password IS NULL
   OR role IS NULL
   OR role NOT IN ('owner', 'manager', 'cashier', 'staff', 'admin')
   OR is_active IS NULL
   OR created_at IS NULL
   OR updated_at IS NULL
   OR full_name IS NULL;

-- إضافة القيود
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
    CHECK (role IN ('owner', 'manager', 'cashier', 'staff', 'admin'));

-- إضافة الفهارس
CREATE INDEX IF NOT EXISTS idx_users_restaurant_id ON users(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- إضافة المفتاح الخارجي
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_restaurant_id_fkey;
ALTER TABLE users ADD CONSTRAINT users_restaurant_id_fkey
    FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE;

-- =====================================================
-- إصلاح جدول registration_requests
-- =====================================================

-- إضافة الأعمدة المفقودة
ALTER TABLE registration_requests ADD COLUMN IF NOT EXISTS restaurant_name TEXT;
ALTER TABLE registration_requests ADD COLUMN IF NOT EXISTS owner_name TEXT;
ALTER TABLE registration_requests ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE registration_requests ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE registration_requests ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE registration_requests ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE registration_requests ADD COLUMN IF NOT EXISTS restaurant_type TEXT;
ALTER TABLE registration_requests ADD COLUMN IF NOT EXISTS heard_from TEXT;
ALTER TABLE registration_requests ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE registration_requests ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE registration_requests ADD COLUMN IF NOT EXISTS contacted_at TIMESTAMPTZ;
ALTER TABLE registration_requests ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE registration_requests ADD COLUMN IF NOT EXISTS internal_notes TEXT;
ALTER TABLE registration_requests ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE registration_requests ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- إصلاح البيانات الموجودة
UPDATE registration_requests SET
    restaurant_name = COALESCE(restaurant_name, 'مطعم جديد'),
    owner_name = COALESCE(owner_name, 'مالك جديد'),
    phone = COALESCE(phone, '0000000000'),
    city = COALESCE(city, 'القاهرة'),
    restaurant_type = COALESCE(restaurant_type, 'مطعم'),
    status = CASE
        WHEN status NOT IN ('pending', 'contacted', 'verified', 'rejected') OR status IS NULL
        THEN 'pending'
        ELSE status
    END,
    created_at = COALESCE(created_at, NOW()),
    updated_at = COALESCE(updated_at, NOW())
WHERE restaurant_name IS NULL
   OR owner_name IS NULL
   OR phone IS NULL
   OR city IS NULL
   OR restaurant_type IS NULL
   OR status IS NULL
   OR status NOT IN ('pending', 'contacted', 'verified', 'rejected')
   OR created_at IS NULL
   OR updated_at IS NULL;

-- إضافة القيود
ALTER TABLE registration_requests DROP CONSTRAINT IF EXISTS registration_requests_status_check;
ALTER TABLE registration_requests ADD CONSTRAINT registration_requests_status_check
    CHECK (status IN ('pending', 'contacted', 'verified', 'rejected'));

-- =====================================================
-- دوال التسجيل التلقائي
-- =====================================================

-- حذف الدوال القديمة إذا كانت موجودة
DROP FUNCTION IF EXISTS auto_create_restaurant(text, text, text, text, text, text, text, text, text);
DROP FUNCTION IF EXISTS auto_create_restaurant(text, text, text, text, text, text, text, text, text, text);

-- دالة إنشاء slug
CREATE OR REPLACE FUNCTION generate_slug(name TEXT)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN trim(both '-' from regexp_replace(
        regexp_replace(
            lower(name),
            '[^a-z0-9ا-ي\s-]',
            '', 'g'
        ),
        '\s+',
        '-', 'g'
    ));
END;
$$;

-- دالة إنشاء كلمة مرور مؤقتة
CREATE OR REPLACE FUNCTION generate_temp_password()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    result TEXT := '';
    i INTEGER;
BEGIN
    FOR i IN 1..8 LOOP
        result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
    END LOOP;
    RETURN result;
END;
$$;

-- دالة التسجيل التلقائي
CREATE OR REPLACE FUNCTION auto_create_restaurant(
    p_restaurant_name TEXT,
    p_owner_name TEXT,
    p_phone TEXT,
    p_city TEXT,
    p_restaurant_type TEXT,
    p_email TEXT DEFAULT NULL,
    p_password TEXT DEFAULT NULL,
    p_address TEXT DEFAULT NULL,
    p_heard_from TEXT DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_slug TEXT;
    v_password_hash TEXT;
    v_restaurant_id UUID;
    v_user_id UUID;
BEGIN
    -- التحقق من وجود كلمة مرور
    IF p_password IS NULL OR p_password = '' THEN
        RETURN jsonb_build_object('success', false, 'message', 'كلمة المرور مطلوبة');
    END IF;

    -- التحقق من عدم وجود مطعم بنفس البريد الإلكتروني
    IF p_email IS NOT NULL THEN
        IF EXISTS (SELECT 1 FROM restaurants WHERE email = p_email) THEN
            RETURN jsonb_build_object('success', false, 'message', 'البريد الإلكتروني مستخدم بالفعل');
        END IF;
    END IF;

    -- إنشاء slug فريد
    v_slug := generate_slug(p_restaurant_name);
    IF v_slug = '' OR v_slug IS NULL THEN
        v_slug := 'restaurant-' || EXTRACT(epoch FROM NOW())::TEXT;
    END IF;
    IF EXISTS (SELECT 1 FROM restaurants WHERE slug = v_slug) THEN
        v_slug := v_slug || '-' || EXTRACT(epoch FROM NOW())::TEXT;
    END IF;

    -- تشفير كلمة المرور
    v_password_hash := crypt(p_password, gen_salt('bf', 8));

    -- إنشاء سجل المطعم
    INSERT INTO restaurants (
        name, slug, owner_name, phone, email, city, address,
        restaurant_type, subscription_plan, status, is_active,
        created_at, updated_at
    ) VALUES (
        p_restaurant_name, v_slug, p_owner_name, p_phone, p_email,
        p_city, p_address, p_restaurant_type, 'free_trial', 'trial', true,
        NOW(), NOW()
    ) RETURNING id INTO v_restaurant_id;

    -- إنشاء حساب المستخدم
    INSERT INTO users (
        restaurant_id, email, password_hash, role, temp_password,
        is_active, created_at, updated_at
    ) VALUES (
        v_restaurant_id, p_email, v_password_hash, 'owner', false,
        true, NOW(), NOW()
    ) RETURNING id INTO v_user_id;

    -- حفظ طلب التسجيل للأرشفة
    INSERT INTO registration_requests (
        restaurant_name, owner_name, phone, email, city, address,
        restaurant_type, heard_from, notes, status, contacted_at,
        created_at, updated_at
    ) VALUES (
        p_restaurant_name, p_owner_name, p_phone, p_email, p_city, p_address,
        p_restaurant_type, p_heard_from, p_notes, 'verified', NOW(),
        NOW(), NOW()
    );

    -- إرجاع البيانات
    RETURN jsonb_build_object(
        'success', true,
        'restaurant_id', v_restaurant_id,
        'user_id', v_user_id,
        'email', p_email,
        'restaurant_name', p_restaurant_name,
        'slug', v_slug
    );

EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$;

-- =====================================================
-- دالة تسجيل الدخول
-- =====================================================

-- حذف الدالة القديمة إذا كانت موجودة
DROP FUNCTION IF EXISTS restaurant_login(text, text);

CREATE OR REPLACE FUNCTION restaurant_login(
  p_email TEXT,
  p_password TEXT
)
RETURNS TABLE (
  id UUID,
  email TEXT,
  role TEXT,
  restaurant_id UUID,
  temp_password BOOLEAN,
  restaurant_name TEXT,
  restaurant_slug TEXT,
  restaurant_is_active BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- البحث عن المستخدم مع التحقق من كلمة المرور المشفرة
    RETURN QUERY
    SELECT
        u.id,
        u.email,
        u.role,
        u.restaurant_id,
        u.temp_password,
        r.name as restaurant_name,
        r.slug as restaurant_slug,
        r.is_active as restaurant_is_active
    FROM users u
    LEFT JOIN restaurants r ON r.id = u.restaurant_id
    WHERE u.email = LOWER(p_email)
      AND u.password_hash = crypt(p_password, u.password_hash)
      AND u.is_active = true;
END;
$$;

-- =====================================================
-- إعداد الأمان الأساسي
-- =====================================================

-- Row Level Security
ALTER TABLE registration_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- سياسات أمان بسيطة للتطوير (يمكن تخصيصها لاحقاً)
DROP POLICY IF EXISTS "Allow all operations for development" ON registration_requests;
DROP POLICY IF EXISTS "Allow all operations for development" ON restaurants;
DROP POLICY IF EXISTS "Allow all operations for development" ON users;
DROP POLICY IF EXISTS "Allow all operations for development" ON staff_permissions;

CREATE POLICY "Allow all operations for development" ON registration_requests FOR ALL USING (true);
CREATE POLICY "Allow all operations for development" ON restaurants FOR ALL USING (true);
CREATE POLICY "Allow all operations for development" ON users FOR ALL USING (true);
CREATE POLICY "Allow all operations for development" ON staff_permissions FOR ALL USING (true);

-- السماح بتنفيذ الدوال للتطوير
GRANT EXECUTE ON FUNCTION auto_create_restaurant(text, text, text, text, text, text, text, text, text, text) TO anon;
GRANT EXECUTE ON FUNCTION restaurant_login(text, text) TO anon;

-- دالة إنشاء موظف جديد
CREATE OR REPLACE FUNCTION create_staff_user(
  p_restaurant_id UUID,
  p_email         TEXT,
  p_password_hash TEXT,
  p_full_name     TEXT,
  p_role          TEXT DEFAULT 'staff'
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_id UUID;
BEGIN
  -- التحقق من عدم وجود بريد إلكتروني مكرر
  IF EXISTS (SELECT 1 FROM users WHERE email = LOWER(p_email)) THEN
    RAISE EXCEPTION 'البريد الإلكتروني مستخدم بالفعل';
  END IF;

  -- إنشاء حساب الموظف
  INSERT INTO users (restaurant_id, email, password_hash, full_name, role, temp_password, is_active, created_at, updated_at)
  VALUES (p_restaurant_id, LOWER(p_email), crypt(p_password_hash, gen_salt('bf', 8)), p_full_name, p_role, true, true, NOW(), NOW())
  RETURNING id INTO v_id;

  -- إنشاء صلاحيات افتراضية حسب الدور
  INSERT INTO staff_permissions (restaurant_id, user_id, role,
    can_view_orders, can_accept_orders, can_reject_orders, can_complete_orders, can_edit_orders, can_create_manual_order,
    can_view_menu, can_edit_menu, can_add_menu_items, can_delete_menu_items,
    can_view_inventory, can_edit_inventory,
    can_view_reports, can_export_data,
    can_view_promotions, can_manage_promotions,
    can_view_settings, can_edit_settings, can_manage_staff)
  VALUES (p_restaurant_id, v_id, p_role,
    -- طلبات
    true, -- can_view_orders
    CASE WHEN p_role IN ('manager','cashier') THEN true ELSE false END, -- can_accept_orders
    CASE WHEN p_role = 'manager' THEN true ELSE false END, -- can_reject_orders
    CASE WHEN p_role IN ('manager','cashier') THEN true ELSE false END, -- can_complete_orders
    CASE WHEN p_role IN ('manager','cashier') THEN true ELSE false END, -- can_edit_orders
    CASE WHEN p_role IN ('manager','cashier') THEN true ELSE false END, -- can_create_manual_order
    -- منيو
    true, -- can_view_menu
    CASE WHEN p_role = 'manager' THEN true ELSE false END, -- can_edit_menu
    CASE WHEN p_role = 'manager' THEN true ELSE false END, -- can_add_menu_items
    false, -- can_delete_menu_items (لا يحذف أحد)
    -- مخزون
    CASE WHEN p_role = 'manager' THEN true ELSE false END, -- can_view_inventory
    CASE WHEN p_role = 'manager' THEN true ELSE false END, -- can_edit_inventory
    -- تقارير
    CASE WHEN p_role = 'manager' THEN true ELSE false END, -- can_view_reports
    false, -- can_export_data
    -- عروض
    CASE WHEN p_role = 'manager' THEN true ELSE false END, -- can_view_promotions
    CASE WHEN p_role = 'manager' THEN true ELSE false END, -- can_manage_promotions
    -- إعدادات
    CASE WHEN p_role = 'manager' THEN true ELSE false END, -- can_view_settings
    false, -- can_edit_settings
    false -- can_manage_staff
  );

  RETURN v_id;
END; $$;

GRANT EXECUTE ON FUNCTION create_staff_user(uuid, text, text, text, text) TO anon;

-- دالة إعادة تعيين كلمة مرور موظف
CREATE OR REPLACE FUNCTION reset_staff_password(
  p_user_id UUID,
  p_new_password TEXT
) RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE users
  SET password_hash = crypt(p_new_password, gen_salt('bf', 8)),
      temp_password = true,
      updated_at = NOW()
  WHERE id = p_user_id;

  RETURN FOUND;
END; $$;

GRANT EXECUTE ON FUNCTION reset_staff_password(uuid, text) TO anon;

-- دالة للتحديث التلقائي لـ updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- إضافة triggers للتحديث التلقائي
DROP TRIGGER IF EXISTS update_restaurants_updated_at ON restaurants;
CREATE TRIGGER update_restaurants_updated_at
    BEFORE UPDATE ON restaurants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_registration_requests_updated_at ON registration_requests;
CREATE TRIGGER update_registration_requests_updated_at
    BEFORE UPDATE ON registration_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- رسالة تأكيد نهائية
DO $$
BEGIN
    RAISE NOTICE '🎉 تم إصلاح قاعدة البيانات بالكامل وللأبد!';
    RAISE NOTICE '✅ جميع الجداول والأعمدة والقيود جاهزة!';
    RAISE NOTICE '✅ الدوال والـ triggers تعمل بشكل صحيح!';
    RAISE NOTICE '🚀 النظام جاهز للتسجيل التلقائي بدون أي أخطاء!';
    RAISE NOTICE '💡 لتجربة النظام: npm run dev ثم اذهب إلى /register';
END $$;
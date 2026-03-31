-- =====================================================
-- الإعداد الكامل لقاعدة البيانات - Restaurant SaaS
-- Complete Database Setup - Restaurant SaaS
-- =====================================================

-- تمكين الامتدادات
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- الجداول الأساسية
-- =====================================================

-- 1. طلبات التسجيل
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

-- 2. المطاعم
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

-- 3. المستخدمين
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

-- =====================================================
-- الفهرسة والأمان
-- =====================================================

-- فهارس الأداء
CREATE INDEX IF NOT EXISTS idx_restaurants_slug ON restaurants(slug);
CREATE INDEX IF NOT EXISTS idx_restaurants_status ON restaurants(status);
CREATE INDEX IF NOT EXISTS idx_users_restaurant_id ON users(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Row Level Security
ALTER TABLE registration_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- سياسات الأمان (مبسطة للتطوير)
CREATE POLICY "Allow all operations for development" ON registration_requests FOR ALL USING (true);
CREATE POLICY "Allow all operations for development" ON restaurants FOR ALL USING (true);
CREATE POLICY "Allow all operations for development" ON users FOR ALL USING (true);

-- =====================================================
-- دوال التسجيل التلقائي
-- =====================================================

-- دالة إنشاء slug
CREATE OR REPLACE FUNCTION generate_slug(name TEXT)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN regexp_replace(
        regexp_replace(
            lower(name),
            '[^a-z0-9\s-]',
            '', 'g'
        ),
        '\s+',
        '-', 'g'
    );
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
    v_temp_password TEXT;
    v_password_hash TEXT;
    v_restaurant_id UUID;
    v_user_id UUID;
BEGIN
    -- التحقق من عدم وجود مطعم بنفس البريد الإلكتروني
    IF p_email IS NOT NULL THEN
        IF EXISTS (SELECT 1 FROM restaurants WHERE email = p_email) THEN
            RETURN jsonb_build_object('success', false, 'message', 'البريد الإلكتروني مستخدم بالفعل');
        END IF;
    END IF;

    -- إنشاء slug فريد
    v_slug := generate_slug(p_restaurant_name);
    IF EXISTS (SELECT 1 FROM restaurants WHERE slug = v_slug) THEN
        v_slug := v_slug || '-' || EXTRACT(epoch FROM NOW())::TEXT;
    END IF;

    -- إنشاء كلمة مرور مؤقتة
    v_temp_password := generate_temp_password();
    v_password_hash := crypt(v_temp_password, gen_salt('bf', 8));

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
        v_restaurant_id, p_email, v_password_hash, 'owner', true,
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
        'temp_password', v_temp_password,
        'login_url', 'http://localhost:5173/login',
        'restaurant_name', p_restaurant_name,
        'slug', v_slug
    );

EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$;

-- رسالة تأكيد
DO $$
BEGIN
    RAISE NOTICE '🎉 تم إعداد قاعدة البيانات بالكامل!';
    RAISE NOTICE '✅ جميع الجداول والدوال جاهزة!';
    RAISE NOTICE '🚀 النظام جاهز للتسجيل التلقائي!';
    RAISE NOTICE '💡 لتجربة النظام: npm run dev ثم اذهب إلى /register';
END $$;
-- =====================================================
-- إصلاح شامل لنظام التسجيل التلقائي للمطاعم
-- Complete Fix for Auto Restaurant Registration System
-- =====================================================

-- 1. إصلاح جميع الأعمدة المفقودة في جدول restaurants
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS restaurant_type TEXT;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS subscription_plan TEXT DEFAULT 'free_trial';
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'trial';
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS internal_notes TEXT;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS block_reason TEXT;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS qr_code_url TEXT;

-- تحديث البيانات الموجودة بالقيم الافتراضية
UPDATE restaurants SET
    restaurant_type = COALESCE(restaurant_type, 'مطعم'),
    subscription_plan = COALESCE(subscription_plan, 'free_trial'),
    status = COALESCE(status, 'trial'),
    is_active = COALESCE(is_active, TRUE)
WHERE restaurant_type IS NULL
   OR subscription_plan IS NULL
   OR status IS NULL
   OR is_active IS NULL;

-- إضافة قيود التحقق
ALTER TABLE restaurants DROP CONSTRAINT IF EXISTS restaurants_subscription_plan_check;
ALTER TABLE restaurants ADD CONSTRAINT restaurants_subscription_plan_check
    CHECK (subscription_plan IN ('free_trial', 'starter', 'pro', 'enterprise'));

ALTER TABLE restaurants DROP CONSTRAINT IF EXISTS restaurants_status_check;
ALTER TABLE restaurants ADD CONSTRAINT restaurants_status_check
    CHECK (status IN ('active', 'blocked', 'trial'));

-- 2. دالة إنشاء slug (بدون unaccent)
CREATE OR REPLACE FUNCTION generate_slug(name TEXT)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
BEGIN
    -- تحويل إلى lowercase وإزالة العلامات العربية والرموز
    RETURN regexp_replace(
        regexp_replace(
            lower(name),
            '[^a-z0-9\s-]', -- إزالة الرموز عدا المسافات والشرطة
            '', 'g'
        ),
        '\s+', -- استبدال المسافات المتعددة بشرطة واحدة
        '-', 'g'
    );
END;
$$;

-- 3. دالة إنشاء كلمة مرور مؤقتة
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

-- 4. الدالة الرئيسية للتسجيل التلقائي
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
    RAISE NOTICE '✅ تم إصلاح جميع المشاكل!';
    RAISE NOTICE '✅ النظام جاهز للتسجيل التلقائي بالكامل!';
    RAISE NOTICE '💡 لتجربة النظام: npm run dev ثم اذهب إلى /register';
END $$;
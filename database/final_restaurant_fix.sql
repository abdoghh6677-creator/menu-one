-- =====================================================
-- إصلاح شامل ونهائي لجدول restaurants
-- Complete and Final Fix for restaurants table
-- =====================================================

-- إضافة جميع الأعمدة المفقودة
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS restaurant_type TEXT;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS subscription_plan TEXT DEFAULT 'free_trial';
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'trial';
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS internal_notes TEXT;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS block_reason TEXT;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS qr_code_url TEXT;

-- إصلاح البيانات الموجودة التي لا تتوافق مع القيود
UPDATE restaurants SET
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
    is_active = COALESCE(is_active, TRUE)
WHERE restaurant_type IS NULL
   OR subscription_plan IS NULL
   OR subscription_plan NOT IN ('free_trial', 'starter', 'pro', 'enterprise')
   OR status IS NULL
   OR status NOT IN ('active', 'blocked', 'trial')
   OR is_active IS NULL;

-- إضافة قيود التحقق (constraints) - آمنة الآن
ALTER TABLE restaurants DROP CONSTRAINT IF EXISTS restaurants_subscription_plan_check;
ALTER TABLE restaurants ADD CONSTRAINT restaurants_subscription_plan_check
    CHECK (subscription_plan IN ('free_trial', 'starter', 'pro', 'enterprise'));

ALTER TABLE restaurants DROP CONSTRAINT IF EXISTS restaurants_status_check;
ALTER TABLE restaurants ADD CONSTRAINT restaurants_status_check
    CHECK (status IN ('active', 'blocked', 'trial'));

-- رسالة تأكيد
DO $$
BEGIN
    RAISE NOTICE '✅ تم إصلاح جدول restaurants بالكامل!';
    RAISE NOTICE '✅ جميع الأعمدة والقيود جاهزة!';
    RAISE NOTICE '🚀 النظام جاهز للتسجيل التلقائي!';
END $$;
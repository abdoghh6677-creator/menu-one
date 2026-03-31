-- =====================================================
-- الحل الشامل لمشكلة إدارة الموظفين - نسخة محدثة
-- Complete Solution for Staff Management Issue - Updated Version
-- =====================================================

-- تمكين الامتدادات
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- خطوة 1: إصلاح جدول users - إضافة full_name
-- =====================================================

-- إضافة عمود full_name إلى جدول users
ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name TEXT;

-- تحديث البيانات الموجودة
UPDATE users SET full_name = 'مستخدم جديد' WHERE full_name IS NULL OR full_name = '';

-- تعيين قيمة افتراضية
ALTER TABLE users ALTER COLUMN full_name SET DEFAULT 'مستخدم جديد';
ALTER TABLE users ALTER COLUMN full_name SET NOT NULL;

-- =====================================================
-- خطوة 2: حذف الجداول القديمة وإعادة البناء
-- =====================================================

-- حذف الجداول إذا كانت موجودة
DROP TABLE IF EXISTS staff_permissions CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- حذف الدوال إذا كانت موجودة
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS update_staff_permissions_updated_at() CASCADE;

-- =====================================================
-- خطوة 3: إنشاء جدول staff_permissions
-- =====================================================

CREATE TABLE staff_permissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
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

    role TEXT DEFAULT 'staff' CHECK (role IN ('owner', 'manager', 'staff')),

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(restaurant_id, user_id)
);

-- إنشاء الفهارس
CREATE INDEX idx_staff_permissions_restaurant_id ON staff_permissions(restaurant_id);
CREATE INDEX idx_staff_permissions_user_id ON staff_permissions(user_id);

-- تفعيل RLS
ALTER TABLE staff_permissions ENABLE ROW LEVEL SECURITY;

-- إنشاء policy بسيط للسماح بالوصول (لأن المشروع لا يستخدم Supabase Auth)
CREATE POLICY "Allow all operations for staff permissions" ON staff_permissions FOR ALL USING (true);

-- =====================================================
-- خطوة 4: الدوال والـ triggers
-- =====================================================

-- دالة لتحديث updated_at
CREATE OR REPLACE FUNCTION update_staff_permissions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- trigger للتحديث التلقائي
CREATE TRIGGER trigger_update_staff_permissions_updated_at
    BEFORE UPDATE ON staff_permissions
    FOR EACH ROW
    EXECUTE FUNCTION update_staff_permissions_updated_at();

-- =====================================================
-- خطوة 5: إضافة بيانات تجريبية للمستخدمين
-- =====================================================

-- إضافة مستخدمين تجريبيين للاختبار
INSERT INTO users (id, email, password_hash, full_name, role, is_active, temp_password)
VALUES
  (gen_random_uuid(), 'ahmed@example.com', crypt('123456', gen_salt('bf', 8)), 'أحمد محمد', 'staff', true, true),
  (gen_random_uuid(), 'fatima@example.com', crypt('123456', gen_salt('bf', 8)), 'فاطمة علي', 'staff', true, true),
  (gen_random_uuid(), 'omar@example.com', crypt('123456', gen_salt('bf', 8)), 'عمر حسن', 'staff', true, true),
  (gen_random_uuid(), 'layla@example.com', crypt('123456', gen_salt('bf', 8)), 'ليلى أحمد', 'staff', true, true),
  (gen_random_uuid(), 'karim@example.com', crypt('123456', gen_salt('bf', 8)), 'كريم محمود', 'staff', true, true)
ON CONFLICT (email) DO NOTHING;

-- =====================================================
-- خطوة 6: رسالة التأكيد النهائية
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '🎉 تم حل مشكلة إدارة الموظفين نهائياً!';
    RAISE NOTICE '📋 ما تم إنجازه:';
    RAISE NOTICE '   ✅ إضافة عمود full_name إلى جدول users';
    RAISE NOTICE '   ✅ إنشاء جدول staff_permissions';
    RAISE NOTICE '   ✅ تفعيل RLS policies';
    RAISE NOTICE '   ✅ إضافة بيانات تجريبية للمستخدمين';
    RAISE NOTICE '   ✅ إنشاء الدوال والـ triggers';
    RAISE NOTICE '';
    RAISE NOTICE '🚀 يمكنك الآن:';
    RAISE NOTICE '   1. تشغيل المشروع: npm run dev';
    RAISE NOTICE '   2. الذهاب إلى صفحة إدارة الموظفين';
    RAISE NOTICE '   3. إضافة موظفين جدد بنجاح';
    RAISE NOTICE '';
    RAISE NOTICE '👥 المستخدمون التجريبيون المتاحون:';
    RAISE NOTICE '   - أحمد محمد (ahmed@example.com)';
    RAISE NOTICE '   - فاطمة علي (fatima@example.com)';
    RAISE NOTICE '   - عمر حسن (omar@example.com)';
    RAISE NOTICE '   - ليلى أحمد (layla@example.com)';
    RAISE NOTICE '   - كريم محمود (karim@example.com)';
    RAISE NOTICE '';
    RAISE NOTICE '🔑 كلمة المرور للجميع: 123456';
END $$;
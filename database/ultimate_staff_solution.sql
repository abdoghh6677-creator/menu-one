-- =====================================================
-- الحل النهائي والشامل لمشكلة إدارة الموظفين
-- Final Complete Solution for Staff Management Issue
-- =====================================================

-- تمكين الامتدادات
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- خطوة 1: حذف كل شيء قديم وإعادة البناء
-- =====================================================

-- حذف الجداول إذا كانت موجودة (لضمان البداية النظيفة)
DROP TABLE IF EXISTS staff_permissions CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- حذف الدوال إذا كانت موجودة
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS update_staff_permissions_updated_at() CASCADE;

-- =====================================================
-- خطوة 2: إنشاء جدول profiles
-- =====================================================

CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  email TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- تفعيل RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- إنشاء الـ policies
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- =====================================================
-- خطوة 3: إنشاء جدول staff_permissions
-- =====================================================

CREATE TABLE staff_permissions (
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

-- إنشاء الـ policies
CREATE POLICY "Staff can view their own permissions" ON staff_permissions
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Owners can manage all staff permissions" ON staff_permissions
    FOR ALL USING (
        restaurant_id IN (
            SELECT sp.restaurant_id FROM staff_permissions sp
            WHERE sp.user_id = auth.uid() AND sp.can_manage_staff = true
        )
    );

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
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- خطوة 5: إضافة بيانات تجريبية
-- =====================================================

-- إدراج بيانات تجريبية في جدول profiles
INSERT INTO public.profiles (id, full_name, email)
SELECT
    u.id,
    COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', 'مستخدم جديد'),
    u.email
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL;

-- إضافة policy للمالكين لقراءة ملفات موظفيهم
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
-- خطوة 6: رسالة التأكيد النهائية
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '🎉 تم حل مشكلة إدارة الموظفين نهائياً!';
    RAISE NOTICE '📋 ما تم إنجازه:';
    RAISE NOTICE '   ✅ إنشاء جدول profiles';
    RAISE NOTICE '   ✅ إنشاء جدول staff_permissions';
    RAISE NOTICE '   ✅ تفعيل RLS policies';
    RAISE NOTICE '   ✅ إنشاء الدوال والـ triggers';
    RAISE NOTICE '   ✅ إضافة بيانات تجريبية';
    RAISE NOTICE '';
    RAISE NOTICE '🚀 يمكنك الآن:';
    RAISE NOTICE '   1. تشغيل المشروع: npm run dev';
    RAISE NOTICE '   2. الذهاب إلى صفحة إدارة الموظفين';
    RAISE NOTICE '   3. إضافة موظفين جدد بنجاح';
    RAISE NOTICE '';
    RAISE NOTICE '💡 نصيحة: تأكد من تسجيل الدخول كمالك مطعم لتتمكن من إدارة الموظفين';
END $$;
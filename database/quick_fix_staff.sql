-- =====================================================
-- إصلاح سريع لمشاكل إدارة الموظفين
-- =====================================================

-- إنشاء جدول profiles إذا لم يكن موجوداً
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  email TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- تفعيل RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- السماح للمستخدمين بقراءة ملفاتهم الشخصية
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

-- السماح للمستخدمين بتحديث ملفاتهم الشخصية
CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- السماح للمالكين بقراءة ملفات موظفيهم (مع التحقق من وجود جدول staff_permissions)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'staff_permissions') THEN
    -- سيتم إنشاء هذا الـ policy لاحقاً بعد إنشاء جدول staff_permissions
    NULL;
  END IF;
END $$;

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

-- إنشاء جدول staff_permissions إذا لم يكن موجوداً
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
CREATE POLICY "Staff can view their own permissions" ON staff_permissions
    FOR SELECT USING (user_id = auth.uid());

-- الآن يمكننا إنشاء policy للمالكين في جدول profiles
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

-- رسالة تأكيد
DO $$
BEGIN
  RAISE NOTICE '✓ تم إصلاح مشاكل إدارة الموظفين!';
  RAISE NOTICE '✓ تم إنشاء جدول staff_permissions!';
  RAISE NOTICE '✓ يمكنك الآن إضافة موظفين جدد بنجاح!';
END $$;
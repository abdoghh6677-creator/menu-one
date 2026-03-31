-- =====================================================
-- إصلاح مشاكل إدارة الموظفين - Restaurant SaaS
-- يحل مشكلة عدم القدرة على إضافة موظفين جدد
-- =====================================================

-- =====================================================
-- إنشاء جدول profiles إذا لم يكن موجوداً
-- =====================================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  email TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS للجدول
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- السماح للمستخدمين بقراءة ملفاتهم الشخصية
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

-- السماح للمستخدمين بتحديث ملفاتهم الشخصية
CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- السماح للمالكين بقراءة ملفات موظفيهم
CREATE POLICY "Owners can view staff profiles" ON public.profiles
  FOR SELECT USING (
    id IN (
      SELECT sp.user_id FROM staff_permissions sp
      WHERE sp.restaurant_id IN (
        SELECT r.id FROM restaurants r
        JOIN staff_permissions sp2 ON sp2.restaurant_id = r.id
        WHERE sp2.user_id = auth.uid() AND sp2.can_manage_staff = true
      )
    )
  );

-- =====================================================
-- دالة لإنشاء ملف شخصي تلقائياً
-- =====================================================

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
-- تحديث دالة getAllStaffPermissions لتعمل مع profiles
-- =====================================================

-- يمكنك الآن استخدام الاستعلام التالي في الكود بدلاً من auth.admin:

-- في restaurantService.ts، استبدل:
-- const { data: userData, error: userError } = await supabase.auth.admin.getUserById(staff.user_id);

-- بالاستعلام التالي:
-- const { data: userData, error: userError } = await supabase
--   .from('profiles')
--   .select('full_name, email')
--   .eq('id', staff.user_id)
--   .single();

-- =====================================================
-- رسالة تأكيد
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✓ تم إصلاح مشاكل إدارة الموظفين!';
  RAISE NOTICE '✓ يمكنك الآن إضافة موظفين جدد بنجاح!';
END $$;
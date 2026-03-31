-- =====================================================
-- نظام صلاحيات الموظفين - Restaurant SaaS
-- يمكن تطبيقه بشكل منفصل على قاعدة بيانات موجودة
-- =====================================================

-- =====================================================
-- جدول صلاحيات الموظفين
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

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- دالة لتحديث updated_at
CREATE OR REPLACE FUNCTION update_staff_permissions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- trigger للتحديث التلقائي
DROP TRIGGER IF EXISTS trigger_update_staff_permissions_updated_at ON staff_permissions;
CREATE TRIGGER trigger_update_staff_permissions_updated_at
    BEFORE UPDATE ON staff_permissions
    FOR EACH ROW
    EXECUTE FUNCTION update_staff_permissions_updated_at();

-- =====================================================
-- RLS POLICIES
-- =====================================================

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
-- FUNCTIONS المساعدة
-- =====================================================

-- دالة لإنشاء صلاحيات افتراضية للمالك
CREATE OR REPLACE FUNCTION create_owner_permissions(restaurant_uuid UUID, owner_uuid UUID, owner_email TEXT)
RETURNS void AS $$
BEGIN
    INSERT INTO staff_permissions (
        restaurant_id, user_id, email, role,
        can_view_orders, can_accept_orders, can_reject_orders, can_complete_orders, can_edit_orders,
        can_view_menu, can_edit_menu, can_add_menu_items, can_delete_menu_items,
        can_view_reports, can_export_data,
        can_view_promotions, can_manage_promotions,
        can_view_settings, can_edit_settings,
        can_manage_staff
    ) VALUES (
        restaurant_uuid, owner_uuid, owner_email, 'owner',
        true, true, true, true, true,  -- جميع صلاحيات الطلبات
        true, true, true, true,        -- جميع صلاحيات المنيو
        true, true,                    -- جميع صلاحيات التقارير
        true, true,                    -- جميع صلاحيات العروض
        true, true,                    -- جميع صلاحيات الإعدادات
        true                          -- إدارة الموظفين
    )
    ON CONFLICT (restaurant_id, user_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- دالة لإنشاء صلاحيات افتراضية للموظف
CREATE OR REPLACE FUNCTION create_staff_permissions(restaurant_uuid UUID, staff_uuid UUID, staff_email TEXT, staff_role TEXT DEFAULT 'staff')
RETURNS void AS $$
BEGIN
    INSERT INTO staff_permissions (
        restaurant_id, user_id, email, role,
        can_view_orders, can_accept_orders, can_reject_orders, can_complete_orders, can_edit_orders,
        can_view_menu, can_edit_menu, can_add_menu_items, can_delete_menu_items,
        can_view_reports, can_export_data,
        can_view_promotions, can_manage_promotions,
        can_view_settings, can_edit_settings,
        can_manage_staff
    ) VALUES (
        restaurant_uuid, staff_uuid, staff_email, staff_role,
        true, false, false, false, false,  -- عرض الطلبات فقط
        true, false, false, false,         -- عرض المنيو فقط
        false, false,                      -- لا صلاحيات تقارير
        false, false,                      -- لا صلاحيات عروض
        false, false,                      -- لا صلاحيات إعدادات
        false                             -- لا إدارة موظفين
    )
    ON CONFLICT (restaurant_id, user_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- دالة للتحقق من الصلاحية
CREATE OR REPLACE FUNCTION has_permission(user_uuid UUID, permission_name TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    has_perm BOOLEAN := false;
BEGIN
    EXECUTE format('SELECT %I FROM staff_permissions WHERE user_id = $1', permission_name)
    INTO has_perm
    USING user_uuid;

    RETURN COALESCE(has_perm, false);
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- رسالة تأكيد
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✓ تم تطبيق نظام صلاحيات الموظفين بنجاح!';
  RAISE NOTICE '✓ يمكنك الآن إدارة صلاحيات الموظفين من خلال التطبيق!';
END $$;
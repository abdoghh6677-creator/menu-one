-- =====================================================
-- Staff Permissions System
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

-- إدراج صلاحيات افتراضية للمالك
-- هذا يتم تنفيذه عند إنشاء المطعم الجديد
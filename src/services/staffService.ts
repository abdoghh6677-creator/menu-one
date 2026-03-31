import { supabase } from "../config/supabase";
import type { StaffPermissions } from "../utils/session";

export interface StaffMember {
  id: string;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
  temp_password: boolean;
  created_at: string;
  permissions?: StaffPermissions;
}

export const ROLE_PRESETS: Record<string, Partial<StaffPermissions>> = {
  manager: {
    role: "manager",
    can_view_orders: true, can_accept_orders: true, can_reject_orders: true,
    can_complete_orders: true, can_edit_orders: true, can_create_manual_order: true,
    can_view_menu: true, can_edit_menu: true, can_add_menu_items: true, can_delete_menu_items: false,
    can_view_inventory: true, can_edit_inventory: true,
    can_view_reports: true, can_export_data: false,
    can_view_promotions: true, can_manage_promotions: true,
    can_view_settings: true, can_edit_settings: false, can_manage_staff: false,
  },
  cashier: {
    role: "cashier",
    can_view_orders: true, can_accept_orders: true, can_reject_orders: false,
    can_complete_orders: true, can_edit_orders: true, can_create_manual_order: true,
    can_view_menu: true, can_edit_menu: false, can_add_menu_items: false, can_delete_menu_items: false,
    can_view_inventory: false, can_edit_inventory: false,
    can_view_reports: false, can_export_data: false,
    can_view_promotions: false, can_manage_promotions: false,
    can_view_settings: false, can_edit_settings: false, can_manage_staff: false,
  },
  staff: {
    role: "staff",
    can_view_orders: true, can_accept_orders: false, can_reject_orders: false,
    can_complete_orders: false, can_edit_orders: false, can_create_manual_order: false,
    can_view_menu: true, can_edit_menu: false, can_add_menu_items: false, can_delete_menu_items: false,
    can_view_inventory: false, can_edit_inventory: false,
    can_view_reports: false, can_export_data: false,
    can_view_promotions: false, can_manage_promotions: false,
    can_view_settings: false, can_edit_settings: false, can_manage_staff: false,
  },
};

export const PERMISSION_LABELS: Record<keyof StaffPermissions, string> = {
  role: "الدور",
  can_view_orders: "عرض الطلبات",
  can_accept_orders: "قبول الطلبات",
  can_reject_orders: "رفض الطلبات",
  can_complete_orders: "إكمال الطلبات",
  can_edit_orders: "تعديل الطلبات",
  can_create_manual_order: "إنشاء طلب يدوي",
  can_view_menu: "عرض المنيو",
  can_edit_menu: "تعديل المنيو",
  can_add_menu_items: "إضافة أصناف",
  can_delete_menu_items: "حذف أصناف",
  can_view_inventory: "عرض المخزون",
  can_edit_inventory: "تعديل المخزون",
  can_view_reports: "عرض التقارير",
  can_export_data: "تصدير البيانات",
  can_view_promotions: "عرض العروض",
  can_manage_promotions: "إدارة العروض",
  can_view_settings: "عرض الإعدادات",
  can_edit_settings: "تعديل الإعدادات",
  can_manage_staff: "إدارة الموظفين",
};

export const PERMISSION_GROUPS = [
  { label: "الطلبات", keys: ["can_view_orders","can_accept_orders","can_reject_orders","can_complete_orders","can_create_manual_order"] },
  { label: "المنيو", keys: ["can_view_menu","can_edit_menu","can_add_menu_items","can_delete_menu_items"] },
  { label: "المخزون", keys: ["can_view_inventory","can_edit_inventory"] },
  { label: "التقارير والبيانات", keys: ["can_view_reports","can_export_data"] },
  { label: "العروض", keys: ["can_view_promotions","can_manage_promotions"] },
  { label: "الإعدادات", keys: ["can_view_settings","can_edit_settings"] },
  { label: "إدارة الموظفين", keys: ["can_manage_staff"] },
];

// جلب كل موظفي المطعم مع صلاحياتهم
export const fetchStaff = async (restaurantId: string): Promise<StaffMember[]> => {
  const { data: users, error } = await supabase
    .from("users")
    .select("id, email, full_name, role, is_active, temp_password, created_at")
    .eq("restaurant_id", restaurantId)
    .eq("role", "staff")
    .order("created_at", { ascending: false });

  if (error || !users) return [];

  const { data: perms } = await supabase
    .from("staff_permissions")
    .select("*")
    .eq("restaurant_id", restaurantId);

  return users.map(u => ({
    ...u,
    full_name: u.full_name || u.email,
    permissions: perms?.find((p: any) => p.user_id === u.id) as StaffPermissions | undefined,
  }));
};

// إنشاء موظف جديد
export const createStaff = async (
  restaurantId: string,
  email: string,
  password: string,
  fullName: string,
  rolePreset: "manager" | "cashier" | "staff"
): Promise<{ success: boolean; error?: string }> => {
  const passwordHash = btoa(password); // same hashing as rest of app

  const { data, error } = await supabase.rpc("create_staff_user", {
    p_restaurant_id: restaurantId,
    p_email: email.toLowerCase(),
    p_password_hash: passwordHash,
    p_full_name: fullName,
    p_role: rolePreset,
  });

  if (error) return { success: false, error: error.message };
  return { success: true };
};

// تحديث صلاحيات موظف
export const updateStaffPermissions = async (
  restaurantId: string,
  userId: string,
  permissions: Partial<StaffPermissions>
): Promise<{ success: boolean; error?: string }> => {
  const { error } = await supabase
    .from("staff_permissions")
    .upsert({ restaurant_id: restaurantId, user_id: userId, ...permissions },
             { onConflict: "restaurant_id,user_id" });

  if (error) return { success: false, error: error.message };
  return { success: true };
};

// تفعيل/تعطيل موظف
export const toggleStaffActive = async (userId: string, isActive: boolean) => {
  const { error } = await supabase
    .from("users").update({ is_active: isActive }).eq("id", userId);
  return !error;
};

// حذف موظف نهائياً
export const deleteStaff = async (userId: string) => {
  await supabase.from("staff_permissions").delete().eq("user_id", userId);
  const { error } = await supabase.from("users").delete().eq("id", userId);
  return !error;
};

// تحديث كلمة مرور موظف
export const resetStaffPassword = async (userId: string, newPassword: string) => {
  const { error } = await supabase.from("users")
    .update({ password_hash: btoa(newPassword), temp_password: true })
    .eq("id", userId);
  return !error;
};

// جلب صلاحيات الجلسة الحالية
export const fetchMyPermissions = async (
  restaurantId: string, userId: string
): Promise<StaffPermissions | null> => {
  const { data, error } = await supabase
    .from("staff_permissions")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .eq("user_id", userId)
    .single();
  if (error) return null;
  return data as StaffPermissions;
};

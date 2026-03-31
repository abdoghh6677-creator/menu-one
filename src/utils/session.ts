// =====================================================
// إدارة الجلسة - تسجيل خروج تلقائي بعد انتهاء المدة
// =====================================================

const SESSION_KEY = "user";
const SESSION_EXPIRY_KEY = "session_expiry";
const SESSION_DURATION_HOURS = 8; // 8 ساعات

export interface SessionUser {
  id: string;
  email: string;
  role: string;
  restaurant_id: string;
  restaurant: {
    name: string;
    slug: string;
    is_active: boolean;
  };
  temp_password: boolean;
  permissions?: StaffPermissions;
}

export interface StaffPermissions {
  role: 'owner' | 'manager' | 'cashier' | 'staff';
  can_view_orders: boolean;
  can_accept_orders: boolean;
  can_reject_orders: boolean;
  can_complete_orders: boolean;
  can_edit_orders: boolean;
  can_create_manual_order: boolean;
  can_view_menu: boolean;
  can_edit_menu: boolean;
  can_add_menu_items: boolean;
  can_delete_menu_items: boolean;
  can_view_inventory: boolean;
  can_edit_inventory: boolean;
  can_view_reports: boolean;
  can_export_data: boolean;
  can_view_promotions: boolean;
  can_manage_promotions: boolean;
  can_view_settings: boolean;
  can_edit_settings: boolean;
  can_manage_staff: boolean;
}

/** حفظ جلسة جديدة */
export const saveSession = (user: SessionUser): void => {
  const expiry = new Date();
  expiry.setHours(expiry.getHours() + SESSION_DURATION_HOURS);
  localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  localStorage.setItem(SESSION_EXPIRY_KEY, expiry.toISOString());
};

/** جلب بيانات الجلسة الحالية (null إذا انتهت أو غير موجودة) */
export const getSession = (): SessionUser | null => {
  try {
    const userData = localStorage.getItem(SESSION_KEY);
    const expiry = localStorage.getItem(SESSION_EXPIRY_KEY);
    if (!userData) return null;

    // التحقق من انتهاء الجلسة
    if (expiry && new Date() > new Date(expiry)) {
      clearSession();
      return null;
    }

    return JSON.parse(userData);
  } catch {
    clearSession();
    return null;
  }
};

/** تجديد الجلسة (لما المستخدم نشط) */
export const renewSession = (): void => {
  const user = getSession();
  if (user) saveSession(user);
};

/** حذف الجلسة */
export const clearSession = (): void => {
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(SESSION_EXPIRY_KEY);
};

/** تحديث بيانات المستخدم في الجلسة */
export const updateSessionUser = (updates: Partial<SessionUser>): void => {
  const user = getSession();
  if (user) saveSession({ ...user, ...updates });
};

/** وقت انتهاء الجلسة */
export const getSessionExpiry = (): Date | null => {
  const expiry = localStorage.getItem(SESSION_EXPIRY_KEY);
  return expiry ? new Date(expiry) : null;
};

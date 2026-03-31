import React, { useEffect, useState } from "react";
import { Plus, Edit, Trash2, UserCheck, UserX, Key, ChevronDown, ChevronUp, Shield, User } from "lucide-react";
import { Card, Button, Input, Modal, Loading, Alert } from "../../components/ui";
import {
  fetchStaff, createStaff, updateStaffPermissions, toggleStaffActive,
  deleteStaff, resetStaffPassword,
  ROLE_PRESETS, PERMISSION_LABELS, PERMISSION_GROUPS,
  type StaffMember,
} from "../../services/staffService";
import type { StaffPermissions } from "../../utils/session";
import { getSession } from "../../utils/session";

const ROLE_COLORS: Record<string, string> = {
  manager: "bg-purple-100 text-purple-700",
  cashier: "bg-blue-100 text-blue-700",
  staff:   "bg-gray-100 text-gray-600",
};
const ROLE_LABELS: Record<string, string> = {
  manager: "مدير", cashier: "كاشير", staff: "موظف",
};

// ─── Modal إضافة موظف ─────────────────────────────────────────────────────────
const AddStaffModal: React.FC<{
  isOpen: boolean; restaurantId: string;
  onClose: () => void; onDone: () => void;
}> = ({ isOpen, restaurantId, onClose, onDone }) => {
  const [form, setForm] = useState({ fullName: "", email: "", password: "", role: "cashier" as "manager"|"cashier"|"staff" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError("");
    if (!form.fullName || !form.email || !form.password) { setError("جميع الحقول مطلوبة"); return; }
    if (form.password.length < 6) { setError("كلمة المرور 6 أحرف على الأقل"); return; }
    setLoading(true);
    const res = await createStaff(restaurantId, form.email, form.password, form.fullName, form.role);
    setLoading(false);
    if (res.success) { setForm({ fullName: "", email: "", password: "", role: "cashier" }); onDone(); onClose(); }
    else setError(res.error || "فشل إنشاء الموظف");
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="إضافة موظف جديد" size="md">
      <form onSubmit={handleSubmit} className="space-y-4" dir="rtl">
        {error && <Alert type="error" message={error} />}
        <Input label="الاسم الكامل *" value={form.fullName} onChange={e => setForm({...form, fullName: e.target.value})} placeholder="مثال: أحمد محمد" />
        <Input label="البريد الإلكتروني *" type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="staff@example.com" />
        <Input label="كلمة المرور المؤقتة *" type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} placeholder="6 أحرف على الأقل" />
        <div>
          <label className="label">الدور</label>
          <select value={form.role} onChange={e => setForm({...form, role: e.target.value as any})} className="input-field w-full">
            <option value="manager">مدير</option>
            <option value="cashier">كاشير</option>
            <option value="staff">موظف</option>
          </select>
          <p className="text-xs text-gray-400 mt-1">
            {form.role === "manager" && "صلاحيات كاملة عدا إدارة الموظفين والإعدادات الحساسة"}
            {form.role === "cashier" && "الطلبات + الطلب اليدوي فقط"}
            {form.role === "staff" && "عرض الطلبات فقط — صلاحيات محدودة"}
          </p>
        </div>
        <div className="flex gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onClose} fullWidth>إلغاء</Button>
          <Button type="submit" loading={loading} fullWidth>إضافة الموظف</Button>
        </div>
      </form>
    </Modal>
  );
};

// ─── Modal تعديل الصلاحيات ────────────────────────────────────────────────────
const PermissionsModal: React.FC<{
  isOpen: boolean; staff: StaffMember | null;
  restaurantId: string;
  onClose: () => void; onDone: () => void;
}> = ({ isOpen, staff, restaurantId, onClose, onDone }) => {
  const [perms, setPerms] = useState<Partial<StaffPermissions>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (staff?.permissions) setPerms(() => ({ ...staff.permissions }));
    else if (staff) setPerms(() => ({ ...ROLE_PRESETS[staff.permissions?.role || "staff"] }));
  }, [staff]);

  const applyPreset = (preset: string) => setPerms({ ...ROLE_PRESETS[preset] });

  const toggle = (key: string) =>
    setPerms(p => ({ ...p, [key]: !p[key as keyof StaffPermissions] }));

  const toggleGroup = (label: string) =>
    setOpenGroups(g => ({ ...g, [label]: !g[label] }));

  const handleSave = async () => {
    if (!staff) return;
    setLoading(true); setError("");
    const res = await updateStaffPermissions(restaurantId, staff.id, perms);
    setLoading(false);
    if (res.success) { onDone(); onClose(); }
    else setError(res.error || "فشل الحفظ");
  };

  if (!staff) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`صلاحيات: ${staff.full_name}`} size="lg">
      <div className="space-y-4" dir="rtl">
        {error && <Alert type="error" message={error} />}

        {/* Presets */}
        <div>
          <p className="text-sm font-medium text-gray-600 mb-2">تطبيق إعدادات جاهزة:</p>
          <div className="flex gap-2">
            {(["manager","cashier","staff"] as const).map(r => (
              <button key={r} onClick={() => applyPreset(r)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${ROLE_COLORS[r]} border-transparent hover:border-gray-300`}>
                {ROLE_LABELS[r]}
              </button>
            ))}
          </div>
        </div>

        {/* Permission Groups */}
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {PERMISSION_GROUPS.map(group => (
            <div key={group.label} className="border border-gray-200 rounded-xl overflow-hidden">
              <button
                onClick={() => toggleGroup(group.label)}
                className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <span className="font-medium text-gray-700 text-sm">{group.label}</span>
                {openGroups[group.label] ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
              </button>
              {openGroups[group.label] && (
                <div className="px-4 py-3 space-y-2 bg-white">
                  {group.keys.map(key => (
                    <label key={key} className="flex items-center justify-between gap-3 cursor-pointer">
                      <span className="text-sm text-gray-700">{PERMISSION_LABELS[key as keyof StaffPermissions]}</span>
                      <div
                        onClick={() => toggle(key)}
                        className={`relative w-10 h-5 rounded-full transition-colors cursor-pointer ${perms[key as keyof StaffPermissions] ? "bg-accent" : "bg-gray-200"}`}
                      >
                        <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${perms[key as keyof StaffPermissions] ? "translate-x-5" : "translate-x-0.5"}`} />
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="flex gap-3 pt-2 border-t">
          <Button variant="outline" onClick={onClose} fullWidth>إلغاء</Button>
          <Button loading={loading} onClick={handleSave} fullWidth>حفظ الصلاحيات</Button>
        </div>
      </div>
    </Modal>
  );
};

// ─── Modal إعادة تعيين كلمة المرور ──────────────────────────────────────────
const ResetPasswordModal: React.FC<{
  isOpen: boolean; staff: StaffMember | null;
  onClose: () => void; onDone: () => void;
}> = ({ isOpen, staff, onClose, onDone }) => {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleReset = async () => {
    if (!staff) return;
    if (password.length < 6) { setError("6 أحرف على الأقل"); return; }
    setLoading(true);
    const ok = await resetStaffPassword(staff.id, password);
    setLoading(false);
    if (ok) { setPassword(""); onDone(); onClose(); }
    else setError("فشل تغيير كلمة المرور");
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`إعادة تعيين كلمة مرور: ${staff?.full_name}`} size="sm">
      <div className="space-y-4" dir="rtl">
        {error && <Alert type="error" message={error} />}
        <Input label="كلمة المرور الجديدة" type="password" value={password}
          onChange={e => setPassword(e.target.value)} placeholder="6 أحرف على الأقل" />
        <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded-lg">
          سيُطلب من الموظف تغييرها عند أول تسجيل دخول
        </p>
        <div className="flex gap-3">
          <Button variant="outline" onClick={onClose} fullWidth>إلغاء</Button>
          <Button loading={loading} onClick={handleReset} fullWidth>تغيير كلمة المرور</Button>
        </div>
      </div>
    </Modal>
  );
};

// ─── الصفحة الرئيسية ──────────────────────────────────────────────────────────
const Staff: React.FC = () => {
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [restaurantId, setRestaurantId] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [showPerms, setShowPerms] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [selected, setSelected] = useState<StaffMember | null>(null);

  const loadStaff = async (rid: string) => {
    setLoading(true);
    const data = await fetchStaff(rid);
    setStaffList(data);
    setLoading(false);
  };

  useEffect(() => {
    const user = getSession();
    if (!user?.restaurant_id) return;
    setRestaurantId(user.restaurant_id);
    loadStaff(user.restaurant_id);
  }, []);

  const handleToggle = async (member: StaffMember) => {
    await toggleStaffActive(member.id, !member.is_active);
    loadStaff(restaurantId);
  };

  const handleDelete = async (member: StaffMember) => {
    if (!confirm(`حذف موظف "${member.full_name}" نهائياً؟`)) return;
    await deleteStaff(member.id);
    loadStaff(restaurantId);
  };

  if (loading) return <Loading text="جاري تحميل الموظفين..." />;

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-text mb-1">إدارة الموظفين</h2>
          <p className="text-text-secondary text-sm">إدارة حسابات الموظفين وصلاحياتهم</p>
        </div>
        <Button icon={<Plus className="w-4 h-4" />} onClick={() => setShowAdd(true)}>
          إضافة موظف
        </Button>
      </div>

      {staffList.length === 0 ? (
        <Card className="text-center py-16">
          <User className="w-14 h-14 text-gray-300 mx-auto mb-3" />
          <p className="font-semibold text-gray-600 mb-1">لا يوجد موظفون بعد</p>
          <p className="text-sm text-gray-400 mb-4">أضف أول موظف لمطعمك</p>
          <Button icon={<Plus className="w-4 h-4" />} onClick={() => setShowAdd(true)}>إضافة موظف</Button>
        </Card>
      ) : (
        <div className="grid gap-4">
          {staffList.map(member => (
            <Card key={member.id} className={!member.is_active ? "opacity-60" : ""}>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                {/* Avatar */}
                <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-accent font-bold text-lg">
                    {(member.full_name || member.email)[0].toUpperCase()}
                  </span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="font-bold text-gray-800">{member.full_name}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_COLORS[member.permissions?.role || "staff"]}`}>
                      {ROLE_LABELS[member.permissions?.role || "staff"]}
                    </span>
                    {!member.is_active && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-600">معطّل</span>
                    )}
                    {member.temp_password && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">كلمة مرور مؤقتة</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500">{member.email}</p>

                  {/* Permissions summary */}
                  {member.permissions && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {member.permissions.can_create_manual_order && <span className="text-xs bg-green-50 text-green-700 px-1.5 py-0.5 rounded">طلب يدوي</span>}
                      {member.permissions.can_edit_menu && <span className="text-xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">تعديل المنيو</span>}
                      {member.permissions.can_view_reports && <span className="text-xs bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded">التقارير</span>}
                      {member.permissions.can_edit_inventory && <span className="text-xs bg-orange-50 text-orange-700 px-1.5 py-0.5 rounded">المخزون</span>}
                      {member.permissions.can_manage_staff && <span className="text-xs bg-red-50 text-red-700 px-1.5 py-0.5 rounded">إدارة الموظفين</span>}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2 flex-wrap">
                  <Button size="sm" variant="outline"
                    icon={<Shield className="w-3.5 h-3.5" />}
                    onClick={() => { setSelected(member); setShowPerms(true); }}>
                    الصلاحيات
                  </Button>
                  <Button size="sm" variant="outline"
                    icon={<Key className="w-3.5 h-3.5" />}
                    onClick={() => { setSelected(member); setShowReset(true); }}>
                    كلمة المرور
                  </Button>
                  <Button size="sm" variant="outline"
                    icon={member.is_active ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                    onClick={() => handleToggle(member)}>
                    {member.is_active ? "تعطيل" : "تفعيل"}
                  </Button>
                  <Button size="sm" variant="outline"
                    icon={<Trash2 className="w-3.5 h-3.5 text-red-500" />}
                    onClick={() => handleDelete(member)} />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <AddStaffModal isOpen={showAdd} restaurantId={restaurantId}
        onClose={() => setShowAdd(false)} onDone={() => loadStaff(restaurantId)} />
      <PermissionsModal isOpen={showPerms} staff={selected} restaurantId={restaurantId}
        onClose={() => setShowPerms(false)} onDone={() => loadStaff(restaurantId)} />
      <ResetPasswordModal isOpen={showReset} staff={selected}
        onClose={() => setShowReset(false)} onDone={() => loadStaff(restaurantId)} />
    </div>
  );
};

export default Staff;

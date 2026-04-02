import React, { useEffect, useState } from "react";
import { Package, Plus, Minus, Edit, Trash2, AlertTriangle, RefreshCw, ChevronDown, Link as LinkIcon } from "lucide-react";
import { Card, Button, Input, Modal, Loading, Alert, Badge } from "../../components/ui";
import {
  fetchSimpleStock, updateSimpleStock, adjustSimpleStock,
  fetchIngredients, createIngredient, updateIngredient, deleteIngredient, adjustIngredient,
  fetchItemIngredients, upsertItemIngredient, deleteItemIngredient,
  getLowStockItems, fetchMovements,
  type SimpleStock, type Ingredient, type ItemIngredient,
} from "../../services/inventoryService";
import { getSession } from "../../utils/session";
import { formatCurrency } from "../../utils/helpers";

// ─── Tab type ────────────────────────────────────────────────────────────────
type Tab = "simple" | "ingredients" | "movements";

// ─── Simple Stock Tab ────────────────────────────────────────────────────────
const SimpleStockTab: React.FC<{ restaurantId: string; userId: string }> = ({ restaurantId, userId }) => {
  const [items, setItems] = useState<SimpleStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [editItem, setEditItem] = useState<SimpleStock | null>(null);
  const [adjustItem, setAdjustItem] = useState<SimpleStock | null>(null);
  const [editForm, setEditForm] = useState({ track: false, qty: "", minAlert: "5" });
  const [adjustDelta, setAdjustDelta] = useState("");
  const [adjustNote, setAdjustNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const load = async () => { setLoading(true); setItems(await fetchSimpleStock(restaurantId)); setLoading(false); };
  useEffect(() => { load(); }, [restaurantId]);

  const openEdit = (item: SimpleStock) => {
    setEditItem(item);
    setEditForm({ track: item.track_inventory, qty: item.stock_quantity?.toString() ?? "", minAlert: item.min_stock_alert?.toString() ?? "5" });
  };

  const saveEdit = async () => {
    if (!editItem) return;
    setSaving(true);
    await updateSimpleStock(editItem.id, editForm.track, editForm.track ? parseInt(editForm.qty) || 0 : null, parseInt(editForm.minAlert) || 5);
    setSaving(false); setEditItem(null); load();
  };

  const saveAdjust = async () => {
    if (!adjustItem || !adjustDelta) return;
    setSaving(true);
    await adjustSimpleStock(adjustItem.id, parseInt(adjustDelta), adjustNote || "تعديل يدوي", restaurantId, userId);
    setSaving(false); setAdjustItem(null); setAdjustDelta(""); setAdjustNote(""); load();
  };

  const filtered = items.filter(i =>
    (i.name_ar || i.name || "").includes(searchTerm) || (i.category_ar || i.category || "").includes(searchTerm)
  );

  if (loading) return <Loading text="جاري التحميل..." />;

  return (
    <div className="space-y-4">
      <div className="flex gap-3 items-center">
        <Input placeholder="بحث في الأصناف..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="flex-1" />
        <Button size="sm" variant="outline" icon={<RefreshCw className="w-4 h-4" />} onClick={load}>تحديث</Button>
      </div>

      {/* Low stock warning */}
      {items.filter(i => i.track_inventory && i.stock_quantity !== null && i.stock_quantity <= i.min_stock_alert).length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <p className="text-sm text-amber-700 font-medium">
            {items.filter(i => i.track_inventory && i.stock_quantity !== null && i.stock_quantity <= i.min_stock_alert).length} صنف وصل للحد الأدنى
          </p>
        </div>
      )}

      <div className="grid gap-3">
        {filtered.map(item => {
          const isLow = item.track_inventory && item.stock_quantity !== null && item.stock_quantity <= item.min_stock_alert;
          const isOut = item.track_inventory && item.stock_quantity !== null && item.stock_quantity === 0;
          return (
            <Card key={item.id} className={isOut ? "border-red-200 bg-red-50/30" : isLow ? "border-amber-200 bg-amber-50/30" : ""}>
              <div className="flex items-center gap-4">
                {item.image_url ? (
                  <img src={
                    item.image_url?.startsWith('http') 
                      ? item.image_url 
                      : `https://res.cloudinary.com/dpjxle26o/image/upload/${item.image_url}`
                  } alt={item.name_ar || item.name} className="w-14 h-14 rounded-lg object-cover flex-shrink-0" />
                ) : (
                  <div className="w-14 h-14 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <Package className="w-6 h-6 text-gray-300" />
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-semibold text-gray-800">{item.name_ar || item.name}</h4>
                    {item.category_ar && <span className="text-xs text-gray-400">{item.category_ar}</span>}
                    {isOut && <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium">نفد المخزون</span>}
                    {isLow && !isOut && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">مخزون منخفض</span>}
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-sm">
                    {item.track_inventory ? (
                      <span className={`font-bold text-lg ${isOut ? "text-red-500" : isLow ? "text-amber-600" : "text-gray-800"}`}>
                        {item.stock_quantity ?? 0} <span className="text-xs font-normal text-gray-400">قطعة</span>
                      </span>
                    ) : (
                      <span className="text-gray-400 text-sm">غير محدد</span>
                    )}
                    <span className="text-gray-400">{formatCurrency(item.base_price)}</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  {item.track_inventory && (
                    <Button size="sm" variant="outline" icon={<RefreshCw className="w-3.5 h-3.5" />}
                      onClick={() => setAdjustItem(item)}>تعديل</Button>
                  )}
                  <Button size="sm" variant="outline" icon={<Edit className="w-3.5 h-3.5" />}
                    onClick={() => openEdit(item)}>إعداد</Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Edit Modal */}
      <Modal isOpen={!!editItem} onClose={() => setEditItem(null)} title={`إعداد مخزون: ${editItem?.name_ar || editItem?.name}`} size="sm">
        <div className="space-y-4" dir="rtl">
          <label className="flex items-center gap-3 cursor-pointer">
            <div onClick={() => setEditForm(f => ({...f, track: !f.track}))}
              className={`relative w-10 h-5 rounded-full transition-colors ${editForm.track ? "bg-accent" : "bg-gray-200"}`}>
              <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${editForm.track ? "translate-x-5" : "translate-x-0.5"}`} />
            </div>
            <span className="text-sm font-medium">تفعيل تتبع المخزون</span>
          </label>
          {editForm.track && (
            <>
              <Input label="الكمية الحالية" type="number" value={editForm.qty}
                onChange={e => setEditForm(f => ({...f, qty: e.target.value}))} placeholder="0" />
              <Input label="حد التنبيه (الحد الأدنى)" type="number" value={editForm.minAlert}
                onChange={e => setEditForm(f => ({...f, minAlert: e.target.value}))} placeholder="5" />
            </>
          )}
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setEditItem(null)} fullWidth>إلغاء</Button>
            <Button loading={saving} onClick={saveEdit} fullWidth>حفظ</Button>
          </div>
        </div>
      </Modal>

      {/* Adjust Modal */}
      <Modal isOpen={!!adjustItem} onClose={() => setAdjustItem(null)} title={`تعديل مخزون: ${adjustItem?.name_ar || adjustItem?.name}`} size="sm">
        <div className="space-y-4" dir="rtl">
          <p className="text-sm text-gray-500">المخزون الحالي: <strong>{adjustItem?.stock_quantity ?? 0} قطعة</strong></p>
          <Input label="الكمية (موجبة للإضافة، سالبة للخصم)" type="number" value={adjustDelta}
            onChange={e => setAdjustDelta(e.target.value)} placeholder="مثال: 10 أو -5" />
          <Input label="ملاحظة" value={adjustNote} onChange={e => setAdjustNote(e.target.value)} placeholder="سبب التعديل..." />
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setAdjustItem(null)} fullWidth>إلغاء</Button>
            <Button loading={saving} onClick={saveAdjust} fullWidth>تأكيد التعديل</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

// ─── Ingredients Tab ─────────────────────────────────────────────────────────
const IngredientsTab: React.FC<{ restaurantId: string; userId: string }> = ({ restaurantId, userId }) => {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editIng, setEditIng] = useState<Ingredient | null>(null);
  const [adjustIng, setAdjustIng] = useState<Ingredient | null>(null);
  const [form, setForm] = useState({ name: "", unit: "kg", current_qty: "", min_qty: "", cost_per_unit: "", supplier_name: "" });
  const [adjustDelta, setAdjustDelta] = useState("");
  const [adjustNote, setAdjustNote] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => { setLoading(true); setIngredients(await fetchIngredients(restaurantId)); setLoading(false); };
  useEffect(() => { load(); }, [restaurantId]);

  const openEdit = (ing: Ingredient) => {
    setEditIng(ing);
    setForm({ name: ing.name, unit: ing.unit, current_qty: ing.current_qty.toString(),
      min_qty: ing.min_qty.toString(), cost_per_unit: ing.cost_per_unit?.toString() || "",
      supplier_name: ing.supplier_name || "" });
  };

  const handleSave = async () => {
    setSaving(true);
    const data = { name: form.name, unit: form.unit, current_qty: parseFloat(form.current_qty) || 0,
      min_qty: parseFloat(form.min_qty) || 0, cost_per_unit: form.cost_per_unit ? parseFloat(form.cost_per_unit) : null,
      supplier_name: form.supplier_name || null };
    if (editIng) await updateIngredient(editIng.id, data);
    else await createIngredient(restaurantId, data);
    setSaving(false); setShowAdd(false); setEditIng(null);
    setForm({ name: "", unit: "kg", current_qty: "", min_qty: "", cost_per_unit: "", supplier_name: "" });
    load();
  };

  const handleAdjust = async () => {
    if (!adjustIng || !adjustDelta) return;
    setSaving(true);
    await adjustIngredient(adjustIng.id, parseFloat(adjustDelta), adjustNote || "تعديل يدوي", restaurantId, userId);
    setSaving(false); setAdjustIng(null); setAdjustDelta(""); setAdjustNote(""); load();
  };

  const ingForm = (
    <div className="space-y-3" dir="rtl">
      <Input label="اسم المكوّن *" value={form.name} onChange={e => setForm(f=>({...f,name:e.target.value}))} placeholder="مثال: دقيق، زيت، لحم..." />
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">الوحدة</label>
          <select value={form.unit} onChange={e => setForm(f=>({...f,unit:e.target.value}))} className="input-field w-full">
            {["kg","g","L","ml","قطعة","علبة","كيس","كرتون"].map(u => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
        <Input label="الكمية الحالية" type="number" value={form.current_qty} onChange={e => setForm(f=>({...f,current_qty:e.target.value}))} placeholder="0" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Input label="الحد الأدنى للتنبيه" type="number" value={form.min_qty} onChange={e => setForm(f=>({...f,min_qty:e.target.value}))} placeholder="0" />
        <Input label="التكلفة لكل وحدة (ج.م)" type="number" value={form.cost_per_unit} onChange={e => setForm(f=>({...f,cost_per_unit:e.target.value}))} placeholder="0.00" />
      </div>
      <Input label="اسم المورد" value={form.supplier_name} onChange={e => setForm(f=>({...f,supplier_name:e.target.value}))} placeholder="اختياري" />
    </div>
  );

  if (loading) return <Loading text="جاري التحميل..." />;

  return (
    <div className="space-y-4">
      <div className="flex justify-between">
        <p className="text-sm text-gray-500">{ingredients.length} مكوّن</p>
        <Button size="sm" icon={<Plus className="w-4 h-4" />} onClick={() => setShowAdd(true)}>إضافة مكوّن</Button>
      </div>

      {ingredients.filter(i => i.current_qty <= i.min_qty).length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600" />
          <p className="text-sm text-amber-700 font-medium">
            {ingredients.filter(i => i.current_qty <= i.min_qty).length} مكوّن وصل للحد الأدنى
          </p>
        </div>
      )}

      <div className="grid gap-3">
        {ingredients.map(ing => {
          const isLow = ing.current_qty <= ing.min_qty;
          return (
            <Card key={ing.id} className={isLow ? "border-amber-200" : ""}>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-semibold text-gray-800">{ing.name}</h4>
                    {isLow && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">منخفض</span>}
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                    <span className={`font-bold text-base ${isLow ? "text-amber-600" : "text-gray-800"}`}>
                      {ing.current_qty} <span className="text-xs font-normal">{ing.unit}</span>
                    </span>
                    <span>الحد الأدنى: {ing.min_qty} {ing.unit}</span>
                    {ing.cost_per_unit && <span>{formatCurrency(ing.cost_per_unit)}/{ing.unit}</span>}
                    {ing.supplier_name && <span>المورد: {ing.supplier_name}</span>}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" icon={<RefreshCw className="w-3.5 h-3.5" />} onClick={() => setAdjustIng(ing)}>تعديل</Button>
                  <Button size="sm" variant="outline" icon={<Edit className="w-3.5 h-3.5" />} onClick={() => openEdit(ing)}>تعديل</Button>
                  <Button size="sm" variant="outline" icon={<Trash2 className="w-3.5 h-3.5 text-red-400" />}
                    onClick={async () => { if (confirm("حذف هذا المكوّن؟")) { await deleteIngredient(ing.id); load(); } }} />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <Modal isOpen={showAdd || !!editIng} onClose={() => { setShowAdd(false); setEditIng(null); }}
        title={editIng ? "تعديل مكوّن" : "إضافة مكوّن جديد"} size="md">
        <div className="space-y-4">
          {ingForm}
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => { setShowAdd(false); setEditIng(null); }} fullWidth>إلغاء</Button>
            <Button loading={saving} onClick={handleSave} fullWidth>{editIng ? "حفظ" : "إضافة"}</Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={!!adjustIng} onClose={() => setAdjustIng(null)} title={`تعديل: ${adjustIng?.name}`} size="sm">
        <div className="space-y-4" dir="rtl">
          <p className="text-sm text-gray-500">الكمية الحالية: <strong>{adjustIng?.current_qty} {adjustIng?.unit}</strong></p>
          <Input label="الكمية (موجبة للإضافة، سالبة للخصم)" type="number" value={adjustDelta} onChange={e => setAdjustDelta(e.target.value)} placeholder="+10 أو -5" />
          <Input label="ملاحظة" value={adjustNote} onChange={e => setAdjustNote(e.target.value)} placeholder="سبب التعديل..." />
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setAdjustIng(null)} fullWidth>إلغاء</Button>
            <Button loading={saving} onClick={handleAdjust} fullWidth>تأكيد</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

// ─── Movements Tab ────────────────────────────────────────────────────────────
const MovementsTab: React.FC<{ restaurantId: string }> = ({ restaurantId }) => {
  const [movements, setMovements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMovements(restaurantId).then(d => { setMovements(d); setLoading(false); });
  }, [restaurantId]);

  const typeLabel: Record<string, { label: string; color: string }> = {
    in: { label: "إضافة", color: "text-green-600 bg-green-50" },
    out: { label: "سحب", color: "text-red-600 bg-red-50" },
    adjust: { label: "تعديل", color: "text-blue-600 bg-blue-50" },
    order_deduct: { label: "خصم طلب", color: "text-orange-600 bg-orange-50" },
  };

  if (loading) return <Loading text="جاري التحميل..." />;

  return (
    <div className="space-y-3">
      {movements.length === 0 ? (
        <div className="text-center py-12 text-gray-400">لا توجد حركات بعد</div>
      ) : movements.map(m => {
        const t = typeLabel[m.movement_type] || { label: m.movement_type, color: "text-gray-600 bg-gray-50" };
        return (
          <Card key={m.id} className="py-3">
            <div className="flex items-center gap-3">
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${t.color}`}>{t.label}</span>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-700">{m.note || "—"}</p>
                <p className="text-xs text-gray-400">{new Date(m.created_at).toLocaleString("ar-EG", {
                  timeZone: 'Africa/Cairo',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}</p>
              </div>
              <span className={`font-bold ${m.movement_type === "in" ? "text-green-600" : "text-red-500"}`}>
                {m.movement_type === "in" ? "+" : "-"}{m.qty}
              </span>
            </div>
          </Card>
        );
      })}
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
const Inventory: React.FC = () => {
  const [tab, setTab] = useState<Tab>("simple");
  const [restaurantId, setRestaurantId] = useState("");
  const [userId, setUserId] = useState("");

  useEffect(() => {
    const s = getSession();
    if (s) { setRestaurantId(s.restaurant_id); setUserId(s.id); }
  }, []);

  const tabs: { key: Tab; label: string }[] = [
    { key: "simple", label: "مخزون الأصناف" },
    { key: "ingredients", label: "المواد الخام" },
    { key: "movements", label: "سجل الحركات" },
  ];

  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h2 className="text-2xl font-bold text-text mb-1">إدارة المخزون</h2>
        <p className="text-text-secondary text-sm">تتبع كميات الأصناف والمواد الخام</p>
      </div>

      <div className="flex gap-1 border-b">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key ? "border-accent text-accent" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {restaurantId && (
        <>
          {tab === "simple" && <SimpleStockTab restaurantId={restaurantId} userId={userId} />}
          {tab === "ingredients" && <IngredientsTab restaurantId={restaurantId} userId={userId} />}
          {tab === "movements" && <MovementsTab restaurantId={restaurantId} />}
        </>
      )}
    </div>
  );
};

export default Inventory;

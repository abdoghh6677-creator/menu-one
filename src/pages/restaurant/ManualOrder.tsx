import React, { useEffect, useState, useRef } from "react";
import { Plus, Minus, X, Printer, Search, Package, CheckCircle } from "lucide-react";
import { Card, Button, Input, Modal, Alert } from "../../components/ui";
import { subscribeToMenuItems, createOrder } from "../../services/restaurantService";
import type { MenuItem } from "../../config/supabase";
import { getSession } from "../../utils/session";
import { formatCurrency } from "../../utils/helpers";

interface CartItem extends MenuItem {
  quantity: number;
  selectedSize?: { name: string; name_ar?: string; price: number };
  selectedAddons: { name: string; name_ar?: string; price: number }[];
  itemTotal: number;
  note?: string;
}

// ─── Print receipt ────────────────────────────────────────────────────────────
const printReceipt = (order: any, restaurant: string) => {
  const win = window.open("", "_blank", "width=380,height=600");
  if (!win) return;

  const rows = order.items.map((item: any) =>
    `<tr>
      <td style="padding:4px 2px">${item.name}${item.selectedSize ? ` (${item.selectedSize.name_ar || item.selectedSize.name})` : ""}</td>
      <td style="text-align:center;padding:4px 8px">${item.quantity}</td>
      <td style="text-align:left;padding:4px 2px">${(item.itemTotal * item.quantity).toFixed(2)}</td>
    </tr>`
  ).join("");

  win.document.write(`
    <html dir="rtl"><head><meta charset="UTF-8">
    <style>
      body{font-family:Arial,sans-serif;font-size:13px;max-width:320px;margin:0 auto;padding:16px}
      h2{text-align:center;font-size:16px;margin-bottom:4px}
      .sub{text-align:center;color:#666;font-size:12px;margin-bottom:12px}
      table{width:100%;border-collapse:collapse}
      tr{border-bottom:1px dashed #ddd}
      .total{font-size:15px;font-weight:bold;text-align:center;margin-top:12px;padding-top:8px;border-top:2px solid #000}
      .footer{text-align:center;color:#999;font-size:11px;margin-top:16px}
    </style></head><body>
    <h2>${restaurant}</h2>
    <div class="sub">طلب يدوي — ${new Date().toLocaleString("ar-EG", {
      timeZone: 'Africa/Cairo',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })}</div>
    ${order.customerName ? `<p style="text-align:center;font-size:12px">العميل: ${order.customerName}${order.customerPhone ? ` | ${order.customerPhone}` : ""}</p>` : ""}
    ${order.tableNumber ? `<p style="text-align:center;font-size:12px">طاولة: ${order.tableNumber}</p>` : ""}
    <table>
      <thead><tr style="font-weight:bold"><th style="text-align:right">الصنف</th><th>الكمية</th><th style="text-align:left">الإجمالي</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="total">الإجمالي: ${order.total.toFixed(2)} ج.م</div>
    <div class="footer">شكراً لزيارتكم ✦</div>
    </body></html>
  `);
  win.document.close();
  win.focus();
  setTimeout(() => { win.print(); win.close(); }, 400);
};

// ─── Item card ────────────────────────────────────────────────────────────────
const ItemCard: React.FC<{
  item: MenuItem;
  qty: number;
  onAdd: (item: MenuItem) => void;
  onRemove: (itemId: string) => void;
  onOpenCustom: (item: MenuItem) => void;
}> = ({ item, qty, onAdd, onRemove, onOpenCustom }) => {
  const hasVariations = (item.sizes?.length || 0) > 0 || (item.addons?.length || 0) > 0;
  const name = item.name_ar || item.name;
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
      {item.image_url && (
        <img src={item.image_url} alt={name} className="w-full h-24 object-cover" loading="lazy" />
      )}
      <div className="p-3">
        <p className="font-semibold text-sm text-gray-800 mb-1 line-clamp-2 min-h-[2.4rem]">{name}</p>
        <p className="text-accent font-bold text-sm mb-2">{formatCurrency(item.base_price)}</p>
        {qty === 0 ? (
          <button
            onClick={() => hasVariations ? onOpenCustom(item) : onAdd(item)}
            className="w-full border-2 border-accent text-accent font-bold text-xs py-1.5 rounded-lg hover:bg-accent hover:text-white transition-colors"
          >إضافة</button>
        ) : (
          <div className="flex items-center bg-accent text-white rounded-lg overflow-hidden">
            <button onClick={() => onRemove(item.id)} className="px-2 py-1.5 hover:bg-black/10 flex-shrink-0">
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="flex-1 text-center font-bold text-sm">{qty}</span>
            <button onClick={() => hasVariations ? onOpenCustom(item) : onAdd(item)} className="px-2 py-1.5 hover:bg-black/10 flex-shrink-0">
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Main page ────────────────────────────────────────────────────────────────
const ManualOrder: React.FC = () => {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [restaurantId, setRestaurantId] = useState("");
  const [restaurantName, setRestaurantName] = useState("");
  const [userId, setUserId] = useState("");
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customItem, setCustomItem] = useState<MenuItem | null>(null);
  const [selectedSize, setSelectedSize] = useState<any>(null);
  const [selectedAddons, setSelectedAddons] = useState<any[]>([]);
  const [showCheckout, setShowCheckout] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [tableNumber, setTableNumber] = useState("");
  const [orderNote, setOrderNote] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cash"|"card"|"">("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [lastOrder, setLastOrder] = useState<any>(null);

  useEffect(() => {
    const s = getSession();
    if (!s?.restaurant_id) return;
    setRestaurantId(s.restaurant_id);
    setRestaurantName(s.restaurant?.name || "");
    setUserId(s.id);
    const sub = subscribeToMenuItems(s.restaurant_id, setMenuItems);
    return () => {
      sub.unsubscribe();
    };
  }, []);

  const categories = ["all", ...new Set(menuItems.map(i => i.category_ar || i.category || "").filter(Boolean))];

  const filtered = menuItems.filter(i => {
    const name = i.name_ar || i.name || "";
    const matchSearch = name.includes(searchTerm);
    const matchCat = categoryFilter === "all" || (i.category_ar || i.category) === categoryFilter;
    return matchSearch && matchCat && i.is_available;
  });

  const getQty = (id: string) => cart.reduce((s, c) => c.id === id ? s + c.quantity : s, 0);

  const addToCart = (item: MenuItem, size?: any, addons: any[] = []) => {
    const base = size ? size.price : item.base_price;
    const addonsTotal = addons.reduce((s, a) => s + a.price, 0);
    const itemTotal = base + addonsTotal;
    const cartItem: CartItem = { ...item, quantity: 1, selectedSize: size, selectedAddons: addons, itemTotal };
    const idx = cart.findIndex(c => c.id === item.id && c.selectedSize?.name === size?.name && JSON.stringify(c.selectedAddons) === JSON.stringify(addons));
    if (idx >= 0) { const nc = [...cart]; nc[idx].quantity++; setCart(nc); }
    else setCart([...cart, cartItem]);
    setShowCustomModal(false);
    setCustomItem(null); setSelectedSize(null); setSelectedAddons([]);
  };

  const removeOne = (id: string) => {
    for (let i = cart.length - 1; i >= 0; i--) {
      if (cart[i].id === id) {
        const nc = [...cart];
        nc[i].quantity--;
        if (nc[i].quantity <= 0) nc.splice(i, 1);
        setCart(nc);
        break;
      }
    }
  };

  const openCustom = (item: MenuItem) => {
    setCustomItem(item);
    setSelectedSize(item.sizes?.[0] || null);
    setSelectedAddons([]);
    setShowCustomModal(true);
  };

  const total = cart.reduce((s, c) => s + c.itemTotal * c.quantity, 0);
  const cartCount = cart.reduce((s, c) => s + c.quantity, 0);

  const handleSubmit = async () => {
    if (!paymentMethod) { setError("اختر طريقة الدفع"); return; }
    setSubmitting(true); setError("");
    const orderData = {
      restaurant_id: restaurantId,
      order_type: "counter" as const,
      table_number: tableNumber || undefined,
      customer_name: customerName || "طلب يدوي",
      customer_phone: customerPhone || undefined,
      items: cart.map(c => ({
        menu_item_id: c.id, name: c.name_ar || c.name, quantity: c.quantity,
        base_price: c.base_price, selected_size: c.selectedSize,
        selected_addons: c.selectedAddons, item_total: c.itemTotal,
      })),
      subtotal: total, tax: 0, total,
      payment_method: paymentMethod,
      customer_notes: orderNote || undefined,
    };
    const { data: orderResult, error: orderError } = await createOrder(orderData);
    setSubmitting(false);
    if (!orderError) {
      const fullOrder = { ...orderData, items: cart, total, customerName, customerPhone, tableNumber };
      setLastOrder(fullOrder);
      setSuccess(true);
    } else setError(orderError?.message || "فشل إنشاء الطلب");
  };

  const resetAll = () => {
    setCart([]); setCustomerName(""); setCustomerPhone(""); setTableNumber("");
    setOrderNote(""); setPaymentMethod(""); setSuccess(false); setError("");
    setShowCheckout(false); setLastOrder(null);
  };

  return (
    <div className="space-y-4" dir="rtl">
      <div>
        <h2 className="text-2xl font-bold text-text mb-1">طلب يدوي (كاشير)</h2>
        <p className="text-text-secondary text-sm">إنشاء طلب مباشر من لوحة التحكم</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* ─ Menu Panel ─ */}
        <div className="xl:col-span-2 space-y-3">
          <Input placeholder="بحث في المنيو..." value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)} icon={<Search className="w-4 h-4" />} />
          <div className="flex gap-2 overflow-x-auto pb-1">
            {categories.map(cat => (
              <button key={cat} onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  categoryFilter === cat ? "bg-accent text-white" : "bg-white border text-gray-600 hover:bg-gray-50"}`}>
                {cat === "all" ? "الكل" : cat}
              </button>
            ))}
          </div>
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-400"><Package className="w-10 h-10 mx-auto mb-2 opacity-30" /><p>لا توجد أصناف</p></div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {filtered.map(item => (
                <ItemCard key={item.id} item={item} qty={getQty(item.id)}
                  onAdd={addToCart} onRemove={removeOne} onOpenCustom={openCustom} />
              ))}
            </div>
          )}
        </div>

        {/* ─ Cart Panel ─ */}
        <div className="xl:col-span-1">
          <Card className="sticky top-4">
            <h3 className="font-bold text-gray-800 mb-3 flex items-center justify-between">
              <span>السلة</span>
              {cartCount > 0 && (
                <span className="bg-accent text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">{cartCount}</span>
              )}
            </h3>

            {cart.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <Package className="w-10 h-10 mx-auto mb-2 opacity-20" />
                <p className="text-sm">السلة فارغة</p>
              </div>
            ) : (
              <>
                <div className="space-y-2 max-h-64 overflow-y-auto mb-3">
                  {cart.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.name_ar || item.name}</p>
                        {item.selectedSize && <p className="text-xs text-gray-400">{item.selectedSize.name_ar || item.selectedSize.name}</p>}
                        <p className="text-xs text-accent font-semibold">{formatCurrency(item.itemTotal)}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => { const nc=[...cart]; nc[idx].quantity > 1 ? nc[idx].quantity-- : nc.splice(idx,1); setCart(nc); }}
                          className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center">
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-sm font-bold w-5 text-center">{item.quantity}</span>
                        <button onClick={() => { const nc=[...cart]; nc[idx].quantity++; setCart(nc); }}
                          className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center">
                          <Plus className="w-3 h-3" />
                        </button>
                        <button onClick={() => { const nc=[...cart]; nc.splice(idx,1); setCart(nc); }}
                          className="w-6 h-6 rounded-full bg-red-100 text-red-500 flex items-center justify-center mr-1">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="border-t pt-3">
                  <div className="flex justify-between font-bold text-lg mb-3">
                    <span>الإجمالي</span>
                    <span className="text-accent">{formatCurrency(total)}</span>
                  </div>
                  <Button fullWidth onClick={() => setShowCheckout(true)}>إتمام الطلب</Button>
                </div>
              </>
            )}
          </Card>
        </div>
      </div>

      {/* ─ Customize Modal ─ */}
      {customItem && (
        <Modal isOpen={showCustomModal} onClose={() => setShowCustomModal(false)} title={customItem.name_ar || customItem.name} size="sm">
          <div className="space-y-4" dir="rtl">
            {customItem.sizes && customItem.sizes.length > 0 && (
              <div>
                <p className="font-semibold text-sm mb-2">اختر الحجم</p>
                {customItem.sizes.map(s => (
                  <button key={s.name} onClick={() => setSelectedSize(s)}
                    className={`w-full flex justify-between p-2.5 rounded-lg border-2 mb-2 text-sm ${selectedSize?.name === s.name ? "border-accent bg-accent/5" : "border-gray-200"}`}>
                    <span>{s.name_ar || s.name}</span><span className="text-accent font-bold">{formatCurrency(s.price)}</span>
                  </button>
                ))}
              </div>
            )}
            {customItem.addons && customItem.addons.length > 0 && (
              <div>
                <p className="font-semibold text-sm mb-2">إضافات</p>
                {customItem.addons.map(a => {
                  const checked = selectedAddons.find(x => x.name === a.name);
                  return (
                    <button key={a.name} onClick={() => setSelectedAddons(checked ? selectedAddons.filter(x => x.name !== a.name) : [...selectedAddons, a])}
                      className={`w-full flex justify-between p-2.5 rounded-lg border-2 mb-2 text-sm ${checked ? "border-accent bg-accent/5" : "border-gray-200"}`}>
                      <span>{a.name_ar || a.name}</span><span className="text-accent">+{formatCurrency(a.price)}</span>
                    </button>
                  );
                })}
              </div>
            )}
            <Button fullWidth onClick={() => addToCart(customItem, selectedSize, selectedAddons)}>
              إضافة — {formatCurrency((selectedSize?.price || customItem.base_price) + selectedAddons.reduce((s,a)=>s+a.price,0))}
            </Button>
          </div>
        </Modal>
      )}

      {/* ─ Checkout Modal ─ */}
      <Modal isOpen={showCheckout && !success} onClose={() => setShowCheckout(false)} title="تفاصيل الطلب" size="md">
        <div className="space-y-4" dir="rtl">
          {error && <Alert type="error" message={error} />}
          <div className="grid grid-cols-2 gap-3">
            <Input label="اسم العميل" value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="اختياري" />
            <Input label="رقم الهاتف" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} placeholder="اختياري" />
          </div>
          <Input label="رقم الطاولة" value={tableNumber} onChange={e => setTableNumber(e.target.value)} placeholder="مثال: 5" />
          <div>
            <label className="label mb-2">طريقة الدفع *</label>
            <div className="grid grid-cols-2 gap-2">
              {(["cash","card"] as const).map(pm => (
                <button key={pm} onClick={() => setPaymentMethod(pm)}
                  className={`p-3 rounded-xl border-2 text-sm font-semibold transition-colors ${paymentMethod === pm ? "border-accent bg-accent/5 text-accent" : "border-gray-200 text-gray-600"}`}>
                  {pm === "cash" ? "💵 نقداً" : "💳 بطاقة"}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label mb-1">ملاحظات</label>
            <textarea value={orderNote} onChange={e => setOrderNote(e.target.value)} rows={2}
              placeholder="أي تعليمات خاصة..." className="input-field w-full" />
          </div>
          <div className="bg-gray-50 rounded-xl p-3">
            {cart.map((c,i) => (
              <div key={i} className="flex justify-between text-sm py-1">
                <span>{c.quantity}× {c.name_ar||c.name}{c.selectedSize?` (${c.selectedSize.name_ar||c.selectedSize.name})`:""}</span>
                <span>{formatCurrency(c.itemTotal*c.quantity)}</span>
              </div>
            ))}
            <div className="border-t mt-2 pt-2 flex justify-between font-bold">
              <span>الإجمالي</span><span>{formatCurrency(total)}</span>
            </div>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setShowCheckout(false)} fullWidth>إلغاء</Button>
            <Button loading={submitting} onClick={handleSubmit} fullWidth>تأكيد الطلب</Button>
          </div>
        </div>
      </Modal>

      {/* ─ Success Modal ─ */}
      <Modal isOpen={success} onClose={resetAll} title="تم إنشاء الطلب" size="sm">
        <div className="text-center space-y-4" dir="rtl">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="w-10 h-10 text-green-500" />
          </div>
          <p className="font-bold text-lg text-gray-800">تم تأكيد الطلب بنجاح!</p>
          <p className="text-gray-500 text-sm">الإجمالي: {formatCurrency(total)}</p>
          <div className="flex gap-3">
            <Button variant="outline" icon={<Printer className="w-4 h-4" />} fullWidth
              onClick={() => lastOrder && printReceipt(lastOrder, restaurantName)}>
              طباعة الفاتورة
            </Button>
            <Button fullWidth onClick={resetAll}>طلب جديد</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ManualOrder;

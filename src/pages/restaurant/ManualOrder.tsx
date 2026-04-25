import React, { useState, useEffect } from "react";
import { Plus, Minus, Search, ShoppingCart, User, Phone, MapPin, Trash2, Tag, Utensils, ClipboardList, Clock } from "lucide-react";
import { Card, Button, Input, Modal, Loading, Alert, Badge } from "../../components/ui";
import { supabase } from "../../config/supabase";
import type { MenuItem } from "../../config/supabase";
import { fetchCategories, type Category } from "../../services/categoryService";
import { subscribeToMenuItems, createOrder } from "../../services/restaurantService";
import { formatCurrency } from "../../utils/helpers";
import { getSession } from "../../utils/session";
import { t } from "../../config/translations";

interface CartItem extends MenuItem {
  quantity: number;
  selectedSize?: { name: string; price: number };
  selectedAddons: { name: string; price: number }[];
  itemTotal: number;
}

const ManualOrder: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [restaurantId, setRestaurantId] = useState("");
  
  // Form states
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [orderType, setOrderType] = useState<"qr" | "counter" | "phone">("counter");
  const [tableNumber, setTableNumber] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [notes, setNotes] = useState("");
  
  // Selection states for modal
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [selectedSize, setSelectedSize] = useState<{ name: string; price: number } | null>(null);
  const [selectedAddons, setSelectedAddons] = useState<{ name: string; price: number }[]>([]);
  
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Translation helper
  const tx = (key: string) => t("manualOrder", key, "ar");

  useEffect(() => {
    const session = getSession();
    if (session?.restaurant_id) {
      setRestaurantId(session.restaurant_id);
      loadData(session.restaurant_id);
    }
  }, []);

  const loadData = async (rid: string) => {
    setLoading(true);
    const [cats, menuItems] = await Promise.all([
      fetchCategories(rid),
      supabase.from("menu_items").select("*").eq("restaurant_id", rid).eq("is_available", true)
    ]);
    setCategories(cats);
    setItems(menuItems.data || []);
    setLoading(false);
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = (item.name_ar || item.name).toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = activeCategory === "all" || item.category === activeCategory || item.category_ar === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const addToCart = (item: MenuItem, size?: { name: string; price: number }, addons: { name: string; price: number }[] = []) => {
    const price = size ? size.price : item.base_price;
    const addonsTotal = addons.reduce((sum, a) => sum + a.price, 0);
    const itemTotal = price + addonsTotal;

    const newItem: CartItem = {
      ...item,
      quantity: 1,
      selectedSize: size,
      selectedAddons: addons,
      itemTotal
    };

    setCart(prev => [...prev, newItem]);
    setSelectedItem(null);
    setSelectedSize(null);
    setSelectedAddons([]);
  };

  const removeFromCart = (index: number) => {
    setCart(prev => prev.filter((_, i) => i !== index));
  };

  const updateQuantity = (index: number, delta: number) => {
    setCart(prev => prev.map((item, i) => {
      if (i === index) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const calculateTotal = () => {
    return cart.reduce((sum, item) => sum + (item.itemTotal * item.quantity), 0);
  };

  const handlePlaceOrder = async () => {
    if (cart.length === 0) {
      setError(tx("cartEmpty"));
      return;
    }
    if (orderType === "phone" && !customerPhone) {
      setError("رقم الهاتف مطلوب لطلبات التوصيل");
      return;
    }

    setSubmitting(true);
    setError("");

    const orderData = {
      restaurant_id: restaurantId,
      order_type: orderType,
      table_number: orderType === "qr" ? tableNumber : undefined,
      customer_name: customerName || (orderType === "counter" ? "عميل تيك أواي" : "عميل طاولة"),
      customer_phone: customerPhone,
      items: cart.map(item => ({
        menu_item_id: item.id,
        name: item.name_ar || item.name,
        quantity: item.quantity,
        base_price: item.base_price,
        selected_size: item.selectedSize,
        selected_addons: item.selectedAddons,
        item_total: item.itemTotal
      })),
      subtotal: calculateTotal(),
      tax: 0,
      total: calculateTotal(),
      customer_notes: (deliveryAddress ? `التوصيل إلى: ${deliveryAddress}\n` : "") + notes,
      status: "accepted" as const,
    };

    const { error: orderError } = await createOrder(orderData as any);
    setSubmitting(false);

    if (!orderError) {
      setSuccess(true);
      setCart([]);
      setCustomerName("");
      setCustomerPhone("");
      setTableNumber("");
      setDeliveryAddress("");
      setNotes("");
      setTimeout(() => setSuccess(false), 3000);
    } else {
      setError(orderError?.message || "فشل إنشاء الطلب");
    }
  };

  if (loading) return <Loading text="جاري تحميل المنيو..." />;

  return (
    <div className="flex flex-col lg:flex-row gap-6 min-h-[calc(100vh-200px)]" dir="rtl">
      {/* Left: Menu selection */}
      <div className="flex-1 space-y-6">
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold text-text mb-1">{tx("title")}</h2>
            <p className="text-text-secondary text-sm">{tx("subtitle")}</p>
          </div>
          <div className="w-full sm:w-64 relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder={tx("searchPlaceholder")}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="input-field w-full pr-10"
            />
          </div>
        </div>

        {/* Categories Scroller */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          <button
            onClick={() => setActiveCategory("all")}
            className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-colors ${
              activeCategory === "all" ? "bg-accent text-white" : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
            }`}
          >
            {tx("all")}
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.name)}
              className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-colors ${
                activeCategory === cat.name ? "bg-accent text-white" : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Items Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredItems.map(item => (
            <button
              key={item.id}
              onClick={() => {
                if ((item.sizes && item.sizes.length > 0) || (item.addons && item.addons.length > 0)) {
                  setSelectedItem(item);
                } else {
                  addToCart(item);
                }
              }}
              className="flex flex-col bg-white border border-gray-200 rounded-2xl overflow-hidden hover:shadow-lg transition-all text-right group"
            >
              {item.image_url ? (
                <div className="h-24 w-full overflow-hidden">
                  <img 
                    src={item.image_url?.startsWith('http') ? item.image_url : `https://res.cloudinary.com/dpjxle26o/image/upload/${item.image_url}`} 
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                    alt={item.name_ar || item.name} 
                  />
                </div>
              ) : (
                <div className="h-24 w-full bg-gray-50 flex items-center justify-center">
                  <Utensils className="w-8 h-8 text-gray-200" />
                </div>
              )}
              <div className="p-3">
                <h4 className="font-bold text-text text-sm truncate mb-1">{item.name_ar || item.name}</h4>
                <p className="text-accent font-bold text-sm">{formatCurrency(item.base_price)}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Right: Cart & Form */}
      <div className="w-full lg:w-[400px] flex flex-col gap-4">
        <Card className="flex-1 flex flex-col p-0 overflow-hidden shadow-xl border-accent/20">
          <div className="p-4 bg-accent text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              <h3 className="font-bold">{tx("cartTitle")}</h3>
            </div>
            <Badge className="bg-white/20 text-white border-none">{cart.length} {tx("items")}</Badge>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[400px] lg:max-h-none">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 py-10">
                <ClipboardList className="w-12 h-12 mb-2 opacity-20" />
                <p>{tx("cartEmpty")}</p>
                <p className="text-xs">{tx("cartEmptyDesc")}</p>
              </div>
            ) : (
              cart.map((item, index) => (
                <div key={index} className="flex gap-3 bg-gray-50 p-3 rounded-xl border border-gray-100">
                  <div className="flex-1 min-w-0">
                    <h5 className="font-bold text-sm text-gray-800 truncate">{item.name_ar || item.name}</h5>
                    {item.selectedSize && <p className="text-xs text-gray-500">{tx("selectSize")}: {item.selectedSize.name}</p>}
                    {item.selectedAddons.length > 0 && (
                      <p className="text-xs text-gray-400 line-clamp-1">{tx("addons")}: {item.selectedAddons.map(a => a.name).join(", ")}</p>
                    )}
                    <p className="text-accent font-bold text-xs mt-1">{formatCurrency(item.itemTotal * item.quantity)}</p>
                  </div>
                  <div className="flex flex-col items-center justify-between">
                    <button onClick={() => removeFromCart(index)} className="text-gray-300 hover:text-red-500">
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <div className="flex items-center gap-2 bg-white rounded-lg border border-gray-200 px-1 py-0.5 mt-2">
                      <button onClick={() => updateQuantity(index, -1)} className="p-0.5 text-gray-400 hover:text-accent"><Minus className="w-3 h-3" /></button>
                      <span className="text-xs font-bold w-4 text-center">{item.quantity}</span>
                      <button onClick={() => updateQuantity(index, 1)} className="p-0.5 text-gray-400 hover:text-accent"><Plus className="w-3 h-3" /></button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Form */}
          <div className="border-t p-4 bg-gray-50/50 space-y-4">
            <div className="grid grid-cols-3 gap-2">
              <button onClick={() => setOrderType("counter")} className={`flex flex-col items-center p-2 rounded-xl border-2 transition-all ${orderType === "counter" ? "border-accent bg-accent/5 text-accent" : "border-gray-100 bg-white text-gray-400"}`}>
                <Utensils className="w-5 h-5 mb-1" />
                <span className="text-[10px] font-bold">{tx("takeaway")}</span>
              </button>
              <button onClick={() => setOrderType("qr")} className={`flex flex-col items-center p-2 rounded-xl border-2 transition-all ${orderType === "qr" ? "border-accent bg-accent/5 text-accent" : "border-gray-100 bg-white text-gray-400"}`}>
                <Tag className="w-5 h-5 mb-1" />
                <span className="text-[10px] font-bold">{tx("dineIn")}</span>
              </button>
              <button onClick={() => setOrderType("phone")} className={`flex flex-col items-center p-2 rounded-xl border-2 transition-all ${orderType === "phone" ? "border-accent bg-accent/5 text-accent" : "border-gray-100 bg-white text-gray-400"}`}>
                <Phone className="w-5 h-5 mb-1" />
                <span className="text-[10px] font-bold">{tx("delivery")}</span>
              </button>
            </div>

            <div className="space-y-3">
              <div className="relative">
                <User className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type="text" placeholder={tx("customerName")} value={customerName} onChange={e => setCustomerName(e.target.value)} className="input-field w-full pr-10 text-sm py-2" />
              </div>
              <div className="relative">
                <Phone className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type="tel" placeholder={tx("customerPhone")} value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} className="input-field w-full pr-10 text-sm py-2" />
              </div>
              {orderType === "qr" && (
                <div className="relative">
                  <Tag className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type="text" placeholder={tx("tableNumber")} value={tableNumber} onChange={e => setTableNumber(e.target.value)} className="input-field w-full pr-10 text-sm py-2" />
                </div>
              )}
              {orderType === "phone" && (
                <div className="relative">
                  <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type="text" placeholder={tx("deliveryAddress")} value={deliveryAddress} onChange={e => setDeliveryAddress(e.target.value)} className="input-field w-full pr-10 text-sm py-2" />
                </div>
              )}
            </div>

            {error && <Alert type="error" message={error} />}
            {success && <Alert type="success" message={tx("orderSuccess")} />}

            <div className="border-t pt-3 mt-3">
              <div className="flex justify-between items-center mb-3">
                <span className="text-gray-500 font-medium">{t("customerMenu", "total", "ar")}</span>
                <span className="text-xl font-black text-text">{formatCurrency(calculateTotal())}</span>
              </div>
              <Button fullWidth onClick={handlePlaceOrder} loading={submitting} disabled={cart.length === 0} size="lg">
                {tx("confirmOrder")}
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {/* Item Options Modal */}
      <Modal isOpen={!!selectedItem} onClose={() => setSelectedItem(null)} title={selectedItem?.name_ar || selectedItem?.name || ""} size="sm">
        {selectedItem && (
          <div className="space-y-6" dir="rtl">
            {selectedItem.sizes && selectedItem.sizes.length > 0 && (
              <div>
                <h4 className="font-bold text-gray-700 mb-3 text-sm">{tx("selectSize")}</h4>
                <div className="grid grid-cols-1 gap-2">
                  {selectedItem.sizes.map(size => (
                    <button
                      key={size.name}
                      onClick={() => setSelectedSize(size)}
                      className={`flex items-center justify-between p-3 rounded-xl border-2 transition-all ${
                        selectedSize?.name === size.name ? "border-accent bg-accent/5 text-accent" : "border-gray-100 hover:border-accent/30"
                      }`}
                    >
                      <span className="font-bold text-sm">{size.name}</span>
                      <span className="font-black">{formatCurrency(size.price)}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {selectedItem.addons && selectedItem.addons.length > 0 && (
              <div>
                <h4 className="font-bold text-gray-700 mb-3 text-sm">{tx("addons")}</h4>
                <div className="grid grid-cols-1 gap-2">
                  {selectedItem.addons.map(addon => {
                    const isSelected = selectedAddons.find(a => a.name === addon.name);
                    return (
                      <button
                        key={addon.name}
                        onClick={() => {
                          if (isSelected) setSelectedAddons(prev => prev.filter(a => a.name !== addon.name));
                          else setSelectedAddons(prev => [...prev, addon]);
                        }}
                        className={`flex items-center justify-between p-3 rounded-xl border-2 transition-all ${
                          isSelected ? "border-accent bg-accent/5 text-accent" : "border-gray-100 hover:border-accent/30"
                        }`}
                      >
                        <span className="font-bold text-sm">{addon.name}</span>
                        <span className="text-gray-400">+{formatCurrency(addon.price)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <Button
              fullWidth
              onClick={() => addToCart(selectedItem, selectedSize || undefined, selectedAddons)}
              disabled={(selectedItem.sizes && selectedItem.sizes.length > 0 && !selectedSize)}
            >
              {tx("addToOrder")}
            </Button>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ManualOrder;

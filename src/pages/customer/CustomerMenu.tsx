import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ShoppingCart, Plus, Minus, X, Search, CheckCircle, Package, Globe, Clock, Utensils, Banknote, Smartphone, Copy, ExternalLink, Check } from "lucide-react";
import { Card, Button, Input, Modal, Loading, Alert, Textarea, Select } from "../../components/ui";
import { subscribeToMenuItems, createOrder, getActivePromotions, getDeliveryZones, type Promotion } from "../../services/restaurantService";
import PromotionPopup from "../../components/PromotionPopup";
import LazyImage from "../../components/LazyImage";
import type { MenuItem, DeliveryZone } from "../../config/supabase";
import { formatCurrency } from "../../utils/helpers";
import { supabase } from "../../config/supabase";
import { sendOrderViaWhatsApp } from "../../utils/notifications";
import {
  injectDynamicManifest,
  registerServiceWorker,
  capturePWAInstallPrompt,
  triggerPWAInstall,
  isPWAInstallAvailable,
  isPWAInstalled,
  isIOS,
  isInStandaloneMode
} from "../../utils/pwa";

type Lang = "ar" | "en";

interface CartItem extends MenuItem {
  quantity: number;
  selectedSize?: { name: string; name_ar?: string; price: number };
  selectedAddons: { name: string; name_ar?: string; price: number }[];
  itemTotal: number;
  discountPercent?: number;
}

const getItemName = (item: MenuItem, lang: Lang) =>
  lang === "ar" ? (item.name_ar || item.name) : (item.name || item.name_ar || "");
const getItemDesc = (item: MenuItem, lang: Lang) =>
  lang === "ar" ? (item.description_ar || item.description || "") : (item.description || item.description_ar || "");
const getCategoryName = (item: MenuItem, lang: Lang) =>
  lang === "ar" ? (item.category_ar || item.category || "") : (item.category || item.category_ar || "");
const getSizeName = (size: { name: string; name_ar?: string }, lang: Lang) =>
  lang === "ar" ? (size.name_ar || size.name) : size.name;
const getAddonName = (addon: { name: string; name_ar?: string }, lang: Lang) =>
  lang === "ar" ? (addon.name_ar || addon.name) : addon.name;

const splitWords = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06FF]+/gi, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

const getRecommendedItems = (currentItem: MenuItem, lang: Lang, menuItems: MenuItem[], userId?: string, count = 3) => {
  const currentCategory = getCategoryName(currentItem, lang);
  const currentNameWords = new Set(splitWords(getItemName(currentItem, lang)));
  const currentDescWords = new Set(splitWords(getItemDesc(currentItem, lang)));

  let userHistoryItems: MenuItem[] = [];
  const history = JSON.parse(localStorage.getItem(userId ? `user_history_${userId}` : 'user_history') || '[]');
  userHistoryItems = menuItems.filter(item => history.includes(item.id));

  const getSmartRecommendations = (item: MenuItem, allItems: MenuItem[]) => {
    const recommendations = [];
    const itemName = getItemName(item, lang).toLowerCase();

    if (itemName.includes('برجر') || itemName.includes('بيتزا') || itemName.includes('burger') || itemName.includes('pizza')) {
      const drinks = allItems.filter(i => i.is_available && (getCategoryName(i, lang).toLowerCase().includes('مشروب') || getItemName(i, lang).toLowerCase().includes('عصير')));
      if (drinks.length > 0) recommendations.push({ item: drinks[Math.floor(Math.random() * drinks.length)], reason: lang === 'ar' ? 'مشروب مع الوجبة' : 'Drink with your meal' });
    }

    if (itemName.includes('كيك') || itemName.includes('cake')) {
      const hotDrinks = allItems.filter(i => i.is_available && (getItemName(i, lang).toLowerCase().includes('قهوة') || getItemName(i, lang).toLowerCase().includes('شاي')));
      if (hotDrinks.length > 0) recommendations.push({ item: hotDrinks[Math.floor(Math.random() * hotDrinks.length)], reason: lang === 'ar' ? 'مشروب ساخن مع الحلوى' : 'Hot drink with dessert' });
    }

    return recommendations;
  };

  const smartRecommendations = getSmartRecommendations(currentItem, menuItems);
  if (smartRecommendations.length >= count) return smartRecommendations.slice(0, count).map(r => r.item);

  const scores = menuItems
    .filter((item: MenuItem) => item.id !== currentItem.id && item.is_available)
    .map((item: MenuItem) => {
      const category = getCategoryName(item, lang);
      let score = 0;
      if (currentCategory && category && currentCategory === category) score += 5;
      const itemNameWords = new Set(splitWords(getItemName(item, lang)));
      const sharedNameWords = [...currentNameWords].filter((w) => itemNameWords.has(w));
      score += sharedNameWords.length * 2;
      return { item, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, count - smartRecommendations.length)
    .map((x) => x.item);

  return [...smartRecommendations.map(r => r.item), ...scores];
};

const getApplicableDiscount = (itemId: string, promotions: Promotion[]): number => {
  const now = new Date();
  const applicable = promotions.filter((promo) => promo.is_active && (!promo.ends_at || new Date(promo.ends_at) > now)).map((promo) => {
    const discount = Number(promo.discount_percent) || 0;
    if (discount <= 0) return 0;
    if (promo.apply_to === "all") return discount;
    if (promo.apply_to === "item" && promo.menu_item_id === itemId) return discount;
    return 0;
  });
  return applicable.length ? Math.max(...applicable) : 0;
};

const applyDiscount = (price: number, discountPercent: number) => {
  if (!discountPercent || discountPercent <= 0) return price;
  return Math.max(0, price * (1 - discountPercent / 100));
};

const T = {
  ar: {
    search: "ابحث عن أكلة...", all: "الكل", add: "إضافة", viewCart: "عرض السلة", cartEmpty: "السلة فارغة", cartTitle: "سلة التسوق",
    checkout: "إتمام الطلب", selectSize: "اختر الحجم", addons: "إضافات (اختياري)", total: "الإجمالي", addToCart: "أضف للسلة", checkoutTitle: "إتمام الطلب",
    orderType: "نوع الطلب", dineIn: "داخل المطعم", takeaway: "استلام من الفرع", delivery: "توصيل", tableNumber: "رقم الطاولة", tableNumberPlaceholder: "أدخل رقم طاولتك",
    deliveryAddress: "عنوان التوصيل", deliveryAddressPlaceholder: "أدخل عنوانك بالتفصيل", yourName: "اسمك", yourNamePlaceholder: "أدخل اسمك", phoneNumber: "رقم الهاتف",
    phonePlaceholder: "01XXXXXXXXX", phoneHelper: "سنتواصل معك بشأن طلبك", specialInstructions: "تعليمات خاصة (اختياري)", specialInstructionsPlaceholder: "أي طلبات خاصة...",
    orderSummary: "ملخص الطلب", subtotal: "المجموع", placeOrder: "تأكيد الطلب", orderSuccess: "تم استلام طلبك!", orderSuccessMsg: "تم تقديم طلبك بنجاح. سيبدأ المطعم في التحضير قريباً.",
    close: "إغلاق", noItems: "لا توجد أصناف", errorName: "يرجى إدخال اسمك", errorPhone: "يرجى إدخال رقم هاتف صحيح", errorTable: "يرجى إدخال رقم الطاولة", errorAddress: "يرجى إدخال عنوان التوصيل",
    errorOrderType: "يرجى اختيار نوع الطلب", size: "الحجم", cancel: "إلغاء", paymentMethod: "طريقة الدفع", cash: "الدفع عند الاستلام", instapay: "ادفع بـ InstaPay",
    errorPayment: "يرجى اختيار طريقة الدفع", scheduleOrder: "جدولة الطلب لوقت لاحق؟", scheduleDate: "تاريخ الاستلام", scheduleTime: "وقت الاستلام",
    instapayInstructions: "تعليمات الدفع بـ InstaPay", instapayStep1: "اضغط على زر InstaPay أدناه لفتح رابط الدفع", instapayStep2: "أكمل عملية الدفع بقيمة", instapayStep3: "خذ screenshot لإثبات التحويل", instapayStep4: "ابعت الـ screenshot على واتساب",
    restaurantNotFoundDesc: "المطعم الذي تبحث عنه غير موجود أو غير نشط حالياً.", installApp: "حمّل التطبيق", installDesc: "أضف المنيو لشاشتك الرئيسية", installBtn: "تثبيت", installedMsg: "التطبيق مثبّت بالفعل ✓",
    iosInstallTitle: "ثبّت التطبيق على آيفون", iosInstallStep1: "اضغط على زر المشاركة", iosInstallStep2: "اختر 'إضافة إلى الشاشة الرئيسية'",
    notAvailable: "غير متاح", recommendations: "اقتراحات لك", addedToCart: "تمت الإضافة للسلة", skip: "تخطي", continueToCart: "المتابعة للسلة", recommendationReason: "اقتراح مميز",
    selectZone: "اختر منطقة التوصيل", deliveryFeeLabel: "رسوم التوصيل", otherArea: "منطقة أخرى", feeWillBeConfirmed: "سيتم تحديد رسوم التوصيل لاحقاً", errorZone: "يرجى اختيار منطقة التوصيل",
    activeOrderFound: "لديك طلب نشط قيد المتابعة!", trackNow: "تابع طلبك الآن", bookTable: "حجز طاولة", reservationTitle: "احجز طاولتك", guestsCount: "عدد الأشخاص",
    reservationDate: "التاريخ", reservationTime: "الوقت", reservationSuccess: "تم استلام طلب الحجز!", reservationSuccessMsg: "سنتواصل معك لتأكيد الحجز قريباً. شكراً لك!",
    bookNow: "احجز الآن", errorReservation: "يرجى ملء جميع الحقول المطلوبة", restaurantClosed: "عذراً، المطعم مغلق حالياً", restaurantClosedDesc: "يمكنك تصفح المنيو ولكن الطلب غير متاح الآن. يرجى مراجعة مواعيد العمل.", openingHours: "مواعيد العمل",
  },
  en: {
    search: "Search for dishes...", all: "All", add: "ADD", viewCart: "View Cart", cartEmpty: "Your cart is empty", cartTitle: "Your Shopping Cart",
    checkout: "Checkout", selectSize: "Select Size", selectAddons: "Select Add-ons (Optional)", total: "Total", subtotal: "Subtotal", tax: "Tax",
    specialInstructions: "Special Instructions", specialInstructionsPlaceholder: "Any allergies or special requests?", checkoutTitle: "Complete Your Order",
    yourName: "Your Name", yourNamePlaceholder: "Enter your full name", phoneNumber: "Phone Number", phonePlaceholder: "01xxxxxxxxx", phoneHelper: "We'll use this to contact you about your order",
    orderType: "Order Type", dineIn: "Dine-in", takeaway: "Takeaway", delivery: "Delivery", tableNumber: "Table Number", tableNumberPlaceholder: "e.g. 5, 12, A1",
    deliveryAddress: "Delivery Address", deliveryAddressPlaceholder: "Enter your full delivery address", paymentMethod: "Payment Method", cash: "Cash",
    orderSummary: "Order Summary", placeOrder: "Confirm Order", cancel: "Cancel", close: "Close", noItems: "No items found", errorName: "Please enter your name",
    errorPhone: "Please enter a valid phone number", errorOrderType: "Please select order type", errorTable: "Please enter table number", errorAddress: "Please enter delivery address",
    errorPayment: "Please select payment method", orderSuccess: "Order Sent Successfully! 🎉", orderSuccessMsg: "Your order has been received and is being processed.",
    scheduleOrder: "Schedule for later?", scheduleDate: "Pickup/Delivery Date", scheduleTime: "Pickup/Delivery Time",
    instapay: "Pay with InstaPay",
    instapayInstructions: "InstaPay Payment Instructions", instapayStep1: "Tap the InstaPay button", instapayStep2: "Complete payment of", instapayStep3: "Take screenshot", instapayStep4: "Send via WhatsApp",
    restaurantNotFoundDesc: "The restaurant you're looking for doesn't exist.", installApp: "Get the App", installDesc: "Add to home screen", installBtn: "Install", installedMsg: "App installed ✓",
    iosInstallTitle: "Install on iPhone", iosInstallStep1: "Tap the share button", iosInstallStep2: "Select 'Add to Home Screen'",
    notAvailable: "Not Available", recommendations: "Recommendations", addedToCart: "Added to cart", skip: "Skip", continueToCart: "Continue to Cart",
    recommendationReason: "Recommended", selectZone: "Select Zone", deliveryFeeLabel: "Delivery Fee", otherArea: "Other Area", feeWillBeConfirmed: "TBD",
    errorZone: "Please select zone", activeOrderFound: "Active order found!", trackNow: "Track Now", bookTable: "Book Table", reservationTitle: "Reservation",
    guestsCount: "Guests", reservationDate: "Date", reservationTime: "Time", reservationSuccess: "Request Received!", reservationSuccessMsg: "We will contact you soon.",
    bookNow: "Book Now", errorReservation: "Please fill required fields", restaurantClosed: "Restaurant closed", restaurantClosedDesc: "Browse only, ordering disabled.", openingHours: "Opening Hours",
  }
};

const OpeningHoursModal: React.FC<{ isOpen: boolean; onClose: () => void; businessHours: any; lang: Lang; tx: any; }> = ({ isOpen, onClose, businessHours, lang, tx }) => {
  if (!businessHours) return null;
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const dayNames: any = {
    ar: { monday: 'الاثنين', tuesday: 'الثلاثاء', wednesday: 'الأربعاء', thursday: 'الخميس', friday: 'الجمعة', saturday: 'السبت', sunday: 'الأحد' },
    en: { monday: 'Monday', tuesday: 'Tuesday', wednesday: 'Wednesday', thursday: 'Thursday', friday: 'Friday', saturday: 'Saturday', sunday: 'Sunday' }
  };
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={tx.openingHours} size="sm">
      <div className="space-y-3 py-2" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
        {days.map(day => (
          <div key={day} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100">
            <span className="font-bold text-gray-700">{dayNames[lang][day]}</span>
            <div className="text-sm font-medium">
              {businessHours[day]?.closed ? <span className="text-red-500">{lang === 'ar' ? 'مغلق' : 'Closed'}</span> : <span className="text-gray-600">{businessHours[day]?.open} - {businessHours[day]?.close}</span>}
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
};

const CustomerMenu: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [lang, setLang] = useState<Lang>("ar");
  const [restaurant, setRestaurant] = useState<any>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [showCart, setShowCart] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [showItemModal, setShowItemModal] = useState(false);
  const [showRecommendationsModal, setShowRecommendationsModal] = useState(false);
  const [currentRecommendations, setCurrentRecommendations] = useState<MenuItem[]>([]);
  const [lastAddedItem, setLastAddedItem] = useState<MenuItem | null>(null);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [showHoursModal, setShowHoursModal] = useState(false);
  const [paymentSettings, setPaymentSettings] = useState({ cash_enabled: true, instapay_enabled: false, instapay_link: "", instapay_whatsapp: "" });
  const [installable, setInstallable] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [deliveryZones, setDeliveryZones] = useState<DeliveryZone[]>([]);
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const installCheckRef = useRef(false);
  const [showReservationModal, setShowReservationModal] = useState(false);
  const [reservationSuccess, setReservationSuccess] = useState(false);
  const [reservationLoading, setReservationLoading] = useState(false);
  const [reservationData, setReservationData] = useState({ customer_name: "", customer_phone: "", reservation_date: new Date().toISOString().split('T')[0], reservation_time: "19:00", guests_count: 2, notes: "" });
  const [showIOSPrompt, setShowIOSPrompt] = useState(false);
  const [isIOSDevice, setIsIOSDevice] = useState(false);
  const [showSafariTooltip, setShowSafariTooltip] = useState(false);

  const tx = T[lang];
  const dir = lang === "ar" ? "rtl" : "ltr";

  useEffect(() => {
    if (!installCheckRef.current) {
      installCheckRef.current = true;
      capturePWAInstallPrompt();
      setInstalled(isPWAInstalled());
      setIsIOSDevice(isIOS());
      
      const timer = setInterval(() => { 
        setInstallable(isPWAInstallAvailable()); 
      }, 500);

      // Show iOS prompt if it's iOS and not already installed/standalone
      if (isIOS() && !isInStandaloneMode()) {
        const dismissed = localStorage.getItem('pwa_ios_prompt_dismissed');
        if (!dismissed) {
          setTimeout(() => setShowIOSPrompt(true), 3000);
        }
      }

      window.addEventListener('appinstalled', () => { setInstalled(true); setInstallable(false); });
      return () => clearInterval(timer);
    }
  }, []);

  useEffect(() => { loadRestaurant(); }, [slug]);

  useEffect(() => {
    if (restaurant?.id) {
      injectDynamicManifest({ name: restaurant.name, slug: restaurant.slug, logo_url: restaurant.logo_url || undefined, theme_color: '#f97316' });
      registerServiceWorker(restaurant.slug);
      getActivePromotions(restaurant.id).then(setPromotions).catch(() => console.error("Failed to load promotions"));
      const sub = subscribeToMenuItems(restaurant.id, (data) => { setMenuItems(data); setLoading(false); });
      getDeliveryZones(restaurant.id).then(setDeliveryZones);
      const restSub = supabase.channel(`restaurant_status_${restaurant.id}`).on("postgres_changes", { event: "UPDATE", schema: "public", table: "restaurants", filter: `id=eq.${restaurant.id}` }, (payload) => { if (payload.new) setRestaurant((prev: any) => ({ ...prev, ...payload.new })); }).subscribe();
      const savedOrderId = localStorage.getItem(`activeOrder_${restaurant.id}`);
      if (savedOrderId) {
        supabase.from('orders').select('status, id').eq('id', savedOrderId).single().then(({ data }) => {
          if (data && !['completed', 'cancelled', 'rejected'].includes(data.status)) { navigate(`/order/${savedOrderId}?lang=${lang}`); }
          else { localStorage.removeItem(`activeOrder_${restaurant.id}`); }
        });
      }
      return () => { sub.unsubscribe(); restSub.unsubscribe(); };
    }
  }, [restaurant]);

  const loadRestaurant = async () => {
    if (!slug) return;
    const { data, error } = await supabase.from("restaurants").select("*").eq("slug", slug).eq("is_active", true).single();
    if (error || !data) { setLoading(false); return; }
    setRestaurant(data);
    if (data.payment_settings) setPaymentSettings({ ...{ cash_enabled: true, instapay_enabled: false, instapay_link: "", instapay_whatsapp: "" }, ...data.payment_settings });
  };

  const handleInstall = async () => {
    const result = await triggerPWAInstall();
    if (result === 'accepted') { setInstalled(true); setInstallable(false); }
  };

  const isOpen = restaurant ? (() => {
    if (restaurant.is_manually_closed) return false;
    if (!restaurant.business_hours) return true;
    const now = new Date();
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const currentDay = days[now.getDay()];
    const hours = restaurant.business_hours[currentDay];
    if (!hours || hours.closed) return false;
    const [openH, openM] = hours.open.split(':').map(Number);
    const [closeH, closeM] = hours.close.split(':').map(Number);
    const currentTime = now.getHours() * 60 + now.getMinutes();
    const openTime = openH * 60 + openM;
    const closeTime = closeH * 60 + closeM;
    if (closeTime < openTime) return currentTime >= openTime || currentTime < closeTime;
    return currentTime >= openTime && currentTime < closeTime;
  })() : true;

  const addToCart = (item: MenuItem, selectedSize?: any, selectedAddons: any[] = []) => {
    const basePrice = selectedSize ? selectedSize.price : item.base_price;
    const discountPercent = getApplicableDiscount(item.id, promotions);
    const discountedBase = applyDiscount(basePrice, discountPercent);
    const addonsTotal = selectedAddons.reduce((sum, addon) => sum + addon.price, 0);
    const itemTotal = discountedBase + addonsTotal;
    const cartItem: CartItem = { ...item, base_price: discountedBase, quantity: 1, selectedSize, selectedAddons, itemTotal, discountPercent };
    const existingIndex = cart.findIndex((ci) => ci.id === item.id && ci.selectedSize?.name === selectedSize?.name && JSON.stringify(ci.selectedAddons) === JSON.stringify(selectedAddons));
    if (existingIndex >= 0) { const newCart = [...cart]; newCart[existingIndex].quantity += 1; setCart(newCart); }
    else { setCart([...cart, cartItem]); }
    setLastAddedItem(item);
    const recommendations = getRecommendedItems(item, lang, menuItems, undefined, 3);
    if (recommendations.length > 0) { setCurrentRecommendations(recommendations); setShowRecommendationsModal(true); }
    if (!isOpen) { alert(tx.restaurantClosed); return; }
    setShowItemModal(false);
  };

  const updateQuantity = (index: number, delta: number) => {
    const newCart = [...cart]; newCart[index].quantity += delta;
    if (newCart[index].quantity <= 0) newCart.splice(index, 1);
    setCart(newCart);
  };

  const addRecommendationToCart = (item: MenuItem) => {
    if (!isOpen) return;
    const basePrice = item.base_price;
    const discountPercent = getApplicableDiscount(item.id, promotions);
    const discountedBase = applyDiscount(basePrice, discountPercent);
    const cartItem: CartItem = { ...item, base_price: discountedBase, quantity: 1, selectedSize: undefined, selectedAddons: [], itemTotal: discountedBase, discountPercent };
    const existingIndex = cart.findIndex((ci) => ci.id === item.id && !ci.selectedSize && ci.selectedAddons.length === 0);
    if (existingIndex >= 0) { const newCart = [...cart]; newCart[existingIndex].quantity += 1; setCart(newCart); }
    else { setCart([...cart, cartItem]); }
  };

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const getItemQuantity = (itemId: string) => cart.reduce((sum, ci) => ci.id === itemId ? sum + ci.quantity : sum, 0);
  const handleRemoveOne = (itemId: string) => { const idx = cart.findIndex((ci) => ci.id === itemId); if (idx >= 0) updateQuantity(idx, -1); };
  const removeFromCart = (index: number) => { const newCart = [...cart]; newCart.splice(index, 1); setCart(newCart); };

  const handleCreateReservation = async () => {
    if (!reservationData.customer_name || !reservationData.customer_phone || !reservationData.reservation_date || !reservationData.reservation_time) {
      alert(tx.errorReservation); return;
    }
    setReservationLoading(true);
    try {
      const { error } = await supabase.from("reservations").insert([{ ...reservationData, restaurant_id: restaurant.id, status: "pending" }]);
      if (error) throw error;
      setReservationSuccess(true);
      setReservationData({ customer_name: "", customer_phone: "", reservation_date: new Date().toISOString().split('T')[0], reservation_time: "19:00", guests_count: 2, notes: "" });
    } catch (err) { console.error("Reservation error:", err); alert("فشل إرسال طلب الحجز. يرجى المحاولة مرة أخرى."); }
    finally { setReservationLoading(false); }
  };

  const categoriesList = ["all", ...new Set(menuItems.map((item) => lang === "ar" ? (item.category_ar || item.category) : (item.category || item.category_ar)).filter(Boolean))];
  const filteredItems = menuItems.filter((item) => {
    const name = getItemName(item, lang);
    const matchesSearch = name.toLowerCase().includes(searchTerm.toLowerCase());
    const itemCat = lang === "ar" ? (item.category_ar || item.category) : (item.category || item.category_ar);
    const matchesCategory = categoryFilter === "all" || itemCat === categoryFilter;
    return matchesSearch && matchesCategory && item.is_available;
  });

  if (loading) return <Loading text={lang === "ar" ? "جاري تحميل المنيو..." : "Loading menu..."} />;
  if (!restaurant) return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><Card className="p-8 text-center"><Package className="w-16 h-16 mx-auto mb-4 opacity-30" /><h2 className="text-xl font-bold">{tx.restaurantNotFoundDesc}</h2></Card></div>;

  return (
    <div className="min-h-screen bg-gray-50 pb-20" dir={dir}>


      {activeOrderId && <div className="bg-accent text-white px-4 py-3 flex items-center justify-between sticky top-0 z-50 shadow-md"><span>{tx.activeOrderFound}</span><a href={`/order/${activeOrderId}?lang=${lang}`} className="bg-white text-accent px-4 py-1.5 rounded-lg text-sm font-bold">{tx.trackNow}</a></div>}
      {!isOpen && <div className="bg-red-600 text-white px-4 py-3 sticky top-0 z-50 shadow-lg text-center font-bold text-sm tracking-wide">{tx.restaurantClosed} - {tx.restaurantClosedDesc}</div>}

      {restaurant.cover_url && (
        <div className="w-full h-[192px] md:h-[256px] overflow-hidden relative bg-gray-200">
           <LazyImage 
             src={restaurant.cover_url} 
             alt="" 
             className="w-full h-full object-cover"
             width={1200}
             quality={80}
             skeletonClass="h-full"
           />
           {/* الشريط (Bar) عند الغلاف */}
           <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-5 pt-12 flex items-end">
              <div className="flex items-center gap-4">
                 {restaurant.logo_url && (
                   <div className="p-1 bg-white/20 backdrop-blur-sm rounded-xl">
                     <img src={restaurant.logo_url} className="w-14 h-14 md:w-16 md:h-16 rounded-lg border border-white/50 shadow-lg object-cover" alt="" />
                   </div>
                 )}
                 <div>
                   <h1 className="font-bold text-white text-xl md:text-2xl drop-shadow-lg">{restaurant.name}</h1>
                   <div className="flex items-center gap-2 text-white/80 text-xs md:text-sm mt-1">
                      <Clock className="w-3 h-3" />
                      <span>{isOpen ? (lang === 'ar' ? 'مفتوح الآن' : 'Open Now') : (lang === 'ar' ? 'مغلق' : 'Closed')}</span>
                   </div>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* PWA Install Banner - Slim Version (At the bottom of cover) */}
      {!installed && (
        <div className="relative z-40 bg-accent shadow-sm px-3 py-1.5 h-[56px] flex items-center">
          <div className="max-w-screen-lg mx-auto w-full flex items-center justify-between gap-2 overflow-hidden">
            <div className="flex items-center gap-2 flex-shrink-0">
               <button onClick={() => { localStorage.setItem('pwa_banner_dismissed', 'true'); window.location.reload(); }} className="p-1.5 text-white/70 hover:text-white transition-colors">
                  <X className="w-4 h-4" />
               </button>
               <button 
                 onClick={() => {
                   if (isIOSDevice) {
                     setShowSafariTooltip(!showSafariTooltip);
                   } else if (installable) {
                     handleInstall();
                   } else {
                     alert(lang === 'ar' ? "تثبيت التطبيق متاح من إعدادات المتصفح" : "Install via browser settings");
                   }
                 }} 
                 className="px-4 py-1 bg-transparent text-white rounded-lg text-xs font-bold border border-white/60 transition-all hover:bg-white/10 active:scale-95 flex items-center gap-1.5"
               >
                 {(isIOSDevice || !installable) && <ExternalLink className="w-3 h-3" />}
                 {tx.installBtn}
               </button>
            </div>

            <div className="flex items-center gap-2 overflow-hidden" dir="rtl">
               <div className="text-right overflow-hidden">
                  <h3 className="font-bold text-white text-[11px] leading-tight truncate">{lang === 'ar' ? 'حفظ التطبيق' : 'Save App'}</h3>
                  <p className="text-[9px] text-white/80 truncate">{lang === 'ar' ? 'أضف المنيو لشاشتك الرئيسية' : 'Add to home screen'}</p>
               </div>
               <div className="w-8 h-8 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0 border border-white/20">
                  {restaurant?.logo_url ? <img src={restaurant.logo_url} className="w-6 h-6 rounded-md object-cover" alt="" /> : <Utensils className="w-4 h-4 text-white" />}
               </div>
            </div>
          </div>
          
          {showSafariTooltip && (
            <div className="absolute top-[56px] left-2 right-2 p-3 bg-accent/95 backdrop-blur-md rounded-xl border border-white/20 shadow-xl z-50 animate-in zoom-in-95 duration-200">
               <div className="space-y-2">
                  <div className="flex items-center gap-2 text-[11px] text-white">
                    <span className="w-4 h-4 bg-white text-accent rounded-full flex items-center justify-center text-[9px] font-bold">1</span>
                    <p>{isIOSDevice ? tx.iosInstallStep1 : (lang === 'ar' ? "اضغط على أيقونة المتصفح" : "Tap browser icon")} <ExternalLink className="w-3 h-3 inline-block" /></p>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-white">
                    <span className="w-4 h-4 bg-white text-accent rounded-full flex items-center justify-center text-[9px] font-bold">2</span>
                    <p>{isIOSDevice ? tx.iosInstallStep2 : (lang === 'ar' ? "اختر 'إضافة للشاشة الرئيسية'" : "Add to Home Screen")}</p>
                  </div>
               </div>
            </div>
          )}
        </div>
      )}

      <div className="bg-white shadow-sm sticky top-0 z-40 transition-all duration-300">
        <div className="max-w-screen-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
             {!restaurant.cover_url && restaurant.logo_url && <img src={restaurant.logo_url} className="w-10 h-10 rounded-lg object-cover" alt="" />}
             {!restaurant.cover_url && <h1 className="font-bold text-gray-800">{restaurant.name}</h1>}
             {restaurant.cover_url && (
               <div className="flex items-center gap-2">
                 <Utensils className="w-5 h-5 text-accent" />
                 <span className="font-bold text-gray-800">{restaurant.name}</span>
               </div>
             )}
          </div>
          <div className="flex gap-2">
             <button onClick={() => setShowReservationModal(true)} className="p-2 bg-orange-50 text-orange-600 rounded-full shadow-sm"><Utensils className="w-5 h-5" /></button>
             <button onClick={() => setShowHoursModal(true)} className="p-2 bg-blue-50 text-blue-600 rounded-full shadow-sm"><Clock className="w-5 h-5" /></button>
             <button onClick={() => setLang(lang === "ar" ? "en" : "ar")} className="p-2 bg-gray-50 text-gray-600 rounded-full shadow-sm font-bold text-xs">{lang === "ar" ? "EN" : "ع"}</button>
          </div>
        </div>
        <div className="px-4 pb-3 max-w-screen-lg mx-auto relative">
          <Search className="absolute left-7 top-3 w-4 h-4 text-gray-400" />
          <input type="text" placeholder={tx.search} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-gray-50 border-none rounded-xl text-sm" />
        </div>
      </div>

      <div className="bg-white border-b sticky top-[108px] z-30">
        <div className="max-w-screen-lg mx-auto px-4 py-2 flex gap-2 overflow-x-auto scrollbar-hide">
          {categoriesList.map(c => <button key={c} onClick={() => c && setCategoryFilter(c)} className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap ${categoryFilter === c ? "bg-accent text-white" : "bg-gray-100 text-gray-600"}`}>{c === "all" ? tx.all : c}</button>)}
        </div>
      </div>

      <div className="max-w-screen-lg mx-auto px-4 py-4 grid grid-cols-2 gap-3">
        {filteredItems.map((item) => {
          const quantity = getItemQuantity(item.id);
          const hasVariations = (item.sizes && item.sizes.length > 0) || (item.addons && item.addons.length > 0);
          return (
            <div key={item.id} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100">
              {item.image_url ? <LazyImage src={item.image_url} alt={getItemName(item, lang)} width={380} quality={65} skeletonClass="h-32" /> : <div className="h-32 bg-gray-50 flex items-center justify-center"><Package className="w-8 h-8 text-gray-200" /></div>}
              <div className="p-3">
                <h3 className="font-semibold text-sm mb-1 line-clamp-1">{getItemName(item, lang)}</h3>
                {getItemDesc(item, lang) && (
                  <p className="text-[11px] text-gray-500 mb-2 line-clamp-2 leading-snug">
                    {getItemDesc(item, lang)}
                  </p>
                )}
                <div className="flex items-center justify-between">
                   <p className="font-bold text-accent">{formatCurrency(applyDiscount(item.base_price, getApplicableDiscount(item.id, promotions)))}</p>
                   {quantity === 0 ? <button disabled={!isOpen} onClick={() => hasVariations ? (setSelectedItem(item), setShowItemModal(true)) : addToCart(item)} className={`px-3 py-1 rounded-lg text-xs font-bold border-2 ${!isOpen ? 'border-gray-200 text-gray-300' : 'border-accent text-accent'}`}>{!isOpen ? tx.notAvailable : tx.add}</button> : <div className="flex items-center bg-accent text-white rounded-lg px-2 py-1 gap-3"><button onClick={() => isOpen && handleRemoveOne(item.id)}><Minus className="w-3.5 h-3.5" /></button><span className="font-bold text-xs">{quantity}</span><button onClick={() => isOpen && (hasVariations ? (setSelectedItem(item), setShowItemModal(true)) : addToCart(item))}><Plus className="w-3.5 h-3.5" /></button></div>}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {cartCount > 0 && <div className="fixed bottom-6 left-4 right-4 z-50"><button onClick={() => setShowCart(true)} className="w-full max-w-screen-lg mx-auto flex items-center justify-between bg-accent text-white rounded-2xl px-6 py-4 shadow-xl shadow-accent/40 font-bold"><span>{cartCount} {lang === "ar" ? "أصناف" : "Items"} - {formatCurrency(cart.reduce((s: number, i: any) => s + i.itemTotal * i.quantity, 0))}</span><div className="flex items-center gap-2"><ShoppingCart className="w-5 h-5" /><span>{tx.viewCart}</span></div></button></div>}

      <CartModal isOpen={showCart} cart={cart} lang={lang} tx={tx} onClose={() => setShowCart(false)} onUpdateQuantity={updateQuantity} onRemove={removeFromCart} isRestaurantOpen={isOpen} onCheckout={() => { setShowCart(false); setShowCheckout(true); }} />
      <ItemCustomizationModal isOpen={showItemModal} item={selectedItem} lang={lang} tx={tx} menuItems={menuItems} isRestaurantOpen={isOpen} onClose={() => setShowItemModal(false)} onAdd={addToCart} />
      <OpeningHoursModal isOpen={showHoursModal} onClose={() => setShowHoursModal(false)} businessHours={restaurant.business_hours} lang={lang} tx={tx} />
      <RecommendationsModal isOpen={showRecommendationsModal} recommendations={currentRecommendations} lastAddedItem={lastAddedItem} lang={lang} tx={tx} onClose={() => setShowRecommendationsModal(false)} onAddRecommendation={addRecommendationToCart} onContinueToCart={() => { setShowRecommendationsModal(false); setShowCart(true); }} />
      <CheckoutModal isOpen={showCheckout} cart={cart} lang={lang} tx={tx} restaurant={restaurant} orderTypesEnabled={restaurant.order_types_enabled || { dine_in: true, takeaway: true, delivery: false }} paymentSettings={paymentSettings} deliveryZones={deliveryZones} onClose={() => setShowCheckout(false)} onSuccess={() => { setCart([]); setShowCheckout(false); }} />
      <PromotionPopup promotions={promotions} lang={lang} />

      <Modal isOpen={showReservationModal} onClose={() => { setShowReservationModal(false); setReservationSuccess(false); }} title={tx.reservationTitle}>
        {reservationSuccess ? <div className="text-center py-8"><CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" /><h3 className="text-xl font-bold mb-2">{tx.reservationSuccess}</h3><p className="text-gray-500 mb-6">{tx.reservationSuccessMsg}</p><Button fullWidth onClick={() => setShowReservationModal(false)}>{tx.close}</Button></div> : <div className="space-y-4"><Input label={tx.yourName} value={reservationData.customer_name} onChange={e => setReservationData({...reservationData, customer_name: e.target.value})} required /><Input label={tx.phoneNumber} type="tel" value={reservationData.customer_phone} onChange={e => setReservationData({...reservationData, customer_phone: e.target.value})} required /><div className="grid grid-cols-2 gap-4"><Input label={tx.reservationDate} type="date" value={reservationData.reservation_date} onChange={e => setReservationData({...reservationData, reservation_date: e.target.value})} required /><Input label={tx.reservationTime} type="time" value={reservationData.reservation_time} onChange={e => setReservationData({...reservationData, reservation_time: e.target.value})} required /></div><Input label={tx.guestsCount} type="number" value={reservationData.guests_count} onChange={e => setReservationData({...reservationData, guests_count: parseInt(e.target.value)})} required /><Textarea label={tx.specialInstructions} value={reservationData.notes} onChange={e => setReservationData({...reservationData, notes: e.target.value})} /><Button fullWidth onClick={handleCreateReservation} loading={reservationLoading}>{tx.bookNow}</Button></div>}
      </Modal>

      {restaurant?.whatsapp_number && !selectedItem && !showCart && !showCheckout && !showReservationModal && !showRecommendationsModal && <a href={`https://wa.me/${restaurant.whatsapp_number.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="fixed bottom-24 left-6 z-50 bg-[#25D366] text-white p-3 rounded-full shadow-lg hover:scale-110 transition-all flex items-center justify-center"><svg viewBox="0 0 24 24" className="w-6 h-6 fill-current"><path d="M12.031 6.172c-2.32 0-4.519.903-6.16 2.544-1.64 1.64-2.543 3.839-2.543 6.159 0 1.253.262 2.457.778 3.551l-1.011 3.686 3.774-.989c1.066.582 2.268.889 3.496.889h.005c2.321 0 4.521-.903 6.161-2.544 1.64-1.64 2.543-3.839 2.543-6.159s-.903-4.519-2.544-6.159c-1.64-1.64-3.839-2.544-6.159-2.544zm7.42 12.158c-1.42 1.42-3.308 2.203-5.317 2.203-.001 0-.001 0-.002 0-1.062 0-2.102-.266-3.023-.769l-2.164.567.581-2.112c-.528-.941-.806-2.001-.806-3.088 0-1.996.777-3.873 2.197-5.293 1.42-1.42 3.308-2.203 5.317-2.203 2.009 0 3.896.784 5.316 2.204 1.42 1.42 2.203 3.308 2.203 5.317s-.781 3.896-2.202 5.317zM16.835 15.111c-.266-.134-1.574-.777-1.819-.865-.244-.09-.422-.134-.599.134-.177.266-.688.865-.842 1.042-.155.177-.31.199-.577.066-.266-.134-1.124-.414-2.141-1.321-.791-.706-1.325-1.579-1.48-1.845-.155-.266-.017-.411.117-.544.12-.12.266-.31.399-.465.134-.155.177-.266.266-.443.09-.177.044-.333-.022-.465-.066-.134-.599-1.442-.821-1.974-.216-.521-.433-.45-.599-.457-.155-.005-.333-.005-.511-.005-.177 0-.465.066-.71.333-.244.266-.932.91-.932 2.219s.954 2.574 1.087 2.751c.134.177 1.88 2.871 4.553 4.025.637.275 1.134.437 1.522.56.641.203 1.224.174 1.684.106.513-.077 1.574-.643 1.796-1.264.221-.621.221-1.153.155-1.264-.066-.111-.244-.177-.511-.31z"></path></svg></a>}
    </div>
  );
};

const CartModal: React.FC<{ isOpen: boolean; cart: CartItem[]; lang: Lang; tx: any; onClose: () => void; onUpdateQuantity: (i: number, d: number) => void; onRemove: (i: number) => void; onCheckout: () => void; isRestaurantOpen: boolean; }> = 
({ isOpen, cart, lang, tx, onClose, onUpdateQuantity, onRemove, onCheckout, isRestaurantOpen }) => {
  const total = cart.reduce((sum: number, item: any) => sum + item.itemTotal * item.quantity, 0);
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={tx.cartTitle} size="lg">
      <div className="space-y-4" dir={lang === "ar" ? "rtl" : "ltr"}>
        {cart.length === 0 ? <div className="text-center py-10"><ShoppingCart className="w-12 h-12 text-gray-200 mx-auto mb-2" /><p className="text-gray-400">{tx.cartEmpty}</p></div> : 
        <><div className="space-y-3 max-h-80 overflow-y-auto">{cart.map((item: any, i: number) => <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl"><div className="flex-1"><h4 className="font-semibold text-sm">{getItemName(item, lang)}</h4><p className="text-accent font-bold text-xs">{formatCurrency(item.itemTotal)}</p></div><div className="flex items-center gap-2"><button onClick={() => onUpdateQuantity(i, -1)} className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center"><Minus className="w-3 h-3" /></button><span className="font-bold text-sm">{item.quantity}</span><button onClick={() => onUpdateQuantity(i, 1)} className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center"><Plus className="w-3 h-3" /></button></div><button onClick={() => onRemove(i)} className="text-red-400"><X className="w-4 h-4" /></button></div>)}</div><div className="border-t pt-4 flex justify-between font-bold text-lg mb-4"><span>{tx.total}</span><span>{formatCurrency(total)}</span></div><Button onClick={onCheckout} fullWidth disabled={!isRestaurantOpen}>{!isRestaurantOpen ? tx.restaurantClosed : tx.checkout}</Button></>}
      </div>
    </Modal>
  );
};

const ItemCustomizationModal: React.FC<{ isOpen: boolean; item: MenuItem | null; lang: Lang; tx: any; menuItems: MenuItem[]; isRestaurantOpen: boolean; onClose: () => void; onAdd: (item: MenuItem, size?: any, addons?: any[]) => void; }> = 
({ isOpen, item, lang, tx, isRestaurantOpen, onClose, onAdd }) => {
  const [size, setSize] = useState<any>(null);
  const [addons, setAddons] = useState<any[]>([]);
  useEffect(() => { if (item?.sizes?.length) setSize(item.sizes[0]); setAddons([]); }, [item]);
  if (!item) return null;
  const toggleAddon = (a: any) => setAddons(addons.find(x => x.name === a.name) ? addons.filter(x => x.name !== a.name) : [...addons, a]);
  const total = (size ? size.price : item.base_price) + addons.reduce((s: number, a: any) => s + a.price, 0);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={getItemName(item, lang)}>
      <div className="space-y-4" dir={lang === "ar" ? "rtl" : "ltr"}>
        {item.image_url && <LazyImage src={item.image_url} alt="" width={600} quality={80} skeletonClass="h-40" className="rounded-xl" />}
        {item.sizes?.length && <div className="space-y-2"><h4 className="font-bold text-sm">{tx.selectSize}</h4>{item.sizes.map(s => <button key={s.name} onClick={() => setSize(s)} className={`w-full flex justify-between p-3 rounded-xl border-2 ${size?.name === s.name ? "border-accent bg-accent/5" : "border-gray-100"}`}><span>{getSizeName(s, lang)}</span><b>{formatCurrency(s.price)}</b></button>)}</div>}
        {item.addons?.length && <div className="space-y-2"><h4 className="font-bold text-sm">{tx.addons}</h4>{item.addons.map(a => <button key={a.name} onClick={() => toggleAddon(a)} className={`w-full flex justify-between p-3 rounded-xl border-2 ${addons.find(x => x.name === a.name) ? "border-accent bg-accent/5" : "border-gray-100"}`}><span>{getAddonName(a, lang)}</span><b>+{formatCurrency(a.price)}</b></button>)}</div>}
        <div className="border-t pt-4 flex justify-between font-bold text-lg mb-4"><span>{tx.total}</span><span>{formatCurrency(total)}</span></div>
        <Button onClick={() => onAdd(item, size, addons)} fullWidth disabled={!isRestaurantOpen}>{!isRestaurantOpen ? tx.restaurantClosed : tx.addToCart}</Button>
      </div>
    </Modal>
  );
};

const RecommendationsModal: React.FC<{ isOpen: boolean; recommendations: MenuItem[]; lastAddedItem: MenuItem | null; lang: Lang; tx: any; onClose: () => void; onAddRecommendation: (item: MenuItem) => void; onContinueToCart: () => void; }> = 
({ isOpen, recommendations, lastAddedItem, lang, tx, onClose, onAddRecommendation, onContinueToCart }) => {
  const [added, setAdded] = useState<Set<string>>(new Set());
  if (!isOpen || !lastAddedItem) return null;
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={tx.recommendations} size="lg">
      <div className="space-y-4" dir={lang === "ar" ? "rtl" : "ltr"}>
        <p className="text-center text-gray-500 text-sm">{lang === 'ar' ? `أضفت ${getItemName(lastAddedItem, lang)} للسلة. نقترح لك أيضاً:` : `Added ${getItemName(lastAddedItem, lang)}. You might also like:`}</p>
        <div className="space-y-2">{recommendations.map((item: any) => <div key={item.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl"><div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-gray-200">{item.image_url ? <LazyImage src={item.image_url} alt="" width={100} quality={50} className="w-full h-full object-cover" /> : <Package className="w-full h-full p-4 text-gray-400" />}</div><div className="flex-1"><h4 className="font-bold text-sm">{getItemName(item, lang)}</h4><p className="text-accent text-xs">{formatCurrency(item.base_price)}</p></div><Button size="sm" onClick={() => { onAddRecommendation(item); setAdded(new Set([...added, item.id])); }} disabled={added.has(item.id)}>{added.has(item.id) ? "✓" : tx.add}</Button></div>)}</div>
        <div className="flex gap-2 pt-2"><Button onClick={onContinueToCart} fullWidth>{tx.continueToCart}</Button><Button variant="outline" onClick={onClose} fullWidth>{tx.skip}</Button></div>
      </div>
    </Modal>
  );
};

const CheckoutModal: React.FC<any> = ({ isOpen, cart, lang, tx, restaurant, orderTypesEnabled, paymentSettings, deliveryZones, onClose, onSuccess }) => {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [type, setType] = useState<any>("");
  const [table, setTable] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [method, setMethod] = useState("");
  const [selectedZone, setSelectedZone] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [orderId, setOrderId] = useState<any>(null);

  useEffect(() => { 
    if (isOpen) { 
      setType(orderTypesEnabled.dine_in ? "dine_in" : orderTypesEnabled.takeaway ? "takeaway" : orderTypesEnabled.delivery ? "delivery" : ""); 
      setMethod(paymentSettings.instapay_enabled && !paymentSettings.cash_enabled ? "instapay" : "cash"); 
    } 
  }, [isOpen, orderTypesEnabled, paymentSettings]);

  const subtotal = cart.reduce((s: number, i: any) => s + i.itemTotal * i.quantity, 0);
  const deliveryFee = type === "delivery" && selectedZone ? selectedZone.delivery_fee : 0;
  const total = subtotal + deliveryFee;

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    if (!name || !phone || !type) return alert(tx.errorName);
    setLoading(true);
    const orderData = {
      restaurant_id: restaurant.id,
      order_type: (type === "dine_in" ? "qr" : type === "takeaway" ? "counter" : "phone") as "table" | "qr" | "counter" | "phone",
      table_number: type === "dine_in" ? table : undefined,
      customer_name: name,
      customer_phone: phone,
      items: cart.map((i: any) => ({ 
        menu_item_id: i.id, 
        name: getItemName(i, 'en'), 
        name_ar: getItemName(i, 'ar'),
        quantity: i.quantity, 
        base_price: i.base_price, 
        selected_size: i.selectedSize, 
        selected_addons: i.selectedAddons, 
        item_total: i.itemTotal 
      })),
      subtotal,
      delivery_fee: deliveryFee,
      delivery_zone_id: type === "delivery" ? selectedZone?.id : undefined,
      tax: 0,
      total,
      customer_notes: (type === "delivery" ? `Address: ${address}\n` : "") + notes,
      payment_method: method
    };
    const { data, error } = await createOrder(orderData);
    setLoading(false);
    if (!error) { 
      setOrderId(data?.id); 
      localStorage.setItem(`activeOrder_${restaurant.id}`, data?.id); 
      setSuccess(true); 
      // إرسال الإشعار عبر الواتساب فور النجاح
      if (data) {
        sendOrderViaWhatsApp(data, restaurant.name, restaurant.whatsapp_number || restaurant.phone);
      }
    }
    else alert(error.message);
  };

  if (success) return <Modal isOpen={isOpen} onClose={onClose} title={tx.orderSuccess}><div className="text-center py-6"><CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" /><p className="mb-6">{tx.orderSuccessMsg}</p>{orderId && <a href={`/order/${orderId}?lang=${lang}`} className="block w-full bg-accent text-white py-3 rounded-xl font-bold mb-2">{tx.trackNow}</a>}<Button fullWidth variant="outline" onClick={() => { onSuccess(); setSuccess(false); }}>{tx.close}</Button></div></Modal>;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={tx.checkoutTitle} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4" dir={lang === "ar" ? "rtl" : "ltr"}>
        <div className="grid grid-cols-3 gap-2">{orderTypesEnabled.dine_in && <button type="button" onClick={() => setType("dine_in")} className={`p-2 border-2 rounded-xl text-xs font-bold ${type === "dine_in" ? "border-accent bg-accent/5" : "border-gray-100"}`}>{tx.dineIn}</button>}{orderTypesEnabled.takeaway && <button type="button" onClick={() => setType("takeaway")} className={`p-2 border-2 rounded-xl text-xs font-bold ${type === "takeaway" ? "border-accent bg-accent/5" : "border-gray-100"}`}>{tx.takeaway}</button>}{orderTypesEnabled.delivery && <button type="button" onClick={() => setType("delivery")} className={`p-2 border-2 rounded-xl text-xs font-bold ${type === "delivery" ? "border-accent bg-accent/5" : "border-gray-100"}`}>{tx.delivery}</button>}</div>
        <Input label={tx.yourName} value={name} onChange={e => setName(e.target.value)} required /><Input label={tx.phoneNumber} value={phone} onChange={e => setPhone(e.target.value)} required />
        {type === "dine_in" && <Input label={tx.tableNumber} value={table} onChange={e => setTable(e.target.value)} required />}
        {type === "delivery" && deliveryZones.length > 0 && (
          <Select 
            label={tx.selectZone} 
            value={selectedZone?.id || ""} 
            onChange={(e) => setSelectedZone(deliveryZones.find((z: any) => z.id === e.target.value))}
            required
          >
            <option value="">{tx.selectZone}</option>
            {deliveryZones.map((zone: any) => (
              <option key={zone.id} value={zone.id}>
                {lang === "ar" ? zone.name_ar : zone.name_en} ({formatCurrency(zone.delivery_fee)})
              </option>
            ))}
          </Select>
        )}
        {type === "delivery" && <Input label={tx.deliveryAddress} value={address} onChange={e => setAddress(e.target.value)} required />}
        
        <div className="space-y-2">
          <label className="text-sm font-bold text-gray-700">{tx.paymentMethod}</label>
          <div className="grid grid-cols-2 gap-2">
            {paymentSettings.cash_enabled && (
              <button 
                type="button" 
                onClick={() => setMethod("cash")} 
                className={`flex items-center justify-center gap-3 p-4 border-2 rounded-xl text-sm font-bold transition-all ${method === "cash" ? "border-accent bg-accent/5 text-accent shadow-sm" : "border-gray-100 text-gray-500 hover:border-gray-200"}`}
              >
                <Banknote className={`w-5 h-5 ${method === "cash" ? "text-accent" : "text-gray-400"}`} />
                {tx.cash}
              </button>
            )}
            {paymentSettings.instapay_enabled && (
              <button 
                type="button" 
                onClick={() => setMethod("instapay")} 
                className={`flex items-center justify-center gap-3 p-4 border-2 rounded-xl text-sm font-bold transition-all ${method === "instapay" ? "border-accent bg-accent/5 text-accent shadow-sm" : "border-gray-100 text-gray-500 hover:border-gray-200"}`}
              >
                <Smartphone className={`w-5 h-5 ${method === "instapay" ? "text-accent" : "text-gray-400"}`} />
                {tx.instapay}
              </button>
            )}
          </div>
        </div>

        {method === "instapay" && (
          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 space-y-4 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-2 text-blue-700 font-bold">
              <Smartphone className="w-5 h-5" />
              <span>{tx.instapayInstructions}</span>
            </div>
            
            <div className="space-y-3">
              {[tx.instapayStep1, `${tx.instapayStep2} ${formatCurrency(total)}`, tx.instapayStep3, tx.instapayStep4].map((step, i) => (
                <div key={i} className="flex gap-3 text-sm text-blue-800/80">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">{i + 1}</span>
                  <p>{step}</p>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-2 pt-2">
              {paymentSettings.instapay_link && (
                <a 
                  href={paymentSettings.instapay_link} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  {tx.openInstapay}
                </a>
              )}
              
              {paymentSettings.instapay_whatsapp && (
                <div className="flex items-center justify-between bg-white border border-blue-200 p-3 rounded-xl">
                  <div className="text-xs">
                    <p className="text-gray-400">{tx.whatsappNumber}</p>
                    <p className="font-bold text-blue-900">{paymentSettings.instapay_whatsapp}</p>
                  </div>
                  <button 
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(paymentSettings.instapay_whatsapp);
                      const btn = document.activeElement as HTMLButtonElement;
                      const originalText = btn.innerHTML;
                      btn.innerHTML = `<span class="flex items-center gap-1 text-green-600"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>${tx.copied}</span>`;
                      setTimeout(() => { btn.innerHTML = originalText; }, 2000);
                    }}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex items-center gap-1 font-bold text-sm"
                  >
                    <Copy className="w-4 h-4" />
                    {tx.copyNumber}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        <Textarea label={tx.specialInstructions} value={notes} onChange={e => setNotes(e.target.value)} />
        
        <div className="bg-gray-50 p-4 rounded-2xl space-y-2">
          <div className="flex justify-between text-sm text-gray-500">
            <span>{tx.subtotal}</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          {type === "delivery" && (
            <div className="flex justify-between text-sm text-gray-500">
              <span>{tx.deliveryFeeLabel}</span>
              <span>{deliveryFee > 0 ? formatCurrency(deliveryFee) : tx.feeWillBeConfirmed}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-lg border-t pt-2 mt-2">
            <span>{tx.total}</span>
            <span className="text-accent">{formatCurrency(total)}</span>
          </div>
        </div>

        <Button type="submit" fullWidth loading={loading} disabled={type === "delivery" && deliveryZones.length > 0 && !selectedZone}>
          {tx.placeOrder}
        </Button>
      </form>
    </Modal>
  );
};

export default CustomerMenu;

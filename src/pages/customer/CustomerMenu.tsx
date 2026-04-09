import React, { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import { ShoppingCart, Plus, Minus, X, Search, CheckCircle, Package, Globe, Smartphone, Download, MessageCircle } from "lucide-react";
import { Card, Button, Input, Modal, Loading, Alert } from "../../components/ui";
import { subscribeToMenuItems, createOrder, getActivePromotions, type Promotion } from "../../services/restaurantService";
import PromotionPopup from "../../components/PromotionPopup";
import LazyImage from "../../components/LazyImage";
import type { MenuItem } from "../../config/supabase";
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

  // جلب الأصناف المطلوبة سابقاً من المستخدم (إذا كان مسجلاً)
  let userHistoryItems: MenuItem[] = [];
  if (userId) {
    const history = JSON.parse(localStorage.getItem(`user_history_${userId}`) || '[]');
    userHistoryItems = menuItems.filter(item => history.includes(item.id));
  } else {
    const history = JSON.parse(localStorage.getItem('user_history') || '[]');
    userHistoryItems = menuItems.filter(item => history.includes(item.id));
  }

  // اقتراحات منطقية بناءً على نوع الصنف
  const getSmartRecommendations = (item: MenuItem, allItems: MenuItem[]) => {
    const recommendations = [];
    const itemName = getItemName(item, lang).toLowerCase();
    const itemDesc = getItemDesc(item, lang).toLowerCase();

    // إذا كان الصنف أكلة رئيسية، اقترح مشروباً
    if (itemName.includes('برجر') || itemName.includes('بيتزا') || itemName.includes('باستا') ||
        itemName.includes('burger') || itemName.includes('pizza') || itemName.includes('pasta') ||
        itemName.includes('ساندويتش') || itemName.includes('sandwich') ||
        itemName.includes('طبق') || itemName.includes('dish') ||
        itemName.includes('وجبة') || itemName.includes('meal')) {

      const drinks = allItems.filter(i =>
        i.is_available &&
        (getCategoryName(i, lang).toLowerCase().includes('مشروب') ||
         getCategoryName(i, lang).toLowerCase().includes('drink') ||
         getItemName(i, lang).toLowerCase().includes('عصير') ||
         getItemName(i, lang).toLowerCase().includes('juice') ||
         getItemName(i, lang).toLowerCase().includes('مشروب') ||
         getItemName(i, lang).toLowerCase().includes('drink') ||
         getItemName(i, lang).toLowerCase().includes('cola') ||
         getItemName(i, lang).toLowerCase().includes('pepsi') ||
         getItemName(i, lang).toLowerCase().includes('sprite'))
      );

      if (drinks.length > 0) {
        recommendations.push({
          item: drinks[Math.floor(Math.random() * drinks.length)],
          type: 'drink',
          reason: lang === 'ar' ? 'مشروب مع الوجبة' : 'Drink with your meal'
        });
      }
    }

    // إذا كان الصنف حلوى أو دسرت، اقترح مشروباً ساخناً
    if (itemName.includes('كيك') || itemName.includes('cake') ||
        itemName.includes('آيس كريم') || itemName.includes('ice cream') ||
        itemName.includes('حلوى') || itemName.includes('dessert') ||
        itemName.includes('شوكولاتة') || itemName.includes('chocolate')) {

      const hotDrinks = allItems.filter(i =>
        i.is_available &&
        (getItemName(i, lang).toLowerCase().includes('قهوة') ||
         getItemName(i, lang).toLowerCase().includes('coffee') ||
         getItemName(i, lang).toLowerCase().includes('شاي') ||
         getItemName(i, lang).toLowerCase().includes('tea') ||
         getItemName(i, lang).toLowerCase().includes('لاتيه') ||
         getItemName(i, lang).toLowerCase().includes('latte'))
      );

      if (hotDrinks.length > 0) {
        recommendations.push({
          item: hotDrinks[Math.floor(Math.random() * hotDrinks.length)],
          type: 'hot_drink',
          reason: lang === 'ar' ? 'مشروب ساخن مع الحلوى' : 'Hot drink with dessert'
        });
      }
    }

    // إذا كان الصنف مشروباً، اقترح وجبة خفيفة
    if (itemName.includes('عصير') || itemName.includes('juice') ||
        itemName.includes('مشروب') || itemName.includes('drink') ||
        itemName.includes('cola') || itemName.includes('pepsi')) {

      const snacks = allItems.filter(i =>
        i.is_available &&
        (getItemName(i, lang).toLowerCase().includes('بطاطس') ||
         getItemName(i, lang).toLowerCase().includes('fries') ||
         getItemName(i, lang).toLowerCase().includes('شيبس') ||
         getItemName(i, lang).toLowerCase().includes('chips') ||
         getItemName(i, lang).toLowerCase().includes('ساندويتش') ||
         getItemName(i, lang).toLowerCase().includes('sandwich'))
      );

      if (snacks.length > 0) {
        recommendations.push({
          item: snacks[Math.floor(Math.random() * snacks.length)],
          type: 'snack',
          reason: lang === 'ar' ? 'وجبة خفيفة مع المشروب' : 'Snack with your drink'
        });
      }
    }

    // اقتراح ترقية لوجبة كاملة (combo meal)
    if (item.base_price && item.base_price < 50) {
      const expensiveItems = allItems.filter(i =>
        i.is_available &&
        i.id !== item.id &&
        i.base_price &&
        i.base_price > item.base_price * 1.5 &&
        i.base_price < item.base_price * 3
      );

      if (expensiveItems.length > 0) {
        recommendations.push({
          item: expensiveItems[Math.floor(Math.random() * expensiveItems.length)],
          type: 'upgrade',
          reason: lang === 'ar' ? 'ترقية لوجبة أكبر' : 'Upgrade to a larger meal'
        });
      }
    }

    return recommendations;
  };

  // الحصول على الاقتراحات الذكية أولاً
  const smartRecommendations = getSmartRecommendations(currentItem, menuItems);

  // إذا كان لدينا اقتراحات ذكية كافية، أعد أول 3
  if (smartRecommendations.length >= count) {
    return smartRecommendations.slice(0, count).map(r => r.item);
  }

  // إلا فاستخدم النظام القديم لملء الباقي
  const scores = menuItems
    .filter((item: MenuItem) => item.id !== currentItem.id && item.is_available)
    .map((item: MenuItem) => {
      const category = getCategoryName(item, lang);
      let score = 0;

      if (currentCategory && category && currentCategory === category) score += 5;

      const itemNameWords = new Set(splitWords(getItemName(item, lang)));
      const sharedNameWords = [...currentNameWords].filter((w) => itemNameWords.has(w));
      score += sharedNameWords.length * 2;

      const itemDescWords = new Set(splitWords(getItemDesc(item, lang)));
      const sharedDescWords = [...currentDescWords].filter((w) => itemDescWords.has(w));
      score += sharedDescWords.length;

      const priceDiff = Math.abs((item.base_price || 0) - (currentItem.base_price || 0));
      const priceAvg = ((item.base_price || 0) + (currentItem.base_price || 0)) / 2;
      if (priceAvg > 0 && priceDiff / priceAvg < 0.2) score += 1;

      if (userHistoryItems.some(hist => hist.id === item.id)) score += 3;
      const similarToHistory = userHistoryItems.some(hist => {
        const histNameWords = new Set(splitWords(getItemName(hist, lang)));
        const histDescWords = new Set(splitWords(getItemDesc(hist, lang)));
        const sharedHistName = [...histNameWords].filter((w) => itemNameWords.has(w));
        const sharedHistDesc = [...histDescWords].filter((w) => itemDescWords.has(w));
        return sharedHistName.length > 0 || sharedHistDesc.length > 0;
      });
      if (similarToHistory) score += 2;

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
  const applicable = promotions
    .filter((promo) => promo.is_active && (!promo.ends_at || new Date(promo.ends_at) > now))
    .map((promo) => {
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
    search: "ابحث عن أكلة...", all: "الكل", add: "إضافة",
    viewCart: "عرض السلة", cartEmpty: "السلة فارغة", cartTitle: "سلة التسوق",
    checkout: "إتمام الطلب", selectSize: "اختر الحجم", addons: "إضافات (اختياري)",
    total: "الإجمالي", addToCart: "أضف للسلة", checkoutTitle: "إتمام الطلب",
    orderType: "نوع الطلب", dineIn: "داخل المطعم", takeaway: "استلام من الفرع",
    delivery: "توصيل", tableNumber: "رقم الطاولة", tableNumberPlaceholder: "أدخل رقم طاولتك",
    deliveryAddress: "عنوان التوصيل", deliveryAddressPlaceholder: "أدخل عنوانك بالتفصيل",
    yourName: "اسمك", yourNamePlaceholder: "أدخل اسمك", phoneNumber: "رقم الهاتف",
    phonePlaceholder: "01XXXXXXXXX", phoneHelper: "سنتواصل معك بشأن طلبك",
    specialInstructions: "تعليمات خاصة (اختياري)", specialInstructionsPlaceholder: "أي طلبات خاصة...",
    orderSummary: "ملخص الطلب", subtotal: "المجموع", placeOrder: "تأكيد الطلب",
    orderSuccess: "تم استلام طلبك!", orderSuccessMsg: "تم تقديم طلبك بنجاح. سيبدأ المطعم في التحضير قريباً.",
    close: "إغلاق", noItems: "لا توجد أصناف",
    errorName: "يرجى إدخال اسمك",
    errorPhone: "يرجى إدخال رقم هاتف صحيح",
    errorTable: "يرجى إدخال رقم الطاولة", errorAddress: "يرجى إدخال عنوان التوصيل",
    errorOrderType: "يرجى اختيار نوع الطلب", size: "الحجم", cancel: "إلغاء",
    paymentMethod: "طريقة الدفع", cash: "الدفع عند الاستلام", instapay: "ادفع بـ InstaPay",
    errorPayment: "يرجى اختيار طريقة الدفع",
    instapayInstructions: "تعليمات الدفع بـ InstaPay",
    instapayStep1: "اضغط على زر InstaPay أدناه لفتح رابط الدفع",
    instapayStep2: "أكمل عملية الدفع بقيمة",
    instapayStep3: "خذ screenshot لإثبات التحويل",
    instapayStep4: "ابعت الـ screenshot على واتساب",
    whatsappNumber: "رقم الواتساب",
    copyNumber: "نسخ الرقم", copied: "تم النسخ ✓",
    openInstapay: "فتح رابط InstaPay",
    restaurantNotFound: "المطعم غير موجود",
    restaurantNotFoundDesc: "المطعم الذي تبحث عنه غير موجود أو غير نشط حالياً.",
    installApp: "حمّل التطبيق", installDesc: "أضف المنيو لشاشتك الرئيسية",
    installBtn: "تثبيت", installedMsg: "التطبيق مثبّت بالفعل ✓",
    notAvailable: "غير متاح",
    recommendations: "اقتراحات لك",
    addedToCart: "تمت الإضافة للسلة",
    skip: "تخطي",
    continueToCart: "المتابعة للسلة",
    recommendationReason: "اقتراح مميز",
  },
  en: {
    search: "Search for dishes...", all: "All", add: "ADD",
    viewCart: "View Cart", cartEmpty: "Your cart is empty", cartTitle: "Your Cart",
    checkout: "Proceed to Checkout", selectSize: "Select Size", addons: "Add-ons (Optional)",
    total: "Total", addToCart: "Add to Cart", checkoutTitle: "Checkout",
    orderType: "Order Type", dineIn: "Dine In", takeaway: "Takeaway",
    delivery: "Delivery", tableNumber: "Table Number", tableNumberPlaceholder: "Enter your table number",
    deliveryAddress: "Delivery Address", deliveryAddressPlaceholder: "Enter your full address",
    yourName: "Your Name", yourNamePlaceholder: "Enter your name", phoneNumber: "Phone Number",
    phonePlaceholder: "01XXXXXXXXX", phoneHelper: "We'll use this to contact you about your order",
    specialInstructions: "Special Instructions (Optional)", specialInstructionsPlaceholder: "Any special requests...",
    orderSummary: "Order Summary", subtotal: "Subtotal", placeOrder: "Place Order",
    orderSuccess: "Order Placed!", orderSuccessMsg: "Your order has been placed successfully. The restaurant will prepare it shortly.",
    close: "Close", noItems: "No items found",
    errorName: "Please enter your name",
    errorPhone: "Please enter a valid phone number",
    errorTable: "Please enter table number", errorAddress: "Please enter delivery address",
    errorOrderType: "Please select order type", size: "Size", cancel: "Cancel",
    paymentMethod: "Payment Method", cash: "Cash on Delivery", instapay: "Pay with InstaPay",
    errorPayment: "Please select a payment method",
    instapayInstructions: "InstaPay Payment Instructions",
    instapayStep1: "Tap the InstaPay button below to open the payment link",
    instapayStep2: "Complete the payment of",
    instapayStep3: "Take a screenshot of the transfer confirmation",
    instapayStep4: "Send the screenshot via WhatsApp to",
    whatsappNumber: "WhatsApp Number",
    copyNumber: "Copy Number", copied: "Copied ✓",
    openInstapay: "Open InstaPay Link",
    restaurantNotFound: "Restaurant Not Found",
    restaurantNotFoundDesc: "The restaurant you're looking for doesn't exist or is currently inactive.",
    installApp: "Get the App", installDesc: "Add menu to your home screen",
    installBtn: "Install", installedMsg: "App already installed ✓",
    notAvailable: "Not Available",
    recommendations: "Recommendations for you",
    addedToCart: "Added to cart",
    skip: "Skip",
    continueToCart: "Continue to Cart",
    recommendationReason: "Recommended item",
  },
};

const CustomerMenu: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
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
  const [paymentSettings, setPaymentSettings] = useState({
    cash_enabled: true, instapay_enabled: false, instapay_link: "", instapay_whatsapp: ""
  });
  const [installable, setInstallable] = useState(false);
  const [installed, setInstalled] = useState(false);
  const installCheckRef = useRef(false);

  const tx = T[lang];
  const dir = lang === "ar" ? "rtl" : "ltr";

  // ===== PWA Setup =====
  useEffect(() => {
    if (!installCheckRef.current) {
      installCheckRef.current = true;
      capturePWAInstallPrompt();
      setInstalled(isPWAInstalled());

      // Check install availability after a short delay
      const timer = setInterval(() => {
        setInstallable(isPWAInstallAvailable());
      }, 500);

      window.addEventListener('appinstalled', () => {
        setInstalled(true);
        setInstallable(false);
      });

      return () => clearInterval(timer);
    }
  }, []);

  // ===== Load Restaurant =====
  useEffect(() => { loadRestaurant(); }, [slug]);

  useEffect(() => {
    if (restaurant?.id) {
      // Inject dynamic PWA manifest with restaurant info
      injectDynamicManifest({
        name: restaurant.name,
        slug: restaurant.slug,
        logo_url: restaurant.logo_url || undefined,
        theme_color: '#f97316',
      });

      // Register service worker
      registerServiceWorker(restaurant.slug);

      // Load active promotions
      getActivePromotions(restaurant.id).then(setPromotions).catch(() => {
        console.error("Failed to load promotions");
      });

      // Subscribe to menu
      const sub = subscribeToMenuItems(restaurant.id, (data) => {
        console.log("Menu items loaded:", data.length);
        setMenuItems(data);
        setLoading(false);
      });
      return () => { sub.unsubscribe(); };
    }
  }, [restaurant]);

  // ===== Preload First Images =====
  useEffect(() => {
    if (menuItems.length > 0) {
      // Preload first 6 images for instant display
      const firstItems = menuItems.slice(0, 6).filter(item => item.image_url);
      firstItems.forEach(item => {
        const img = new Image();
        img.src = item.image_url!;
        // Use the same transform as LazyImage for consistency
        if (item.image_url!.includes('supabase')) {
          img.src = item.image_url!.replace('/storage/v1/object/public/', '/storage/v1/render/image/public/') +
            '?width=380&height=380&resize=contain&quality=65&format=webp';
        }
      });

      // Add resource hints for critical images
      const preloadLinks = firstItems.slice(0, 3).map(item => {
        if (!item.image_url) return null;
        const link = document.createElement('link');
        link.rel = 'preload';
        link.as = 'image';
        link.href = item.image_url!.includes('supabase')
          ? item.image_url!.replace('/storage/v1/object/public/', '/storage/v1/render/image/public/') +
            '?width=380&height=380&resize=contain&quality=65&format=webp'
          : item.image_url!;
        link.crossOrigin = 'anonymous';
        return link;
      }).filter(Boolean);

      // Add to head
      preloadLinks.forEach(link => {
        if (link) document.head.appendChild(link);
      });

      // Cleanup function
      return () => {
        preloadLinks.forEach(link => {
          if (link && document.head.contains(link)) {
            document.head.removeChild(link);
          }
        });
      };
    }
  }, [menuItems]);

  const loadRestaurant = async () => {
    if (!slug) return;
    const { data, error } = await supabase
      .from("restaurants").select("*").eq("slug", slug).eq("is_active", true).single();
    if (error || !data) { setLoading(false); return; }
    setRestaurant(data);
    if (data.payment_settings) setPaymentSettings({ ...{ cash_enabled: true, instapay_enabled: false, instapay_link: "", instapay_whatsapp: "" }, ...data.payment_settings });
  };

  const handleInstall = async () => {
    const result = await triggerPWAInstall();
    if (result === 'accepted') { setInstalled(true); setInstallable(false); }
  };

  const orderTypesEnabled = restaurant?.order_types_enabled || { dine_in: true, takeaway: true, delivery: false };
  const [dbCategories, setDbCategories] = useState<{ ar: string; en: string }[]>([]);
  useEffect(() => { if (restaurant?.id) { supabase.from("menu_categories").select("name, description").eq("restaurant_id", restaurant.id).eq("is_active", true).order("display_order", { ascending: true }).then(({ data }) => setDbCategories((data || []).map((c: any) => ({ ar: c.name, en: c.description })))); } }, [restaurant?.id]);
  const categoriesList = ["all", ...(dbCategories.length > 0 ? dbCategories.map(c => lang === "ar" ? c.ar : c.en) : [...new Set(menuItems.map((item) => getCategoryName(item, lang)).filter(Boolean))])];
  const filteredItems = menuItems.filter((item) => {
    const name = getItemName(item, lang);
    const matchesSearch = name.toLowerCase().includes(searchTerm.toLowerCase());
    const itemCat = lang === "ar" ? (item.category_ar || item.category || "") : (item.category || item.category_ar || "");
    const matchesCategory = categoryFilter === "all" || itemCat === categoryFilter;
    return matchesSearch && matchesCategory && item.is_available;
  });

  const addToCart = (item: MenuItem, selectedSize?: any, selectedAddons: any[] = []) => {
    const basePrice = selectedSize ? selectedSize.price : item.base_price;
    const discountPercent = getApplicableDiscount(item.id, promotions);
    const discountedBase = applyDiscount(basePrice, discountPercent);
    const addonsTotal = selectedAddons.reduce((sum, addon) => sum + addon.price, 0);
    const itemTotal = discountedBase + addonsTotal;

    const cartItem: CartItem = {
      ...item,
      base_price: discountedBase,
      quantity: 1,
      selectedSize,
      selectedAddons,
      itemTotal,
      discountPercent,
    };

    const existingIndex = cart.findIndex(
      (ci) => ci.id === item.id && ci.selectedSize?.name === selectedSize?.name &&
        JSON.stringify(ci.selectedAddons) === JSON.stringify(selectedAddons)
    );
    if (existingIndex >= 0) {
      const newCart = [...cart]; newCart[existingIndex].quantity += 1; setCart(newCart);
    } else { setCart([...cart, cartItem]); }

    // حفظ الصنف المضاف للاقتراحات
    setLastAddedItem(item);

    // الحصول على الاقتراحات وإظهارها
    const recommendations = getRecommendedItems(item, lang, menuItems, undefined, 3);
    if (recommendations.length > 0) {
      setCurrentRecommendations(recommendations);
      setShowRecommendationsModal(true);
    }

    setShowItemModal(false);
  };

  const updateQuantity = (index: number, delta: number) => {
    const newCart = [...cart]; newCart[index].quantity += delta;
    if (newCart[index].quantity <= 0) newCart.splice(index, 1);
    setCart(newCart);
  };

  const addRecommendationToCart = (item: MenuItem) => {
    const basePrice = item.base_price;
    const discountPercent = getApplicableDiscount(item.id, promotions);
    const discountedBase = applyDiscount(basePrice, discountPercent);
    const itemTotal = discountedBase;

    const cartItem: CartItem = {
      ...item,
      base_price: discountedBase,
      quantity: 1,
      selectedSize: undefined,
      selectedAddons: [],
      itemTotal,
      discountPercent,
    };

    const existingIndex = cart.findIndex(
      (ci) => ci.id === item.id && !ci.selectedSize && ci.selectedAddons.length === 0
    );
    if (existingIndex >= 0) {
      const newCart = [...cart]; newCart[existingIndex].quantity += 1; setCart(newCart);
    } else { setCart([...cart, cartItem]); }
  };
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const getItemQuantity = (itemId: string) => cart.reduce((sum, ci) => ci.id === itemId ? sum + ci.quantity : sum, 0);
  const handleRemoveOne = (itemId: string) => { const idx = cart.findIndex((ci) => ci.id === itemId); if (idx >= 0) updateQuantity(idx, -1); };
  const removeFromCart = (index: number) => { const newCart = [...cart]; newCart.splice(index, 1); setCart(newCart); };

  if (loading) return <Loading text={lang === "ar" ? "جاري تحميل المنيو..." : "Loading menu..."} />;

  if (!restaurant) {
    return (
      <div className="min-h-screen bg-bg-subtle flex items-center justify-center" dir={dir}>
        <Card className="text-center p-8 max-w-sm mx-4">
          <Package className="w-16 h-16 text-text-secondary mx-auto mb-4 opacity-50" />
          <h2 className="text-2xl font-bold text-text mb-2">{tx.restaurantNotFound}</h2>
          <p className="text-text-secondary">{tx.restaurantNotFoundDesc}</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20" dir={dir}>

      {/* ===== Cover Image ===== */}
      {restaurant?.cover_url && (
        <div className="relative h-48 md:h-64 bg-gradient-to-r from-accent/20 to-accent/10 overflow-hidden">
          <img
            src={restaurant.cover_url}
            alt={`${restaurant.name} cover`}
            className="w-full h-full object-cover"
            loading="lazy"
            decoding="async"
          />
          <div className="absolute inset-0 bg-black/20" />
          <div className="absolute bottom-4 left-4 right-4 text-white">
            <h1 className="text-2xl md:text-3xl font-bold mb-1">{restaurant.name}</h1>
            {restaurant.description && (
              <p className="text-sm md:text-base opacity-90">{restaurant.description}</p>
            )}
          </div>
        </div>
      )}

      {/* ===== PWA Install Banner ===== */}
      {installable && !installed && (
        <div className="bg-accent text-white px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 flex-shrink-0" />
            <div>
              <p className="font-semibold text-sm">{tx.installApp}</p>
              <p className="text-xs opacity-90">{tx.installDesc}</p>
            </div>
          </div>
          <button onClick={handleInstall}
            className="bg-white text-accent font-bold text-sm px-4 py-1.5 rounded-full flex-shrink-0 hover:bg-gray-100 transition-colors">
            {tx.installBtn}
          </button>
        </div>
      )}

      {/* ===== Header ===== */}
      <div className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-screen-lg mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              {restaurant.logo_url ? (
                <img src={restaurant.logo_url} alt={restaurant.name}
                  className="w-12 h-12 rounded-xl object-cover shadow-sm" />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
                  <span className="text-2xl">🍽️</span>
                </div>
              )}
              <div>
                <h1 className="font-bold text-lg text-gray-800 leading-tight">{restaurant.name}</h1>
                {restaurant.restaurant_type && (
                  <p className="text-xs text-gray-500">{restaurant.restaurant_type}</p>
                )}
                {restaurant.description && !restaurant.cover_url && (
                  <p className="text-xs text-gray-600 mt-1 line-clamp-2">{restaurant.description}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Install button (compact) */}
              {installable && !installed && (
                <button onClick={handleInstall}
                  className="p-2 rounded-full border border-gray-200 text-gray-600 hover:bg-gray-50">
                  <Download className="w-4 h-4" />
                </button>
              )}
              {/* Language Toggle */}
              <button onClick={() => setLang(lang === "ar" ? "en" : "ar")}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                <Globe className="w-4 h-4" />
                <span className="font-medium">{lang === "ar" ? "EN" : "ع"}</span>
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 ${dir === "rtl" ? "right-3" : "left-3"}`} />
            <input type="text" placeholder={tx.search} value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 bg-gray-50 ${dir === "rtl" ? "pr-10 pl-4" : "pl-10 pr-4"}`} />
          </div>
        </div>
      </div>

      {/* ===== Category Tabs ===== */}
      <div className="bg-white border-b sticky top-[116px] z-30">
        <div className="max-w-screen-lg mx-auto px-4">
          <div className="flex gap-2 overflow-x-auto py-2 scrollbar-hide">
            {categoriesList.map((category) => (
              <button key={category} onClick={() => setCategoryFilter(category || "all")}
                className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  categoryFilter === category ? "bg-accent text-white shadow-sm" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                {category === "all" ? tx.all : category}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ===== Menu Grid ===== */}
      <div className="max-w-screen-lg mx-auto px-4 py-4">
        {filteredItems.length === 0 ? (
          <div className="text-center py-20">
            <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">{tx.noItems}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filteredItems.map((item, index) => {
              const quantity = getItemQuantity(item.id);
              const hasVariations = (item.sizes && item.sizes.length > 0) || (item.addons && item.addons.length > 0);
              return (
                <div key={item.id} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                  {item.image_url ? (
                    <LazyImage
                      src={item.image_url?.startsWith('http') ? item.image_url : `${import.meta.env.VITE_CLOUDINARY_BASE_URL}/${item.image_url}`}
                      alt={getItemName(item, lang)}
                      width={380}
                      quality={65}
                      priority={index < 4}
                      skeletonClass="h-36"
                    />
                  ) : (
                    <div className="h-36 bg-gray-100 flex items-center justify-center">
                      <Package className="w-10 h-10 text-gray-300" />
                    </div>
                  )}
                  <div className="p-3">
                    <h3 className="font-semibold text-sm text-gray-800 mb-1 line-clamp-2 min-h-[2.5rem]">
                      {getItemName(item, lang)}
                    </h3>
                    {getItemDesc(item, lang) && (
                      <p className="text-xs text-gray-500 line-clamp-1 mb-1">{getItemDesc(item, lang)}</p>
                    )}
                    <div className="flex items-center justify-between mt-2">
                      {(() => {
                        const basePrice = item.sizes && item.sizes.length > 0
                          ? Math.min(...item.sizes.map((s) => s.price))
                          : item.base_price;
                        const discountPercent = getApplicableDiscount(item.id, promotions);
                        const discountedPrice = applyDiscount(basePrice, discountPercent);

                        return (
                          <p className="font-bold text-gray-900 text-sm">
                            {discountPercent > 0 ? (
                              <span className="flex items-baseline gap-1">
                                <span className="text-xs text-gray-400 line-through">{formatCurrency(basePrice)}</span>
                                <span>{formatCurrency(discountedPrice)}</span>
                              </span>
                            ) : (
                              <span>{formatCurrency(basePrice)}</span>
                            )}
                          </p>
                        );
                      })()}

                      {quantity === 0 ? (
                        <button
                          onClick={() => hasVariations ? (setSelectedItem(item), setShowItemModal(true)) : addToCart(item)}
                          className="px-4 py-1.5 border-2 border-accent text-accent font-bold text-xs rounded-lg hover:bg-accent hover:text-white transition-colors">
                          {tx.add}
                        </button>
                      ) : (
                        <div className="flex items-center bg-accent text-white rounded-lg overflow-hidden">
                          <button onClick={() => handleRemoveOne(item.id)} className="px-2 py-1.5 hover:bg-black/10">
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="px-2.5 font-bold text-sm">{quantity}</span>
                          <button onClick={() => hasVariations ? (setSelectedItem(item), setShowItemModal(true)) : addToCart(item)} className="px-2 py-1.5 hover:bg-black/10">
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ===== Modals ===== */}
      <CartModal isOpen={showCart} cart={cart} lang={lang} tx={tx} onClose={() => setShowCart(false)}
        onUpdateQuantity={updateQuantity} onRemove={removeFromCart}
        onCheckout={() => { setShowCart(false); setShowCheckout(true); }} />

      <ItemCustomizationModal
        isOpen={showItemModal}
        item={selectedItem}
        lang={lang}
        tx={tx}
        menuItems={menuItems}
        onClose={() => setShowItemModal(false)}
        onAdd={addToCart}
      />

      <RecommendationsModal
        isOpen={showRecommendationsModal}
        recommendations={currentRecommendations}
        lastAddedItem={lastAddedItem}
        lang={lang}
        tx={tx}
        onClose={() => setShowRecommendationsModal(false)}
        onAddRecommendation={addRecommendationToCart}
        onContinueToCart={() => { setShowRecommendationsModal(false); setShowCart(true); }}
      />

      <CheckoutModal isOpen={showCheckout} cart={cart} lang={lang} tx={tx}
        restaurant={restaurant} orderTypesEnabled={orderTypesEnabled}
        paymentSettings={paymentSettings}
        onClose={() => setShowCheckout(false)} onSuccess={() => { setCart([]); setShowCheckout(false); }} />

      {/* ===== Promotion Popup ===== */}
      <PromotionPopup promotions={promotions} lang={lang} />

      {/* ===== Bottom Cart Bar ===== */}
      {cartCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 px-4 pb-4">
          <button onClick={() => setShowCart(true)}
            className="w-full max-w-screen-lg mx-auto flex items-center justify-between bg-accent text-white rounded-2xl px-5 py-4 shadow-xl shadow-accent/30 hover:bg-accent/95 transition-colors">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 rounded-lg w-8 h-8 flex items-center justify-center font-bold text-sm">{cartCount}</div>
              <span className="font-bold text-base">{formatCurrency(cart.reduce((sum, item) => sum + item.itemTotal * item.quantity, 0))}</span>
            </div>
            <div className="flex items-center gap-2 font-semibold">
              <ShoppingCart className="w-5 h-5" />
              <span>{tx.viewCart}</span>
            </div>
          </button>
        </div>
      )}
    </div>
  );
};

// ===== Cart Modal =====
const CartModal: React.FC<{
  isOpen: boolean; cart: CartItem[]; lang: Lang; tx: any;
  onClose: () => void; onUpdateQuantity: (i: number, d: number) => void;
  onRemove: (i: number) => void; onCheckout: () => void;
}> = ({ isOpen, cart, lang, tx, onClose, onUpdateQuantity, onRemove, onCheckout }) => {
  const total = cart.reduce((sum, item) => sum + item.itemTotal * item.quantity, 0);
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={tx.cartTitle} size="lg">
      <div className="space-y-5" dir={lang === "ar" ? "rtl" : "ltr"}>
        {cart.length === 0 ? (
          <div className="text-center py-12">
            <ShoppingCart className="w-16 h-16 text-text-secondary mx-auto mb-4 opacity-30" />
            <p className="text-text-secondary">{tx.cartEmpty}</p>
          </div>
        ) : (
          <>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {cart.map((item, index) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                  <div className="flex-1">
                    <h4 className="font-semibold text-sm text-text">{lang === "ar" ? (item.name_ar || item.name) : item.name}</h4>
                    {item.selectedSize && <p className="text-xs text-text-secondary">{tx.size}: {getSizeName(item.selectedSize, lang)}</p>}
                    {item.selectedAddons.length > 0 && <p className="text-xs text-text-secondary">{item.selectedAddons.map((a) => getAddonName(a, lang)).join("، ")}</p>}
                    <p className="text-accent font-bold text-sm mt-1">{formatCurrency(item.itemTotal)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => onUpdateQuantity(index, -1)} className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center hover:bg-gray-300">
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-6 text-center font-bold text-sm">{item.quantity}</span>
                    <button onClick={() => onUpdateQuantity(index, 1)} className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center hover:bg-gray-300">
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                  <button onClick={() => onRemove(index)} className="p-1 text-red-400 hover:text-red-600">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            <div className="border-t pt-4">
              <div className="flex justify-between text-lg font-bold text-text mb-4">
                <span>{tx.total}</span><span>{formatCurrency(total)}</span>
              </div>
              <Button onClick={onCheckout} fullWidth size="lg">{tx.checkout}</Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};

// ===== Item Customization Modal =====
const ItemCustomizationModal: React.FC<{
  isOpen: boolean; item: MenuItem | null; lang: Lang; tx: any;
  menuItems: MenuItem[];
  onClose: () => void; onAdd: (item: MenuItem, size?: any, addons?: any[]) => void;
}> = ({ isOpen, item, lang, tx, menuItems, onClose, onAdd }) => {
  const [selectedSize, setSelectedSize] = useState<any>(null);
  const [selectedAddons, setSelectedAddons] = useState<any[]>([]);
  useEffect(() => {
    if (item?.sizes && item.sizes.length > 0) setSelectedSize(item.sizes[0]);
    setSelectedAddons([]);
  }, [item]);
  if (!item) return null;
  const toggleAddon = (addon: any) => {
    if (selectedAddons.find((a) => a.name === addon.name)) setSelectedAddons(selectedAddons.filter((a) => a.name !== addon.name));
    else setSelectedAddons([...selectedAddons, addon]);
  };
  const calcTotal = () => (selectedSize ? selectedSize.price : item.base_price) + selectedAddons.reduce((s, a) => s + a.price, 0);
  const recommended = getRecommendedItems(item, lang, menuItems, undefined, 3);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={getItemName(item, lang)} size="md">
      <div className="space-y-5" dir={lang === "ar" ? "rtl" : "ltr"}>
        {item.image_url && (
          <LazyImage
            src={item.image_url?.startsWith('http') ? item.image_url : `${import.meta.env.VITE_CLOUDFLARE_CDN_URL}/${item.image_url}`}
            alt={getItemName(item, lang)}
            width={600}
            quality={80}
            skeletonClass="h-44"
            className="rounded-xl"
          />
        )}
        {getItemDesc(item, lang) && <p className="text-text-secondary text-sm">{getItemDesc(item, lang)}</p>}
        {item.sizes && item.sizes.length > 0 && (
          <div>
            <h4 className="font-semibold text-text mb-3">{tx.selectSize}</h4>
            <div className="space-y-2">
              {item.sizes.map((size) => (
                <button key={size.name} onClick={() => setSelectedSize(size)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl border-2 transition-colors ${selectedSize?.name === size.name ? "border-accent bg-accent/5" : "border-gray-200 hover:border-accent/40"}`}>
                  <span className="font-medium text-text">{getSizeName(size, lang)}</span>
                  <span className="text-accent font-bold">{formatCurrency(size.price)}</span>
                </button>
              ))}
            </div>
          </div>
        )}
        {item.addons && item.addons.length > 0 && (
          <div>
            <h4 className="font-semibold text-text mb-3">{tx.addons}</h4>
            <div className="space-y-2">
              {item.addons.map((addon) => (
                <button key={addon.name} onClick={() => toggleAddon(addon)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl border-2 transition-colors ${selectedAddons.find((a) => a.name === addon.name) ? "border-accent bg-accent/5" : "border-gray-200 hover:border-accent/40"}`}>
                  <span className="font-medium text-text">{getAddonName(addon, lang)}</span>
                  <span className="text-accent font-bold">+{formatCurrency(addon.price)}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {recommended.length > 0 && (
          <div>
            <h4 className="font-semibold text-text mb-3">{lang === "ar" ? "أصناف مقترحة" : "Recommended"}</h4>
            <div className="grid grid-cols-1 gap-2">
              {recommended.map((rec) => (
                <div key={rec.id} className="flex items-center justify-between gap-3 p-3 rounded-xl border border-gray-200">
                  <div>
                    <p className="font-medium text-text">{getItemName(rec, lang)}</p>
                    <p className="text-xs text-text-secondary">{formatCurrency(rec.base_price)}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onAdd(rec, rec.sizes?.[0], [])}
                  >
                    {lang === "ar" ? "أضف" : "Add"}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="border-t pt-4">
          <div className="flex justify-between text-lg font-bold text-text mb-4">
            <span>{tx.total}</span><span>{formatCurrency(calcTotal())}</span>
          </div>
          <Button onClick={() => onAdd(item, selectedSize, selectedAddons)} fullWidth size="lg">{tx.addToCart}</Button>
        </div>
      </div>
    </Modal>
  );
};

// ===== Recommendations Modal =====
const RecommendationsModal: React.FC<{
  isOpen: boolean;
  recommendations: MenuItem[];
  lastAddedItem: MenuItem | null;
  lang: Lang;
  tx: any;
  onClose: () => void;
  onAddRecommendation: (item: MenuItem) => void;
  onContinueToCart: () => void;
}> = ({ isOpen, recommendations, lastAddedItem, lang, tx, onClose, onAddRecommendation, onContinueToCart }) => {
  const [addedItems, setAddedItems] = useState<Set<string>>(new Set());

  const handleAddRecommendation = (item: MenuItem) => {
    onAddRecommendation(item);
    setAddedItems(prev => new Set([...prev, item.id]));
  };

  const getRecommendationReason = (item: MenuItem) => {
    const itemName = getItemName(item, lang).toLowerCase();
    const lastItemName = lastAddedItem ? getItemName(lastAddedItem, lang).toLowerCase() : '';

    // منطق بسيط لتحديد سبب الاقتراح
    if (lastItemName.includes('برجر') || lastItemName.includes('بيتزا') || lastItemName.includes('burger') || lastItemName.includes('pizza')) {
      if (itemName.includes('عصير') || itemName.includes('مشروب') || itemName.includes('juice') || itemName.includes('drink')) {
        return lang === 'ar' ? 'مشروب منعش مع الوجبة' : 'Refreshing drink with your meal';
      }
    }

    if (lastItemName.includes('كيك') || lastItemName.includes('حلوى') || lastItemName.includes('cake') || lastItemName.includes('dessert')) {
      if (itemName.includes('قهوة') || itemName.includes('شاي') || itemName.includes('coffee') || itemName.includes('tea')) {
        return lang === 'ar' ? 'مشروب ساخن مع الحلوى' : 'Hot drink with dessert';
      }
    }

    if (lastItemName.includes('عصير') || lastItemName.includes('مشروب') || lastItemName.includes('juice') || lastItemName.includes('drink')) {
      if (itemName.includes('بطاطس') || itemName.includes('شيبس') || itemName.includes('fries') || itemName.includes('chips')) {
        return lang === 'ar' ? 'وجبة خفيفة مع المشروب' : 'Snack with your drink';
      }
    }

    return lang === 'ar' ? 'اقتراح مميز' : 'Recommended item';
  };

  if (!isOpen || !lastAddedItem) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={lang === 'ar' ? 'اقتراحات لك' : 'Recommendations for you'} size="lg">
      <div className="space-y-4" dir={lang === "ar" ? "rtl" : "ltr"}>
        <div className="text-center">
          <p className="text-text-secondary mb-4">
            {lang === 'ar'
              ? `أضفت ${getItemName(lastAddedItem, lang)} للسلة. إليك بعض الاقتراحات المناسبة:`
              : `You added ${getItemName(lastAddedItem, lang)} to your cart. Here are some suitable recommendations:`
            }
          </p>
        </div>

        <div className="space-y-3 max-h-96 overflow-y-auto">
          {recommendations.map((item, index) => (
            <div key={item.id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
              {item.image_url && (
                <LazyImage
                  src={item.image_url?.startsWith('http') ? item.image_url : `${import.meta.env.VITE_CLOUDFLARE_CDN_URL}/${item.image_url}`}
                  alt={getItemName(item, lang)}
                  width={128}
                  quality={70}
                  skeletonClass="h-16"
                  className="w-16 rounded-lg flex-shrink-0"
                />
              )}

              <div className="flex-1">
                <h4 className="font-semibold text-text">{getItemName(item, lang)}</h4>
                <p className="text-sm text-text-secondary mb-1">{getRecommendationReason(item)}</p>
                <p className="text-accent font-bold">{formatCurrency(item.base_price || 0)}</p>
              </div>

              <Button
                size="sm"
                onClick={() => handleAddRecommendation(item)}
                disabled={addedItems.has(item.id)}
                className={addedItems.has(item.id) ? 'bg-green-500 hover:bg-green-600' : ''}
              >
                {addedItems.has(item.id)
                  ? (lang === 'ar' ? '✓ تمت الإضافة' : '✓ Added')
                  : (lang === 'ar' ? '+ أضف' : '+ Add')
                }
              </Button>
            </div>
          ))}
        </div>

        <div className="border-t pt-4">
          <div className="flex gap-3">
            <Button onClick={onContinueToCart} fullWidth>
              {lang === 'ar' ? 'المتابعة للسلة' : 'Continue to Cart'}
            </Button>
            <Button variant="outline" onClick={onClose} fullWidth>
              {lang === 'ar' ? 'تخطي' : 'Skip'}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

// ===== Checkout Modal =====
const CheckoutModal: React.FC<{
  isOpen: boolean; cart: CartItem[]; lang: Lang; tx: any;
  restaurant: any; orderTypesEnabled: { dine_in: boolean; takeaway: boolean; delivery: boolean };
  paymentSettings: { cash_enabled: boolean; instapay_enabled: boolean; instapay_link: string; instapay_whatsapp: string };
  onClose: () => void; onSuccess: () => void;
}> = ({ isOpen, cart, lang, tx, restaurant, orderTypesEnabled, paymentSettings, onClose, onSuccess }) => {
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [orderType, setOrderType] = useState<"dine_in" | "takeaway" | "delivery" | "">("");
  const [tableNumber, setTableNumber] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "instapay" | "">("");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (orderTypesEnabled.dine_in) setOrderType("dine_in");
      else if (orderTypesEnabled.takeaway) setOrderType("takeaway");
      else if (orderTypesEnabled.delivery) setOrderType("delivery");
      else setOrderType("");
      // Default payment
      if (paymentSettings.cash_enabled) setPaymentMethod("cash");
      else if (paymentSettings.instapay_enabled) setPaymentMethod("instapay");
      else setPaymentMethod("");
    }
  }, [isOpen, orderTypesEnabled, paymentSettings]);

  const subtotal = cart.reduce((sum, item) => sum + item.itemTotal * item.quantity, 0);
  const tax = 0; // No tax applied
  const total = subtotal;
  const validatePhone = (p: string) => p.replace(/\s/g, "").length >= 7;

  const copyWhatsapp = () => {
    navigator.clipboard.writeText(paymentSettings.instapay_whatsapp);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const submitOrder = async (sendWhatsapp: boolean = false) => {
    setLoading(true);
    if (sendWhatsapp && restaurant?.whatsapp_number) {
      // إنشاء كائن طلب مؤقت لإرسال تفاصيل السلة
      const tempOrder = {
        order_number: `TEMP-${Date.now()}`,
        created_at: new Date().toISOString(),
        order_type: orderType,
        table_number: orderType === 'dine_in' ? tableNumber : null,
        customer_name: customerName,
        customer_phone: customerPhone,
        status: 'pending',
        items: cart,
        subtotal: subtotal,
        tax: tax,
        total: total,
        customer_notes: notes,
        restaurant_name: restaurant.name
      };
      sendOrderViaWhatsApp(tempOrder, restaurant.name, restaurant.whatsapp_number);
    }
    const orderData = {
      restaurant_id: restaurant.id,
      order_type: (orderType === "dine_in" ? "qr" : orderType === "takeaway" ? "counter" : "phone") as "qr" | "counter" | "phone",
      table_number: orderType === "dine_in" ? tableNumber : undefined,
      customer_name: customerName,
      customer_phone: customerPhone,
      items: cart.map((item) => ({
        menu_item_id: item.id,
        name: item.name_ar || item.name,
        quantity: item.quantity,
        base_price: item.base_price,
        selected_size: item.selectedSize,
        selected_addons: item.selectedAddons,
        item_total: item.itemTotal,
      })),
      subtotal, tax, total,
      customer_notes: (orderType === "delivery" ? `التوصيل إلى: ${deliveryAddress}\n` : "") + notes,
      payment_method: paymentMethod === "instapay" ? "instapay" : "cash",
    };
    const { data: orderResult, error: orderError } = await createOrder(orderData);
    setLoading(false);
    if (!orderError) {
      setOrderId(orderResult?.id || null);
      setSuccess(true);
      // تحديث تاريخ المستخدم
      const orderedItemIds = cart.map(item => item.id);
      const existingHistory = JSON.parse(localStorage.getItem('user_history') || '[]');
      const newHistory = [...new Set([...existingHistory, ...orderedItemIds])];
      localStorage.setItem('user_history', JSON.stringify(newHistory));
    } else { setError(orderError?.message || "فشل إرسال الطلب"); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!customerName.trim()) { setError(tx.errorName); return; }
    if (!validatePhone(customerPhone)) { setError(tx.errorPhone); return; }
    if (!orderType) { setError(tx.errorOrderType); return; }
    if (orderType === "dine_in" && !tableNumber.trim()) { setError(tx.errorTable); return; }
    if (orderType === "delivery" && !deliveryAddress.trim()) { setError(tx.errorAddress); return; }
    if (!paymentMethod && (paymentSettings.cash_enabled || paymentSettings.instapay_enabled)) { setError(tx.errorPayment); return; }

    // إرسال عبر واتساب إذا كان متوفراً، ثم تأكيد الطلب
    await submitOrder(!!restaurant?.whatsapp_number);
  };

  const resetForm = () => { setCustomerName(""); setCustomerPhone(""); setTableNumber(""); setDeliveryAddress(""); setNotes(""); setSuccess(false); setError(""); setPaymentMethod(""); setCopied(false); setOrderId(null); };

  const enabledTypes = [
    orderTypesEnabled.dine_in && { key: "dine_in" as const, label: tx.dineIn },
    orderTypesEnabled.takeaway && { key: "takeaway" as const, label: tx.takeaway },
    orderTypesEnabled.delivery && { key: "delivery" as const, label: tx.delivery },
  ].filter(Boolean) as { key: "dine_in" | "takeaway" | "delivery"; label: string }[];

  if (success) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title={tx.orderSuccess} size="md">
        <div className="text-center py-6" dir={lang === "ar" ? "rtl" : "ltr"}>
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-12 h-12 text-green-500" />
          </div>
          <h3 className="text-2xl font-bold text-text mb-2">{tx.orderSuccess}</h3>
          <p className="text-text-secondary mb-6">{tx.orderSuccessMsg}</p>
          {orderId && (
            <a
              href={`/order/${orderId}?lang=${lang}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full bg-accent text-white font-bold py-3 rounded-xl hover:bg-accent/90 transition-colors mb-3"
            >
              {lang === "ar" ? "🔍 تابع حالة طلبك" : "🔍 Track Your Order"}
            </a>
          )}
          <button onClick={() => { onSuccess(); resetForm(); }}
            className="w-full border border-gray-200 text-gray-600 font-medium py-2.5 rounded-xl hover:bg-gray-50 transition-colors text-sm">
            {tx.close}
          </button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={tx.checkoutTitle} size="lg">
      <form onSubmit={handleSubmit} className="space-y-5" dir={lang === "ar" ? "rtl" : "ltr"}>
        {error && <Alert type="error" message={error} />}

        {enabledTypes.length > 0 && (
          <div>
            <label className="label mb-3">{tx.orderType}</label>
            <div className={`grid gap-3`} style={{ gridTemplateColumns: `repeat(${enabledTypes.length}, 1fr)` }}>
              {enabledTypes.map(({ key, label }) => (
                <button key={key} type="button" onClick={() => setOrderType(key)}
                  className={`p-3 rounded-xl border-2 font-semibold text-sm transition-colors ${orderType === key ? "border-accent bg-accent/10 text-accent" : "border-gray-200 hover:border-accent/50 text-gray-600"}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        {orderType === "dine_in" && <Input label={tx.tableNumber} value={tableNumber} onChange={(e) => setTableNumber(e.target.value)} placeholder={tx.tableNumberPlaceholder} required />}
        {orderType === "delivery" && <Input label={tx.deliveryAddress} value={deliveryAddress} onChange={(e) => setDeliveryAddress(e.target.value)} placeholder={tx.deliveryAddressPlaceholder} required />}

        <Input label={tx.yourName} value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder={tx.yourNamePlaceholder} required />
        <Input label={tx.phoneNumber} type="tel" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder={tx.phonePlaceholder} required helperText={tx.phoneHelper} />

        <div>
          <label className="label mb-2">{tx.specialInstructions}</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={tx.specialInstructionsPlaceholder} rows={2} className="input-field w-full" />
        </div>

        {/* Payment Methods */}
        {(paymentSettings.cash_enabled || paymentSettings.instapay_enabled) && (
          <div>
            <label className="label mb-3">{tx.paymentMethod}</label>
            <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${[paymentSettings.cash_enabled, paymentSettings.instapay_enabled].filter(Boolean).length}, 1fr)` }}>
              {paymentSettings.cash_enabled && (
                <button type="button" onClick={() => setPaymentMethod("cash")}
                  className={`p-3 rounded-xl border-2 font-semibold text-sm transition-colors flex items-center justify-center gap-2 ${paymentMethod === "cash" ? "border-green-500 bg-green-50 text-green-700" : "border-gray-200 hover:border-green-300 text-gray-600"}`}>
                  <span>💵</span> {tx.cash}
                </button>
              )}
              {paymentSettings.instapay_enabled && (
                <button type="button" onClick={() => setPaymentMethod("instapay")}
                  className={`p-3 rounded-xl border-2 font-semibold text-sm transition-colors flex items-center justify-center gap-2 ${paymentMethod === "instapay" ? "border-purple-500 bg-purple-50 text-purple-700" : "border-gray-200 hover:border-purple-300 text-gray-600"}`}>
                  <img src="/icons/instapay-logo.png" alt="InstaPay" className="w-5 h-5 object-contain" />
                  InstaPay
                </button>
              )}
            </div>

            {/* InstaPay Instructions */}
            {paymentMethod === "instapay" && paymentSettings.instapay_enabled && (
              <div className="mt-3 bg-purple-50 border border-purple-200 rounded-xl p-4 space-y-3">
                <h4 className="font-bold text-purple-800 text-sm">{tx.instapayInstructions}</h4>
                <ol className="space-y-2 text-sm text-purple-700">
                  <li className="flex items-start gap-2"><span className="bg-purple-200 text-purple-800 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">1</span>{tx.instapayStep1}</li>
                  <li className="flex items-start gap-2"><span className="bg-purple-200 text-purple-800 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">2</span>{tx.instapayStep2} {formatCurrency(cart.reduce((s,i) => s + i.itemTotal * i.quantity, 0))}</li>
                  <li className="flex items-start gap-2"><span className="bg-purple-200 text-purple-800 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">3</span>{tx.instapayStep3}</li>
                  <li className="flex items-start gap-2"><span className="bg-purple-200 text-purple-800 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">4</span>{tx.instapayStep4}</li>
                </ol>

                {/* WhatsApp Number */}
                {paymentSettings.instapay_whatsapp && (
                  <div className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-purple-200">
                    <div>
                      <p className="text-xs text-purple-600 font-medium">{tx.whatsappNumber}</p>
                      <p className="font-bold text-purple-800 text-base tracking-wider">{paymentSettings.instapay_whatsapp}</p>
                    </div>
                    <button type="button" onClick={copyWhatsapp}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${copied ? "bg-green-100 text-green-700" : "bg-purple-100 text-purple-700 hover:bg-purple-200"}`}>
                      {copied ? "✓ " + tx.copied : tx.copyNumber}
                    </button>
                  </div>
                )}

                {/* InstaPay Button */}
                {paymentSettings.instapay_link && (
                  <a href={paymentSettings.instapay_link} target="_blank" rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-xl transition-colors">
                    <img src="/icons/instapay-logo.png" alt="InstaPay" className="w-6 h-6 object-contain brightness-0 invert" />
                    {tx.openInstapay}
                  </a>
                )}
              </div>
            )}
          </div>
        )}

        <div className="bg-gray-50 rounded-xl p-4 space-y-2">
          <h4 className="font-semibold text-text mb-3">{tx.orderSummary}</h4>
          {cart.map((item, index) => (
            <div key={index} className="flex justify-between text-sm">
              <span className="text-text-secondary">{item.quantity}× {lang === "ar" ? (item.name_ar || item.name) : item.name}{item.selectedSize && ` (${getSizeName(item.selectedSize, lang)})`}</span>
              <span className="text-text font-medium">{formatCurrency(item.itemTotal * item.quantity)}</span>
            </div>
          ))}
          <div className="border-t pt-2 mt-2 space-y-1">
            <div className="flex justify-between text-sm text-text-secondary"><span>{tx.subtotal}</span><span>{formatCurrency(subtotal)}</span></div>
            <div className="flex justify-between text-sm text-text-secondary"><span>{tx.tax}</span><span>{formatCurrency(tax)}</span></div>
            <div className="flex justify-between font-bold text-text text-base pt-1 border-t"><span>{tx.total}</span><span>{formatCurrency(total)}</span></div>
          </div>
        </div>

        <div className="flex gap-3 pt-1">
          <Button type="button" variant="outline" onClick={onClose} fullWidth>{tx.cancel}</Button>
          <Button type="submit" loading={loading} fullWidth>{tx.placeOrder}</Button>
        </div>
      </form>
    </Modal>
  );
};

export default CustomerMenu;

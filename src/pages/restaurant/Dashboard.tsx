import React, { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate, Routes, Route, Link, useLocation } from "react-router-dom";
import { Store as StoreIcon, LogOut, LayoutDashboard, ShoppingBag, UtensilsCrossed, FileText, Settings, Tag, AlertTriangle, KeyRound, Users, Boxes, ClipboardList } from "lucide-react";
import RestaurantHome from "./RestaurantHome";
import Orders from "./Orders";
import Menu from "./Menu";
import Reports from "./Reports";
import RestaurantSettings from "./RestaurantSettings";
import Promotions from "./Promotions";
import ChangePassword from "./ChangePassword";
import Staff from "./Staff";
import Inventory from "./Inventory";
import ManualOrder from "./ManualOrder";
import { getSession, clearSession, renewSession, getSessionExpiry } from "../../utils/session";
import { subscribeToOrders } from "../../services/restaurantService";
import { playNotificationBeep, notifyNewOrder, requestNotificationPermission } from "../../utils/notifications";

const WARNING_MINUTES = 5; // تحذير 5 دقائق قبل الانتهاء

const RestaurantDashboard: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<any>(null);
  const [showWarning, setShowWarning] = useState(false);
  const [minutesLeft, setMinutesLeft] = useState(0);
  const [pendingOrdersCount, setPendingOrdersCount] = useState(0);
  const [newOrderNotification, setNewOrderNotification] = useState<string | null>(null);
  const prevOrderCountRef = useRef(0);
  const prevOrderIdsRef = useRef<Set<string>>(new Set());

  const handleLogout = useCallback(() => {
    clearSession();
    navigate("/login");
  }, [navigate]);

  // تحقق من الجلسة كل دقيقة
  useEffect(() => {
    const userData = getSession();
    if (!userData) {
      navigate("/login");
      return;
    }
    setUser(userData);

    // طلب إذن الإشعارات
    requestNotificationPermission();

    const checkSession = setInterval(() => {
      const session = getSession();
      if (!session) {
        clearInterval(checkSession);
        navigate("/login");
        return;
      }

      const expiry = getSessionExpiry();
      if (expiry) {
        const msLeft = expiry.getTime() - Date.now();
        const minsLeft = Math.floor(msLeft / 60000);
        setMinutesLeft(minsLeft);
        setShowWarning(minsLeft <= WARNING_MINUTES && minsLeft > 0);
        if (minsLeft <= 0) {
          clearInterval(checkSession);
          clearSession();
          navigate("/login");
        }
      }
    }, 60000); // كل دقيقة

    // تجديد الجلسة عند أي نشاط
    const renewOnActivity = () => renewSession();
    window.addEventListener("click", renewOnActivity);
    window.addEventListener("keydown", renewOnActivity);

    return () => {
      clearInterval(checkSession);
      window.removeEventListener("click", renewOnActivity);
      window.removeEventListener("keydown", renewOnActivity);
    };
  }, [navigate]);

  // مراقبة الطلبات للإشعارات الصوتية
  useEffect(() => {
    if (!user?.restaurant_id) return;

    const subscription = subscribeToOrders(user.restaurant_id, (orders) => {
      const pendingCount = orders.filter(order => order.status === "pending").length;
      setPendingOrdersCount(pendingCount);

      // كشف الطلبات الجديدة
      const newPendingOrders = orders.filter(
        (order) => order.status === "pending" && !prevOrderIdsRef.current.has(order.id)
      );

      if (newPendingOrders.length > 0 && prevOrderIdsRef.current.size > 0) {
        console.log('New orders detected:', newPendingOrders);
        // صوت الإشعار
        playNotificationBeep();
        // Push notification لكل طلب جديد
        newPendingOrders.forEach((order) => {
          notifyNewOrder(order.order_number, order.order_type);
        });
        // تنبيه بصري في المتصفح كـ fallback
        if (document.hidden) {
          alert(`🔔 طلب جديد! وصل ${newPendingOrders.length} طلب جديد - تحقق من لوحة التحكم`);
        }
        // إشعار بصري في لوحة التحكم
        setNewOrderNotification(`وصل ${newPendingOrders.length} طلب جديد!`);
        // إخفاء الإشعار بعد 5 ثوانٍ
        setTimeout(() => setNewOrderNotification(null), 5000);
      }

      // تحديث قائمة الـ IDs المعروفة
      prevOrderIdsRef.current = new Set(orders.map((o) => o.id));
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [user?.restaurant_id]);

  if (!user) return null;

  const navItems = [
    { path: "/restaurant", icon: LayoutDashboard, label: "الرئيسية" },
    { path: "/restaurant/orders", icon: ShoppingBag, label: "الطلبات" },
    { path: "/restaurant/manual-order", icon: ClipboardList, label: "طلب يدوي" },
    { path: "/restaurant/menu", icon: UtensilsCrossed, label: "المنيو" },
    { path: "/restaurant/inventory", icon: Boxes, label: "المخزون" },
    { path: "/restaurant/reports", icon: FileText, label: "التقارير" },
    { path: "/restaurant/promotions", icon: Tag, label: "العروض" },
    { path: "/restaurant/staff", icon: Users, label: "الموظفون" },
    { path: "/restaurant/settings", icon: Settings, label: "الإعدادات" },
  ];

  return (
    <div className="min-h-screen bg-bg-subtle" dir="rtl">

      {/* تحذير انتهاء الجلسة */}
      {showWarning && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-warning text-white px-4 py-2.5 flex items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm font-semibold">
              ستنتهي جلستك خلال {minutesLeft} {minutesLeft === 1 ? "دقيقة" : "دقائق"} — اضغط أي مكان للتجديد
            </span>
          </div>
          <button onClick={renewSession} className="bg-white/20 hover:bg-white/30 px-3 py-1 rounded-lg text-sm font-bold transition-colors">
            تجديد الجلسة
          </button>
        </div>
      )}

      {/* إشعار الطلبات الجديدة */}
      {newOrderNotification && (
        <div className="fixed top-16 left-4 right-4 z-40 bg-accent text-white px-4 py-3 rounded-lg shadow-lg flex items-center justify-between gap-3 animate-bounce">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm font-semibold">{newOrderNotification}</span>
          </div>
          <button onClick={() => setNewOrderNotification(null)} className="text-white/80 hover:text-white">
            ✕
          </button>
        </div>
      )}

      {/* Top Navigation */}
      <nav className={`bg-white border-b border-border sticky z-40 ${showWarning ? "top-10" : "top-0"}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center">
              <StoreIcon className="w-8 h-8 text-accent" />
              <span className="ml-2 text-xl font-bold text-text">
                {user?.restaurant?.name || "Restaurant"}
              </span>
            </div>

            {/* Navigation */}
            <div className="hidden md:flex items-center space-x-4 space-x-reverse">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    location.pathname === item.path
                      ? "bg-accent text-white"
                      : "text-text-secondary hover:text-text hover:bg-bg-subtle"
                  }`}
                >
                  <item.icon className="w-4 h-4 ml-2" />
                  {item.label}
                </Link>
              ))}
            </div>

            {/* Right Side */}
            <div className="flex items-center space-x-4 space-x-reverse">
              {/* إشعار الطلبات المعلقة */}
              {pendingOrdersCount > 0 && (
                <div className="flex items-center bg-warning text-white px-3 py-1 rounded-full text-sm font-bold animate-pulse">
                  <ShoppingBag className="w-4 h-4 ml-1" />
                  {pendingOrdersCount} طلب معلق
                </div>
              )}

              {/* User Menu */}
              <div className="relative">
                <button className="flex items-center text-sm text-text-secondary hover:text-text">
                  <span>{user?.email}</span>
                </button>
              </div>

              {/* Logout */}
              <button
                onClick={handleLogout}
                className="flex items-center px-3 py-2 text-sm text-text-secondary hover:text-text hover:bg-bg-subtle rounded-md transition-colors"
              >
                <LogOut className="w-4 h-4 ml-2" />
                خروج
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Secondary Navigation */}
      <div className="bg-white border-b border-border sticky top-16 z-30">
        <div className="container-custom">
          <div className="flex gap-1 overflow-x-auto">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors whitespace-nowrap ${
                    isActive
                      ? "border-accent text-accent font-medium"
                      : "border-transparent text-text-secondary hover:text-text"
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  <span className="text-sm">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container-custom py-6">
        {/* تحذير كلمة المرور المؤقتة */}
        {user.temp_password && (
          <div className="mb-6 bg-warning/10 border border-warning/30 rounded-xl p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-bold text-warning">أنت تستخدم كلمة مرور مؤقتة!</p>
              <p className="text-sm text-text-secondary mt-0.5">يُنصح بتغيير كلمة المرور فوراً لحماية حسابك.</p>
            </div>
            <Link to="/restaurant/change-password"
              className="bg-warning text-white px-3 py-1.5 rounded-lg text-sm font-bold hover:bg-warning/90 transition-colors flex-shrink-0">
              تغيير الآن
            </Link>
          </div>
        )}

        <Routes>
          <Route index element={<RestaurantHome />} />
          <Route path="orders" element={<Orders />} />
          <Route path="manual-order" element={<ManualOrder />} />
          <Route path="menu" element={<Menu />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="reports" element={<Reports />} />
          <Route path="promotions" element={<Promotions />} />
          <Route path="staff" element={<Staff />} />
          <Route path="settings" element={<RestaurantSettings />} />
          <Route path="change-password" element={<ChangePassword />} />
        </Routes>
      </div>
    </div>
  );
};

export default RestaurantDashboard;

import React, { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { CheckCircle, Clock, ChefHat, Package, XCircle, Phone, Copy } from "lucide-react";
import { supabase } from "../../config/supabase";
import { formatCurrency } from "../../utils/helpers";

type OrderStatus = "pending" | "accepted" | "preparing" | "ready" | "completed" | "cancelled" | "rejected";

const statusConfig: Record<OrderStatus, { label: string; labelEn: string; icon: any; color: string; bg: string; step: number }> = {
  pending:   { label: "في الانتظار",    labelEn: "Pending",    icon: Clock,        color: "text-yellow-600", bg: "bg-yellow-100", step: 1 },
  accepted:  { label: "تم القبول",      labelEn: "Accepted",   icon: CheckCircle,  color: "text-blue-600",   bg: "bg-blue-100",   step: 2 },
  preparing: { label: "قيد التحضير",    labelEn: "Preparing",  icon: ChefHat,      color: "text-orange-600", bg: "bg-orange-100", step: 3 },
  ready:     { label: "جاهز للاستلام", labelEn: "Ready",      icon: Package,      color: "text-green-600",  bg: "bg-green-100",  step: 4 },
  completed: { label: "تم التسليم",     labelEn: "Completed",  icon: CheckCircle,  color: "text-green-700",  bg: "bg-green-100",  step: 5 },
  cancelled: { label: "ملغي",           labelEn: "Cancelled",  icon: XCircle,      color: "text-red-600",    bg: "bg-red-100",    step: 0 },
  rejected:  { label: "مرفوض",          labelEn: "Rejected",   icon: XCircle,      color: "text-red-600",    bg: "bg-red-100",    step: 0 },
};

const steps = ["pending", "accepted", "preparing", "ready", "completed"];

const OrderStatusPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const [searchParams] = useSearchParams();
  const lang = (searchParams.get("lang") || "ar") as "ar" | "en";
  const [order, setOrder] = useState<any>(null);
  const [restaurant, setRestaurant] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const dir = lang === "ar" ? "rtl" : "ltr";

  useEffect(() => {
    if (!orderId) return;
    loadOrder();

    // Real-time subscription
    const sub = supabase
      .channel(`order-${orderId}`)
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "orders",
        filter: `id=eq.${orderId}`,
      }, (payload) => {
        setOrder((prev: any) => ({ ...prev, ...payload.new }));
      })
      .subscribe();

    return () => { sub.unsubscribe(); };
  }, [orderId]);

  const loadOrder = async () => {
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single();

    if (!error && data) {
      setOrder(data);
      // Load restaurant
      const { data: rest } = await supabase
        .from("restaurants")
        .select("name, phone, logo_url")
        .eq("id", data.restaurant_id)
        .single();
      setRestaurant(rest);
    }
    setLoading(false);
  };

  const copyOrderId = () => {
    navigator.clipboard.writeText(orderId || "");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center" dir={dir}>
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">{lang === "ar" ? "جاري التحميل..." : "Loading..."}</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4" dir={dir}>
        <div className="text-center">
          <XCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-800 mb-2">
            {lang === "ar" ? "الطلب غير موجود" : "Order Not Found"}
          </h2>
        </div>
      </div>
    );
  }

  const status = order.status as OrderStatus;
  const config = statusConfig[status];
  const Icon = config.icon;
  const currentStep = config.step;
  const isTerminal = status === "cancelled" || status === "rejected";
  const isDone = status === "completed";

  return (
    <div className="min-h-screen bg-gray-50" dir={dir}>
      {/* Header */}
      <div className="bg-white shadow-sm px-4 py-4">
        <div className="max-w-md mx-auto flex items-center gap-3">
          {restaurant?.logo_url ? (
            <img src={restaurant.logo_url} alt={restaurant?.name} className="w-10 h-10 rounded-lg object-cover" />
          ) : (
            <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center text-lg">🍽️</div>
          )}
          <div>
            <h1 className="font-bold text-gray-800">{restaurant?.name}</h1>
            <p className="text-xs text-gray-500">{lang === "ar" ? "متابعة الطلب" : "Order Tracking"}</p>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-6 space-y-5">
        {/* Order Number */}
        <div className="bg-white rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 mb-0.5">{lang === "ar" ? "رقم الطلب" : "Order Number"}</p>
            <p className="font-bold text-gray-800 text-lg">#{order.order_number}</p>
          </div>
          <button onClick={copyOrderId}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${copied ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
            <Copy className="w-4 h-4" />
            {copied ? (lang === "ar" ? "تم النسخ" : "Copied") : (lang === "ar" ? "نسخ" : "Copy")}
          </button>
        </div>

        {/* Status Card */}
        <div className={`rounded-2xl p-6 ${config.bg} text-center`}>
          <div className={`w-20 h-20 rounded-full ${config.bg} border-4 border-white shadow-md flex items-center justify-center mx-auto mb-4`}>
            <Icon className={`w-10 h-10 ${config.color} ${!isTerminal && !isDone ? "animate-pulse" : ""}`} />
          </div>
          <h2 className={`text-2xl font-bold ${config.color} mb-1`}>
            {lang === "ar" ? config.label : config.labelEn}
          </h2>
          {status === "preparing" && (
            <p className="text-sm text-gray-600 mt-1">
              {lang === "ar" ? "مطعمك يحضّر طلبك الآن 👨‍🍳" : "Your order is being prepared 👨‍🍳"}
            </p>
          )}
          {status === "ready" && (
            <p className="text-sm text-gray-600 mt-1">
              {lang === "ar" ? "طلبك جاهز! توجّه للاستلام 🎉" : "Your order is ready! Come pick it up 🎉"}
            </p>
          )}
          {status === "rejected" && order.internal_notes && (
            <p className="text-sm text-red-600 mt-2">{order.internal_notes}</p>
          )}
        </div>

        {/* Progress Steps */}
        {!isTerminal && (
          <div className="bg-white rounded-2xl p-5">
            <p className="text-sm font-semibold text-gray-600 mb-4">
              {lang === "ar" ? "مراحل الطلب" : "Order Progress"}
            </p>
            <div className="relative">
              {/* Progress Line */}
              <div className="absolute top-5 right-5 left-5 h-0.5 bg-gray-200">
                <div
                  className="h-full bg-accent transition-all duration-700"
                  style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
                />
              </div>

              <div className="flex justify-between relative">
                {steps.map((s, i) => {
                  const sc = statusConfig[s as OrderStatus];
                  const StepIcon = sc.icon;
                  const isCompleted = currentStep > i + 1;
                  const isCurrent = currentStep === i + 1;
                  return (
                    <div key={s} className="flex flex-col items-center gap-2">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center z-10 transition-all ${
                        isCompleted ? "bg-accent text-white" :
                        isCurrent ? `${sc.bg} ${sc.color} ring-2 ring-accent ring-offset-2` :
                        "bg-gray-100 text-gray-400"
                      }`}>
                        <StepIcon className="w-5 h-5" />
                      </div>
                      <span className={`text-xs text-center leading-tight max-w-[60px] ${isCurrent ? "font-bold text-accent" : "text-gray-400"}`}>
                        {lang === "ar" ? sc.label : sc.labelEn}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Order Items */}
        <div className="bg-white rounded-2xl p-4">
          <p className="text-sm font-semibold text-gray-600 mb-3">
            {lang === "ar" ? "تفاصيل الطلب" : "Order Details"}
          </p>
          <div className="space-y-2">
            {order.items?.map((item: any, index: number) => (
              <div key={index} className="flex justify-between text-sm">
                <span className="text-gray-600">{item.quantity}× {item.name}</span>
                <span className="font-medium text-gray-800">{formatCurrency(item.item_total * item.quantity)}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-gray-100 mt-3 pt-3 space-y-1">
            <div className="flex justify-between text-sm text-gray-500">
              <span>{lang === "ar" ? "المجموع" : "Subtotal"}</span>
              <span>{formatCurrency(order.subtotal)}</span>
            </div>
            {order.tax > 0 && (
              <div className="flex justify-between text-sm text-gray-500">
                <span>{lang === "ar" ? "الضريبة" : "Tax"}</span>
                <span>{formatCurrency(order.tax)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-gray-800 text-base pt-1 border-t border-gray-100">
              <span>{lang === "ar" ? "الإجمالي" : "Total"}</span>
              <span>{formatCurrency(order.total)}</span>
            </div>
          </div>
        </div>

        {/* Contact Restaurant */}
        {restaurant?.phone && (
          <a href={`tel:${restaurant.phone}`}
            className="flex items-center justify-center gap-2 w-full bg-white border border-gray-200 text-gray-700 font-semibold py-3 rounded-2xl hover:bg-gray-50 transition-colors">
            <Phone className="w-5 h-5 text-accent" />
            {lang === "ar" ? "اتصل بالمطعم" : "Call Restaurant"}
          </a>
        )}

        {/* Live indicator */}
        {!isDone && !isTerminal && (
          <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            {lang === "ar" ? "يتحدث تلقائياً" : "Updates automatically"}
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderStatusPage;

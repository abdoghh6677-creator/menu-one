import React, { useEffect, useState, useRef } from "react";
import {
  Clock,
  CheckCircle,
  XCircle,
  Package,
  Phone,
  User,
  MessageSquare,
  Printer,
  MessageCircle,
  Edit,
  ChefHat,
} from "lucide-react";
import {
  Card,
  Button,
  Badge,
  Modal,
  Textarea,
  Loading,
  Alert,
} from "../../components/ui";
import {
  subscribeToOrders,
  updateOrderStatus,
  updateOrderItems,
  checkPermission,
} from "../../services/restaurantService";
import type { Order } from "../../config/supabase";
import { supabase } from "../../config/supabase";
import { getSession } from "../../utils/session";
import { formatDateTime, formatCurrency } from "../../utils/helpers";
import { playNotificationBeep, notifyNewOrder, requestNotificationPermission, getNotificationStatus, playSuccessBeep, playWarningBeep, sendOrderViaWhatsApp } from "../../utils/notifications";

const Orders: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [restaurantName, setRestaurantName] = useState<string>("");
  const [restaurant, setRestaurant] = useState<any>(null);
  const [canManageOrders, setCanManageOrders] = useState(false);
  const [restaurantWhatsapp, setRestaurantWhatsapp] = useState<string>("");
  const [newOrderNotification, setNewOrderNotification] = useState<string | null>(null);
  const prevOrderCountRef = useRef(0);
  const prevOrderIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const user = getSession();
    if (!user?.restaurant_id) return;

    setRestaurantName(user.restaurant?.name || "");

    // فحص صلاحيات المستخدم
    const checkUserPermissions = async () => {
      const hasPermission = await checkPermission(user.restaurant_id, user.id, 'can_edit_orders');
      setCanManageOrders(hasPermission);
    };

    checkUserPermissions();

    // جلب بيانات المطعم للحصول على رقم واتساب
    const fetchRestaurant = async () => {
      const { data, error } = await supabase
        .from("restaurants")
        .select("*")
        .eq("id", user.restaurant_id)
        .single();

      if (!error && data) {
        setRestaurant(data);
        setRestaurantWhatsapp(data.whatsapp_number || "");
        setRestaurantName(data.name || "");
      }
    };

    fetchRestaurant();

    const subscription = subscribeToOrders(user.restaurant_id, (data) => {
      // كشف الطلبات الجديدة
      const newPendingOrders = data.filter(
        (order) => order.status === "pending" && !prevOrderIdsRef.current.has(order.id)
      );

      if (newPendingOrders.length > 0 && prevOrderIdsRef.current.size > 0) {
        // إشعار بصري في لوحة التحكم
        setNewOrderNotification(`وصل ${newPendingOrders.length} طلب جديد!`);
        // إخفاء الإشعار بعد 5 ثوانٍ
        setTimeout(() => setNewOrderNotification(null), 5000);
      }

      // تحديث قائمة الـ IDs المعروفة
      prevOrderIdsRef.current = new Set(data.map((o) => o.id));
      prevOrderCountRef.current = data.length;
      setOrders(data);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handlePrintOrder = (order: Order) => {
    const orderTypeLabels: Record<string, string> = { qr: "داخل المطعم", counter: "استلام من الفرع", phone: "توصيل", table: "طاولة" };
    const statusLabels: Record<string, string> = { pending: "معلق", accepted: "مقبول", preparing: "قيد التحضير", ready: "جاهز", completed: "مكتمل", cancelled: "ملغي", rejected: "مرفوض" };
    
    // إعدادات حجم الورق
    const paperSize = restaurant?.print_settings?.paper_size || "58mm";
    const isA4 = paperSize === "A4";
    const maxWidth = isA4 ? "190mm" : paperSize === "80mm" ? "72mm" : "48mm";
    const fontSize = isA4 ? "14pt" : paperSize === "80mm" ? "11pt" : "9pt";
    const logoSize = isA4 ? "120px" : paperSize === "80mm" ? "80px" : "60px";

    const printWindow = window.open("", "_blank", "width=800,height=600");
    if (!printWindow) return;
    
    const html = `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <title>طلب #${order.order_number}</title>
  <style>
    @page { margin: 2mm; size: ${isA4 ? 'A4' : 'portrait'}; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
      font-size: ${fontSize}; 
      width: ${maxWidth}; 
      margin: 0 auto; 
      color: #000;
      background: white; 
      line-height: 1.3;
    }
    .center { text-align: center; }
    .bold { font-weight: bold; }
    .big { font-size: 1.25em; margin: 2px 0; }
    .line { border-top: 1px dashed #000; margin: 5px 0; }
    .row { display: flex; justify-content: space-between; margin: 3px 0; gap: 5px; }
    .title { font-size: 1.1em; font-weight: bold; margin: 3px 0; background: #eee; padding: 2px; }
    .logo { width: ${logoSize}; height: ${logoSize}; object-fit: contain; margin: 0 auto 5px; display: block; border-radius: 8px; }
    .item-row { margin-bottom: 5px; }
    .item-details { font-size: 0.9em; color: #333; padding-right: 10px; }
    .total-row { font-size: 1.15em; font-weight: bold; margin-top: 5px; border-top: 1px solid #000; padding-top: 3px; }
    .footer { font-size: 0.85em; margin-top: 15px; text-align: center; border-top: 1px solid #eee; padding-top: 8px; }
    @media print { 
      body { width: 100%; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="center">
    ${restaurant?.logo_url ? `<img src="${restaurant.logo_url}" class="logo" />` : ""}
    <div class="big bold">${restaurant?.name || "🍽️ طلب جديد"}</div>
    <div class="title">فاتورة عميل #${order.order_number}</div>
    <div style="font-size: 0.85em;">${new Date(order.created_at).toLocaleString('ar-EG', {
      timeZone: 'Africa/Cairo',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })}</div>
  </div>
  
  <div class="line"></div>
  
  <div class="row"><span class="bold">نوع الطلب:</span><span>${orderTypeLabels[order.order_type] || order.order_type}</span></div>
  ${order.scheduled_date ? `<div class="row" style="color:#d9480f; background:#fff4e6; padding:2px; border-radius:4px;"><span class="bold">مجدول لـ:</span><span>${order.scheduled_date} ${order.scheduled_time}</span></div>` : ""}
  ${order.table_number ? `<div class="row"><span class="bold">الطاولة:</span><span>${order.table_number}</span></div>` : ""}
  ${order.customer_name ? `<div class="row"><span class="bold">العميل:</span><span>${order.customer_name}</span></div>` : ""}
  ${order.customer_phone ? `<div class="row"><span class="bold">الهاتف:</span><span>${order.customer_phone}</span></div>` : ""}
  <div class="row"><span class="bold">طريقة الدفع:</span><span>${order.payment_method === 'instapay' ? 'إنستا باي' : 'نقداً'}</span></div>
  
  <div class="line"></div>
  
  <div class="bold" style="margin-bottom:4px">الأصناف:</div>
  <div style="margin-bottom: 8px;">
  ${(order.items as any[])?.map((item: any) => `
    <div class="item-row">
      <div class="row">
        <span>${item.quantity}× ${item.name}</span>
        <span>${(item.item_total * item.quantity).toFixed(2)}</span>
      </div>
      ${item.selected_size ? `<div class="item-details"> الحجم: ${item.selected_size.name}</div>` : ""}
      ${item.selected_addons?.length ? `<div class="item-details"> إضافات: ${item.selected_addons.map((a: any) => a.name).join(" + ")}</div>` : ""}
    </div>
  `).join("") || ""}
  </div>
  
  <div class="line"></div>
  
  <div class="row"><span>المجموع:</span><span>${order.subtotal?.toFixed(2)}</span></div>
  ${order.tax ? `<div class="row"><span>الضريبة:</span><span>${order.tax?.toFixed(2)}</span></div>` : ""}
  ${order.delivery_fee ? `<div class="row"><span>رسوم التوصيل:</span><span>${order.delivery_fee?.toFixed(2)}</span></div>` : ""}
  ${order.discount ? `<div class="row text-red-600"><span>الخصم:</span><span>-${order.discount?.toFixed(2)}</span></div>` : ""}
  <div class="row total-row">
    <span>الإجمالي:</span>
    <span>${order.total?.toFixed(2)} ج.م</span>
  </div>
  
  ${order.customer_notes ? `
    <div class="line"></div>
    <div class="bold" style="font-size: 0.85em;">ملاحظات:</div>
    <div style="font-size: 0.85em;">${order.customer_notes}</div>
  ` : ""}
  
  <div class="center footer">
    <p>شكراً لزيارتكم!</p>
    <p style="margin-top: 4px; font-size: 0.8em; opacity: 0.8;">تم إصدار الفاتورة بواسطة ${restaurant?.name}</p>
  </div>
  
  <script>
    window.onload = () => { 
      window.print(); 
      setTimeout(() => window.close(), 500); 
    }
  <\/script>
</body>
</html>`;
    printWindow.document.write(html);
    printWindow.document.close();
  };

  const handlePrintKitchenOrder = (order: Order) => {
    const orderTypeLabels: Record<string, string> = { qr: "داخلي", counter: "تيك أواي", phone: "توصيل", table: "طاولة" };
    
    const paperSize = restaurant?.print_settings?.paper_size || "58mm";
    const isA4 = paperSize === "A4";
    const maxWidth = isA4 ? "190mm" : paperSize === "80mm" ? "72mm" : "48mm";
    const fontSize = isA4 ? "16pt" : paperSize === "80mm" ? "12pt" : "11pt";

    const printWindow = window.open("", "_blank", "width=800,height=600");
    if (!printWindow) return;
    
    const html = `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <title>مطبخ - #${order.order_number}</title>
  <style>
    @page { margin: 2mm; size: auto; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Arial Black', Gadget, sans-serif; font-size: ${fontSize}; width: ${maxWidth}; margin: 0 auto; color: #000; }
    .header { border: 3px solid #000; padding: 5px; text-align: center; margin-bottom: 5px; }
    .header-title { font-size: 1.5em; font-weight: bold; text-decoration: underline; }
    .info { border-bottom: 2px solid #000; padding: 5px 0; margin-bottom: 5px; font-weight: bold; }
    .item { padding: 5px 0; border-bottom: 1px dashed #000; }
    .qty { font-size: 1.4em; border: 2px solid #000; padding: 0 5px; margin-left: 5px; }
    .addons { background: #f0f0f0; padding: 3px; margin: 3px 0; border: 1px solid #000; }
    .notes { background: #000; color: #fff; padding: 8px; margin-top: 10px; font-weight: bold; }
    @media print { body { width: 100%; } }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-title">بون مطبخ #${order.order_number}</div>
    <div>النوع: ${orderTypeLabels[order.order_type] || order.order_type} ${order.table_number ? `(طاولة ${order.table_number})` : ""}</div>
  </div>

  <div class="info">
    <div>الوقت: ${new Date(order.created_at).toLocaleTimeString('ar-EG')}</div>
    ${order.customer_name ? `<div>العميل: ${order.customer_name}</div>` : ""}
  </div>

  <div style="margin-bottom: 10px;">
    ${(order.items as any[])?.map((item: any) => `
      <div class="item">
        <div style="display:flex; align-items:center;">
          <span class="qty">${item.quantity}</span>
          <span style="font-size:1.2em;">${item.name}</span>
        </div>
        ${item.selected_size ? `<div style="font-size:0.9em;">- الحجم: ${item.selected_size.name}</div>` : ""}
        ${item.selected_addons?.length ? `<div class="addons">** إضافات: ${item.selected_addons.map((a: any) => a.name).join(", ")}</div>` : ""}
      </div>
    `).join("") || ""}
  </div>

  ${order.customer_notes ? `
    <div class="notes">
      ملاحظات هامة للتحضير:<br>
      ${order.customer_notes}
    </div>
  ` : ""}

  <div style="text-align:center; font-size:0.8em; margin-top:10px; border-top:1px solid #000;">
    تاريخ الطباعة: ${new Date().toLocaleString('ar-EG')}
  </div>

  <script>
    window.onload = () => {
      window.print();
      setTimeout(() => window.close(), 500);
    }
  <\/script>
</body>
</html>`;
    printWindow.document.write(html);
    printWindow.document.close();
  };

  const filteredOrders = orders
    .filter((order) => order.status === statusFilter)
    .sort((a, b) => {
      // Oldest first (FIFO)
      return (
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
    });

  const handleStatusUpdate = async (orderId: string, newStatus: string, notes?: string) => {
    const success = await updateOrderStatus(orderId, newStatus, undefined, notes);
    if (!success) {
      alert("فشل تحديث حالة الطلب");
      return;
    }

    // إشعار صوتي حسب نوع التحديث
    if (["accepted", "preparing", "ready", "completed"].includes(newStatus)) {
      playSuccessBeep();
    } else if (newStatus === "cancelled" || newStatus === "rejected") {
      playWarningBeep();
    }
  };

  const handleViewDetails = (order: Order) => {
    setSelectedOrder(order);
    setShowDetailsModal(true);
  };

  const handleEditOrder = (order: Order) => {
    setSelectedOrder(order);
    setShowEditModal(true);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      pending: "warning",
      accepted: "accent-secondary",
      preparing: "warning",
      ready: "success",
      completed: "success",
      cancelled: "neutral",
      rejected: "error",
    };
    const statusLabels: Record<string, string> = { 
      pending: "جديد", 
      accepted: "مقبول", 
      preparing: "قيد التحضير", 
      ready: "جاهز", 
      completed: "مكتمل", 
      cancelled: "ملغي", 
      rejected: "مرفوض" 
    };
    return <Badge variant={variants[status] || "neutral"}>{statusLabels[status] || status}</Badge>;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="w-5 h-5 text-warning" />;
      case "accepted":
        return <Package className="w-5 h-5 text-accent-secondary" />;
      case "preparing":
        return <ChefHat className="w-5 h-5 text-orange-500" />;
      case "ready":
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case "completed":
        return <CheckCircle className="w-5 h-5 text-success" />;
      case "cancelled":
      case "rejected":
        return <XCircle className="w-5 h-5 text-error" />;
      default:
        return <Clock className="w-5 h-5 text-text-secondary" />;
    }
  };

  const downloadOrdersCsv = (ordersToExport: Order[]) => {
    const headers = [
      "Order #",
      "Date",
      "Customer Name",
      "Phone",
      "Order Type",
      "Items",
      "Total",
      "Status",
    ];

    const rows = ordersToExport.map((order) => {
      const items = (order.items || [])
        .map((item: any) => {
          const name = item.name || item.title || "";
          const size = item.selected_size?.name || item.size || "";
          const qty = item.quantity || 1;
          const line = `${qty}× ${name}` + (size ? ` (${size})` : "");
          return line;
        })
        .join(" | ");

      const date = new Date(order.created_at).toLocaleString("ar-EG", {
        timeZone: 'Africa/Cairo',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      return [
        order.order_number,
        date,
        order.customer_name || "",
        order.customer_phone || "",
        order.order_type || "",
        items,
        order.total != null ? order.total.toFixed(2) : "",
        order.status || "",
      ];
    });

    const csvContent = [headers, ...rows]
      .map((row) =>
        row
          .map((cell) => {
            const value = String(cell ?? "").replace(/"/g, '""');
            return `"${value}"`;
          })
          .join(",")
      )
      .join("\r\n");

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `orders-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return <Loading text="جاري تحميل الطلبات..." />;
  }

  const pendingCount = orders.filter((o) => o.status === "pending").length;

  return (
    <div className="space-y-6">
      {/* New Order Notification */}
      {newOrderNotification && (
        <Alert
          type="success"
          message={newOrderNotification}
          className="animate-bounce border-2 border-green-500 bg-green-50"
        />
      )}

      {/* Header */}
      <div className="flex صنف-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold text-text mb-2">Orders</h2>
          <p className="text-text-secondary">
            Manage and track customer orders in real-time
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => downloadOrdersCsv(filteredOrders)}
          >
            تنزيل شيت
          </Button>
          {pendingCount > 0 && (
            <Badge variant="warning" className="text-lg px-4 py-2 animate-pulse">
              {pendingCount} بانتظار التأكيد
            </Badge>
          )}
        </div>
      </div>

      {/* Real-time indicator */}
      <div className="flex items-center gap-2 text-sm text-success font-medium">
        <div className="w-2 h-2 bg-success rounded-full animate-pulse" />
        <span>تحديثات الطلبات مباشرة • صوت التنبيه مفعل</span>
      </div>

      {/* Status Filter */}
      <div className="flex flex-wrap gap-2 text-sm md:text-base">
        {[
          { id: "pending", label: "جديدة" },
          { id: "accepted", label: "مقبولة" },
          { id: "preparing", label: "قيد التحضير" },
          { id: "ready", label: "جاهزة" },
          { id: "completed", label: "مكتملة" },
          { id: "cancelled", label: "ملغاة" }
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => setStatusFilter(item.id)}
            className={`px-4 py-2 rounded-xl font-bold transition-all ${
              statusFilter === item.id
                ? "bg-accent text-white shadow-md transform scale-105"
                : "bg-white text-text-secondary border border-border hover:border-accent/30"
            }`}
          >
            {item.label}
            {item.id === "pending" && pendingCount > 0 && ` (${pendingCount})`}
          </button>
        ))}
      </div>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <Card className="text-center py-12">
          <Package className="w-16 h-16 text-text-secondary mx-auto mb-4 opacity-50" />
          <h3 className="text-xl font-semibold text-text mb-2">
            لا توجد طلبات
          </h3>
          <p className="text-text-secondary">
            لا توجد طلبات في هذه الفئة حالياً.
          </p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredOrders.map((order) => (
            <Card
              key={order.id}
              className={`hover:shadow-lg transition-shadow ${
                order.status === "pending" ? "border-l-4 border-l-warning" : ""
              }`}
            >
              <div className="flex flex-col lg:flex-row lg:صنف-center justify-between gap-4">
                {/* Order Info */}
                <div className="flex-1 space-y-3">
                  {/* Header */}
                  <div className="flex صنف-start justify-between">
                    <div className="flex صنف-center space-x-3">
                      {getStatusIcon(order.status)}
                      <div>
                        <h3 className="text-lg font-bold text-text">
                          طلب #{order.order_number}
                        </h3>
                        <p className="text-sm text-text-secondary">
                          {formatDateTime(order.created_at)}
                        </p>
                        {order.scheduled_date && (
                          <div className="flex items-center gap-1.5 mt-1 text-xs font-bold text-orange-600 bg-orange-50 px-2 py-1 rounded-md w-fit">
                            <Clock className="w-3.5 h-3.5" />
                            <span>مجدول: {order.scheduled_date} {order.scheduled_time}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    {getStatusBadge(order.status)}
                  </div>

                  {/* Details */}
                  <div className="grid sm:grid-cols-2 gap-2 text-sm">
                    <div className="flex صنف-center space-x-2 text-text-secondary">
                      <Package className="w-4 h-4" />
                      <span>
                        {order.order_type === 'qr' ? 'داخل المطعم' : order.order_type === 'counter' ? 'تيك أواي' : 'توصيل'} •{" "}
                        {order.table_number && `طاولة ${order.table_number}`}
                        {!order.table_number && "استلام خارجي"}
                      </span>
                    </div>
                    {order.customer_phone && (
                      <div className="flex صنف-center space-x-2 text-text-secondary">
                        <Phone className="w-4 h-4" />
                        <a
                          href={`tel:${order.customer_phone}`}
                          className="text-accent hover:underline"
                        >
                          {order.customer_phone}
                        </a>
                      </div>
                    )}
                    {order.customer_name && (
                      <div className="flex صنف-center space-x-2 text-text-secondary">
                        <User className="w-4 h-4" />
                        <span>{order.customer_name}</span>
                      </div>
                    )}
                    <div className="flex صنف-center space-x-2 text-text-secondary">
                      <span className="font-semibold text-text">
                        {order.items?.length || 0} صنف
                      </span>
                      <span>•</span>
                      <span className="font-bold text-text text-lg">
                        {formatCurrency(order.total)}
                      </span>
                    </div>
                  </div>

                  {/* Customer Notes */}
                  {order.customer_notes && (
                    <div className="flex items-start gap-2 text-sm bg-bg-subtle rounded-lg p-3">
                      <MessageSquare className="w-4 h-4 text-accent mt-0.5" />
                      <div>
                        <p className="font-medium text-text">ملاحظات العميل:</p>
                        <p className="text-text-secondary">
                          {order.customer_notes}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex lg:flex-col gap-2 lg:min-w-[160px]">
                  <Button
                    variant="outline"
                    size="sm"
                    fullWidth
                    onClick={() => handleViewDetails(order)}
                  >
                    عرض التفاصيل
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    fullWidth
                    onClick={() => handlePrintOrder(order)}
                  >
                    <Printer className="w-4 h-4 mr-1" />
                    فاتورة العميل
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    fullWidth
                    onClick={() => handlePrintKitchenOrder(order)}
                  >
                    <ChefHat className="w-4 h-4 mr-1" />
                    فاتورة المطبخ
                  </Button>

                  {(order.status === "pending" || order.status === "accepted") && (
                    <Button
                      variant="outline"
                      size="sm"
                      fullWidth
                      onClick={() => handleEditOrder(order)}
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      تعديل الطلب
                    </Button>
                  )}

                  {restaurantWhatsapp && (
                    <Button
                      variant="outline"
                      size="sm"
                      fullWidth
                      onClick={() => sendOrderViaWhatsApp(order, restaurantName, restaurantWhatsapp)}
                    >
                      <MessageCircle className="w-4 h-4 mr-1" />
                      واتساب
                    </Button>
                  )}

                  {/* Pending -> Accepted */}
                  {order.status === "pending" && (
                    <>
                      <Button
                        variant="secondary"
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700"
                        fullWidth
                        onClick={() => handleStatusUpdate(order.id, "accepted")}
                      >
                        قبول الطلب
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        fullWidth
                        className="text-error border-error"
                        onClick={() => {
                          setSelectedOrder(order);
                          setShowRejectModal(true);
                        }}
                      >
                        رفض
                      </Button>
                    </>
                  )}

                  {/* Accepted -> Preparing */}
                  {order.status === "accepted" && (
                    <Button
                      variant="secondary"
                      size="sm"
                      className="bg-orange-500 hover:bg-orange-600"
                      fullWidth
                      onClick={() => handleStatusUpdate(order.id, "preparing")}
                    >
                      بدء التحضير
                    </Button>
                  )}

                  {/* Preparing -> Ready */}
                  {order.status === "preparing" && (
                    <Button
                      variant="secondary"
                      size="sm"
                      className="bg-green-500 hover:bg-green-600"
                      fullWidth
                      onClick={() => handleStatusUpdate(order.id, "ready")}
                    >
                      جاهز للتسليم
                    </Button>
                  )}

                  {/* Ready -> Completed */}
                  {order.status === "ready" && (
                    <Button
                      variant="secondary"
                      size="sm"
                      className="bg-success hover:bg-success/90"
                      fullWidth
                      onClick={() => handleStatusUpdate(order.id, "completed")}
                    >
                      تم التسليم (إكمال)
                    </Button>
                  )}

                  {/* Cancellation option for any non-terminal state */}
                  {["accepted", "preparing", "ready"].includes(order.status) && (
                    <Button
                      variant="outline"
                      size="sm"
                      fullWidth
                      className="text-gray-400 border-gray-200"
                      onClick={() => {
                        setSelectedOrder(order);
                        setShowRejectModal(true);
                      }}
                    >
                      إلغاء الطلب
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* تفاصيل الطلب Modal */}
      <OrderDetailsModal
        isOpen={showDetailsModal}
        order={selectedOrder}
        onClose={() => {
          setShowDetailsModal(false);
          setSelectedOrder(null);
        }}
        onPrint={handlePrintOrder}
        onWhatsApp={() => sendOrderViaWhatsApp(selectedOrder, restaurantName, restaurantWhatsapp)}
        restaurantName={restaurantName}
        restaurantWhatsapp={restaurantWhatsapp}
      />

      {/* Edit Order Modal */}
      <EditOrderModal
        isOpen={showEditModal}
        order={selectedOrder}
        onClose={() => {
          setShowEditModal(false);
          setSelectedOrder(null);
        }}
        onSave={(updatedOrder) => {
          // هنا يمكن إضافة منطق حفظ التعديلات
          console.log("Updated order:", updatedOrder);
          setShowEditModal(false);
          setSelectedOrder(null);
        }}
      />
    </div>
  );
};

// تفاصيل الطلب Modal Component
interface OrderDetailsModalProps {
  isOpen: boolean;
  order: Order | null;
  onClose: () => void;
  onPrint: (order: Order) => void;
  onWhatsApp: () => void;
  restaurantName: string;
  restaurantWhatsapp?: string;
}

const OrderDetailsModal: React.FC<OrderDetailsModalProps> = ({
  isOpen,
  order,
  onClose,
  onPrint,
  onWhatsApp,
  restaurantName,
  restaurantWhatsapp,
}) => {
  if (!order) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`طلب #${order.order_number}`}
      size="lg"
    >
      <div className="space-y-6">
        {/* Status */}
        <div className="flex items-center justify-between p-4 bg-bg-subtle rounded-lg">
          <span className="font-medium text-text">الحالة</span>
          <Badge
            variant={
              order.status === "completed"
                ? "success"
                : order.status === "pending"
                ? "warning"
                : "neutral"
            }
          >
            {order.status}
          </Badge>
        </div>

        {/* Customer Info */}
        <div>
          <h4 className="font-semibold text-text mb-3">بيانات العميل</h4>
          <div className="space-y-2 text-sm">
            {order.customer_name && (
              <p className="text-text-secondary">
                <strong className="text-text">الاسم:</strong>{" "}
                {order.customer_name}
              </p>
            )}
            {order.customer_phone && (
              <p className="text-text-secondary">
                <strong className="text-text">الهاتف:</strong>{" "}
                {order.customer_phone}
              </p>
            )}
            <p className="text-text-secondary">
              <strong className="text-text">نوع الطلب:</strong>{" "}
              {order.order_type}
            </p>
            {order.table_number && (
              <p className="text-text-secondary">
                <strong className="text-text">الطاولة:</strong>{" "}
                {order.table_number}
              </p>
            )}
          </div>
        </div>

        {/* Order Items */}
        <div>
          <h4 className="font-semibold text-text mb-3">أصناف الطلب</h4>
          <div className="space-y-3">
            {order.items?.map((item: any, index: number) => (
              <div
                key={index}
                className="flex items-start justify-between p-3 bg-bg-subtle rounded-lg"
              >
                <div className="flex-1">
                  <p className="font-medium text-text">
                    {item.quantity}× {item.name}
                  </p>
                  {item.selected_size && (
                    <p className="text-sm text-text-secondary">
                      الحجم: {item.selected_size.name}
                    </p>
                  )}
                  {item.selected_addons && item.selected_addons.length > 0 && (
                    <p className="text-sm text-text-secondary">
                      إضافات: {item.selected_addons.map((a: any) => a.name).join(", ")}
                    </p>
                  )}
                </div>
                <p className="font-semibold text-text">
                  {formatCurrency(item.item_total || item.subtotal || 0)}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Pricing */}
        <div className="border-t border-border pt-4 space-y-2">
          <div className="flex justify-between text-text-secondary">
            <span>المجموع</span>
            <span>{formatCurrency(order.subtotal)}</span>
          </div>
          <div className="flex justify-between text-text-secondary">
            <span>الضريبة</span>
            <span>{formatCurrency(order.tax)}</span>
          </div>
          {order.discount && order.discount > 0 && (
            <div className="flex justify-between text-success">
              <span>الخصم</span>
              <span>-{formatCurrency(order.discount)}</span>
            </div>
          )}
          <div className="flex justify-between text-lg font-bold text-text pt-2 border-t border-border">
            <span>الإجمالي</span>
            <span>{formatCurrency(order.total)}</span>
          </div>
        </div>

        {/* Notes */}
        {order.customer_notes && (
          <div className="bg-accent/5 border border-accent/20 rounded-lg p-4">
            <h4 className="font-semibold text-text mb-2">ملاحظات العميل</h4>
            <p className="text-text-secondary text-sm">
              {order.customer_notes}
            </p>
          </div>
        )}

        {/* Payment Info */}
        {order.payment_method && (
          <div>
            <h4 className="font-semibold text-text mb-2">الدفع</h4>
            <p className="text-text-secondary text-sm">
              الطريقة: {order.payment_method === 'cash' ? 'نقداً' : 'إنستا باي'}
            </p>
            {order.payment_transaction_id && (
              <p className="text-text-secondary text-sm">
                رقم المعاملة: {order.payment_transaction_id}
              </p>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4 border-t border-border">
          <Button
            variant="outline"
            onClick={() => onPrint(order)}
            className="flex-1"
          >
            <Printer className="w-4 h-4 mr-2" />
            طباعة الطلب
          </Button>
          {restaurantWhatsapp && (
            <Button
              variant="secondary"
              onClick={onWhatsApp}
              className="flex-1"
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              إرسال عبر واتساب
            </Button>
          )}
          <Button onClick={onClose} className="flex-1">
            إغلاق
          </Button>
        </div>
      </div>
    </Modal>
  );
};

// إلغاء الطلب Modal Component
interface RejectOrderModalProps {
  isOpen: boolean;
  order: Order | null;
  onClose: () => void;
  onReject: (orderId: string, status: string, notes?: string) => void;
}

const RejectOrderModal: React.FC<RejectOrderModalProps> = ({
  isOpen,
  order,
  onClose,
  onReject,
}) => {
  const [reason, setReason] = useState("");

  const handleCancel = () => {
    if (!order) return;
    onReject(order.id, "cancelled", reason);
    onClose();
    setReason("");
  };

  if (!order) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="إلغاء الطلب" size="md">
      <div className="space-y-4">
        <Alert
          type="warning"
          message="هل أنت متأكد من إلغاء هذا الطلب؟ لا يمكن التراجع عن هذا الإجراء."
        />

        <Textarea
          label="سبب الإلغاء (اختياري)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="مثلاً: نفذ المخزون، المطبخ مغلق، إلخ..."
          rows={3}
        />

        <div className="flex gap-3">
          <Button variant="outline" onClick={onClose} fullWidth>
            رجوع
          </Button>
          <Button variant="danger" onClick={handleCancel} fullWidth>
            إلغاء الطلب
          </Button>
        </div>
      </div>
    </Modal>
  );
};

// تعديل الطلب Modal Component
interface EditOrderModalProps {
  isOpen: boolean;
  order: Order | null;
  onClose: () => void;
  onSave: (updatedOrder: Order) => void;
}

const EditOrderModal: React.FC<EditOrderModalProps> = ({
  isOpen,
  order,
  onClose,
  onSave,
}) => {
  const [editedOrder, setEditedOrder] = useState<Order | null>(null);
  const [customerNotes, setCustomerNotes] = useState("");

  useEffect(() => {
    if (order) {
      setEditedOrder({ ...order });
      setCustomerNotes(order.customer_notes || "");
    }
  }, [order]);

  const handleSave = async () => {
    if (!editedOrder) return;

    const success = await updateOrderItems(
      editedOrder.id,
      editedOrder.items || [],
      customerNotes
    );

    if (success) {
      onSave(editedOrder);
      alert("تم حفظ التعديلات بنجاح!");
    } else {
      alert("فشل في حفظ التعديلات");
    }
  };

  const updateItemQuantity = (itemIndex: number, newQuantity: number) => {
    if (!editedOrder || !editedOrder.items) return;

    const updatedItems = [...editedOrder.items];
    if (newQuantity <= 0) {
      updatedItems.splice(itemIndex, 1);
    } else {
      updatedItems[itemIndex] = { ...updatedItems[itemIndex], quantity: newQuantity };
    }

    // إعادة حساب المجاميع
    const newSubtotal = updatedItems.reduce((sum, item: any) => sum + (item.item_total * item.quantity), 0);
    const newTotal = newSubtotal + (editedOrder.tax || 0);

    setEditedOrder({
      ...editedOrder,
      items: updatedItems,
      subtotal: newSubtotal,
      total: newTotal,
    });
  };

  if (!order || !editedOrder) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`تعديل طلب #${order.order_number}`}
      size="lg"
    >
      <div className="space-y-6">
        {/* Order Info */}
        <div className="grid grid-cols-2 gap-4 p-4 bg-bg-subtle rounded-lg">
          <div>
            <span className="font-medium text-text">العميل:</span>
            <p className="text-text-secondary">{order.customer_name}</p>
          </div>
          <div>
            <span className="font-medium text-text">الهاتف:</span>
            <p className="text-text-secondary">{order.customer_phone}</p>
          </div>
        </div>

        {/* Items */}
        <div>
          <h3 className="text-lg font-semibold text-text mb-4">الأصناف</h3>
          <div className="space-y-3">
            {editedOrder.items?.map((item: any, index: number) => (
              <div key={index} className="flex items-center justify-between p-3 border border-border rounded-lg">
                <div className="flex-1">
                  <h4 className="font-medium text-text">{item.name}</h4>
                  {item.selected_size && (
                    <p className="text-sm text-text-secondary">الحجم: {item.selected_size.name}</p>
                  )}
                  {item.selected_addons?.length > 0 && (
                    <p className="text-sm text-text-secondary">
                      إضافات: {item.selected_addons.map((a: any) => a.name).join(", ")}
                    </p>
                  )}
                  <p className="text-sm text-accent font-medium">
                    {formatCurrency(item.item_total)} × {item.quantity} = {formatCurrency(item.item_total * item.quantity)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => updateItemQuantity(index, item.quantity - 1)}
                    className="w-8 h-8 rounded-full bg-red-100 text-red-600 hover:bg-red-200 flex items-center justify-center"
                  >
                    -
                  </button>
                  <span className="w-8 text-center font-bold">{item.quantity}</span>
                  <button
                    onClick={() => updateItemQuantity(index, item.quantity + 1)}
                    className="w-8 h-8 rounded-full bg-green-100 text-green-600 hover:bg-green-200 flex items-center justify-center"
                  >
                    +
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Customer Notes */}
        <div>
          <label className="block text-sm font-medium text-text mb-2">
            ملاحظات العميل
          </label>
          <Textarea
            value={customerNotes}
            onChange={(e) => setCustomerNotes(e.target.value)}
            placeholder="أضف أو عدل الملاحظات..."
            rows={3}
          />
        </div>

        {/* Totals */}
        <div className="border-t pt-4">
          <div className="flex justify-between text-lg font-bold text-text">
            <span>المجموع الجديد:</span>
            <span>{formatCurrency(editedOrder.total)}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4 border-t border-border">
          <Button variant="outline" onClick={onClose} className="flex-1">
            إلغاء
          </Button>
          <Button onClick={handleSave} className="flex-1">
            حفظ التعديلات
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default Orders;

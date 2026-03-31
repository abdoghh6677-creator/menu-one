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
        .select("whatsapp_number")
        .eq("id", user.restaurant_id)
        .single();

      if (!error && data) {
        setRestaurantWhatsapp(data.whatsapp_number || "");
      }
    };

    fetchRestaurant();

    const subscription = subscribeToOrders(user.restaurant_id, (data) => {
      // كشف الطلبات الجديدة
      const newPendingOrders = data.filter(
        (order) => order.status === "pending" && !prevOrderIdsRef.current.has(order.id)
      );

      if (newPendingOrders.length > 0 && prevOrderIdsRef.current.size > 0) {
        // صوت الإشعار
        playNotificationBeep();
        // Push notification لكل طلب جديد
        newPendingOrders.forEach((order) => {
          notifyNewOrder(order.order_number, order.order_type);
        });
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
    const printWindow = window.open("", "_blank", "width=400,height=600");
    if (!printWindow) return;
    const html = `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <title>طلب #${order.order_number}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Courier New', monospace; font-size: 13px; padding: 10px; max-width: 300px; }
    .center { text-align: center; }
    .bold { font-weight: bold; }
    .big { font-size: 18px; }
    .line { border-top: 1px dashed #000; margin: 8px 0; }
    .row { display: flex; justify-content: space-between; margin: 3px 0; }
    .title { font-size: 16px; font-weight: bold; margin: 5px 0; }
    @media print { body { margin: 0; } }
  </style>
</head>
<body>
  <div class="center">
    <div class="big bold">🍽️ طلب جديد</div>
    <div class="title">#${order.order_number}</div>
    <div>${new Date(order.created_at).toLocaleString('ar-EG', {
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
  ${order.table_number ? `<div class="row"><span class="bold">الطاولة:</span><span>${order.table_number}</span></div>` : ""}
  ${order.customer_name ? `<div class="row"><span class="bold">العميل:</span><span>${order.customer_name}</span></div>` : ""}
  ${order.customer_phone ? `<div class="row"><span class="bold">الهاتف:</span><span>${order.customer_phone}</span></div>` : ""}
  <div class="row"><span class="bold">الحالة:</span><span>${statusLabels[order.status] || order.status}</span></div>
  <div class="line"></div>
  <div class="bold" style="margin-bottom:5px">الأصناف:</div>
  ${(order.items as any[])?.map((item: any) => `
    <div class="row">
      <span>${item.quantity}× ${item.name}${item.selected_size ? ` (${item.selected_size.name})` : ""}</span>
      <span>${item.item_total * item.quantity} ج.م</span>
    </div>
    ${item.selected_addons?.length ? `<div style="font-size:11px;color:#555;padding-right:10px">${item.selected_addons.map((a: any) => a.name).join("، ")}</div>` : ""}
  `).join("") || ""}
  <div class="line"></div>
  <div class="row"><span>المجموع:</span><span>${order.subtotal} ج.م</span></div>
  <div class="row"><span>الضريبة:</span><span>${order.tax?.toFixed(2)} ج.م</span></div>
  <div class="row bold big"><span>الإجمالي:</span><span>${order.total} ج.م</span></div>
  ${order.customer_notes ? `<div class="line"></div><div class="bold">ملاحظات:</div><div>${order.customer_notes}</div>` : ""}
  <div class="line"></div>
  <div class="center" style="font-size:11px">شكراً لزيارتكم</div>
  <script>window.onload = () => { window.print(); setTimeout(() => window.close(), 500); }<\/script>
</body>
</html>`;
    printWindow.document.write(html);
    printWindow.document.close();
  };

  const handlePrintKitchenOrder = (order: Order) => {
    const orderTypeLabels: Record<string, string> = { qr: "داخل المطعم", counter: "استلام من الفرع", phone: "توصيل", table: "طاولة" };
    const statusLabels: Record<string, string> = { pending: "معلق", accepted: "مقبول", preparing: "قيد التحضير", ready: "جاهز", completed: "مكتمل", cancelled: "ملغي", rejected: "مرفوض" };
    const printWindow = window.open("", "_blank", "width=400,height=600");
    if (!printWindow) return;
    const html = `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <title>فاتورة المطبخ - طلب #${order.order_number}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Courier New', monospace; font-size: 14px; padding: 10px; max-width: 350px; background: #f8f9fa; }
    .header { background: #dc3545; color: white; padding: 15px; text-align: center; border-radius: 8px; margin-bottom: 10px; }
    .header-title { font-size: 20px; font-weight: bold; }
    .header-subtitle { font-size: 12px; opacity: 0.9; }
    .order-info { background: white; padding: 10px; border-radius: 8px; margin-bottom: 10px; border: 2px solid #007bff; }
    .item { background: white; padding: 8px; margin: 5px 0; border-radius: 5px; border-left: 4px solid #28a745; }
    .item-header { font-weight: bold; font-size: 16px; margin-bottom: 5px; }
    .item-details { font-size: 12px; color: #666; }
    .addons { background: #fff3cd; padding: 5px; margin-top: 5px; border-radius: 3px; font-size: 11px; }
    .urgent { background: #ffeaa7; border: 2px solid #d63031; animation: blink 1s infinite; }
    .line { border-top: 1px solid #dee2e6; margin: 10px 0; }
    .footer { text-align: center; font-size: 12px; color: #666; margin-top: 10px; }
    @keyframes blink { 0%, 50% { opacity: 1; } 51%, 100% { opacity: 0.5; } }
    @media print { body { margin: 0; background: white; } .urgent { background: #ffeaa7 !important; } }
  </style>
</head>
<body>
  <div class="header ${order.status === 'pending' ? 'urgent' : ''}">
    <div class="header-title">🍳 فاتورة المطبخ</div>
    <div class="header-subtitle">طلب #${order.order_number}</div>
  </div>

  <div class="order-info">
    <div><strong>الوقت:</strong> ${new Date(order.created_at).toLocaleString('ar-EG', {
      timeZone: 'Africa/Cairo',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })}</div>
    <div><strong>النوع:</strong> ${orderTypeLabels[order.order_type] || order.order_type}</div>
    ${order.table_number ? `<div><strong>الطاولة:</strong> ${order.table_number}</div>` : ""}
    <div><strong>الحالة:</strong> ${statusLabels[order.status] || order.status}</div>
    ${order.customer_name ? `<div><strong>العميل:</strong> ${order.customer_name}</div>` : ""}
  </div>

  <div style="margin-bottom: 10px;">
    ${(order.items as any[])?.map((item: any, index: number) => `
      <div class="item ${order.status === 'pending' ? 'urgent' : ''}">
        <div class="item-header">${index + 1}. ${item.name}</div>
        <div class="item-details">
          الكمية: ${item.quantity} | ${item.selected_size ? `الحجم: ${item.selected_size.name}` : ""}
        </div>
        ${item.selected_addons?.length ? `<div class="addons">إضافات: ${item.selected_addons.map((a: any) => a.name).join("، ")}</div>` : ""}
      </div>
    `).join("") || ""}
  </div>

  ${order.customer_notes ? `
    <div class="line"></div>
    <div style="background: #f8d7da; color: #721c24; padding: 8px; border-radius: 5px; border: 1px solid #f5c6cb;">
      <strong>ملاحظات خاصة:</strong><br>
      ${order.customer_notes}
    </div>
  ` : ""}

  <div class="footer">
    <div>تم إنشاء الفاتورة في ${new Date().toLocaleString('ar-EG', {
      timeZone: 'Africa/Cairo',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })}</div>
    <div style="margin-top: 5px; font-weight: bold;">مطبخ ${restaurantName}</div>
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
    if (newStatus === "accepted") {
      playSuccessBeep();
    } else if (newStatus === "completed") {
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
      completed: "success",
      cancelled: "neutral",
      rejected: "error",
    };
    const statusLabels: Record<string, string> = { pending: "معلق", accepted: "مقبول", preparing: "قيد التحضير", ready: "جاهز", completed: "مكتمل", cancelled: "ملغي", rejected: "مرفوض" };
    return <Badge variant={variants[status] || "neutral"}>{statusLabels[status] || status}</Badge>;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="w-5 h-5 text-warning" />;
      case "accepted":
        return <Package className="w-5 h-5 text-accent-secondary" />;
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
              {pendingCount} Pending
            </Badge>
          )}
        </div>
      </div>

      {/* Real-time indicator */}
      <div className="flex صنف-center space-x-2 text-sm text-success">
        <div className="w-2 h-2 bg-success rounded-full animate-pulse" />
        <span>Live order updates • Sound notifications enabled</span>
      </div>

      {/* Status Filter */}
      <div className="flex flex-wrap gap-2">
        {["pending", "accepted", "completed", "cancelled"].map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              statusFilter === status
                ? "bg-accent text-white"
                : "bg-bg-subtle text-text-secondary hover:bg-border"
            }`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
            {status === "pending" && ` (${pendingCount})`}
          </button>
        ))}
      </div>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <Card className="text-center py-12">
          <Package className="w-16 h-16 text-text-secondary mx-auto mb-4 opacity-50" />
          <h3 className="text-xl font-semibold text-text mb-2">
            لا توجد طلبات Found
          </h3>
          <p className="text-text-secondary">
            No {statusFilter} orders at the moment.
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
                      </div>
                    </div>
                    {getStatusBadge(order.status)}
                  </div>

                  {/* Details */}
                  <div className="grid sm:grid-cols-2 gap-2 text-sm">
                    <div className="flex صنف-center space-x-2 text-text-secondary">
                      <Package className="w-4 h-4" />
                      <span>
                        {order.order_type} •{" "}
                        {order.table_number && `Table ${order.table_number}`}
                        {!order.table_number && "Takeaway"}
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
                    <div className="flex صنف-start space-x-2 text-sm bg-bg-subtle rounded-lg p-3">
                      <MessageSquare className="w-4 h-4 text-accent-secondary mt-0.5" />
                      <div>
                        <p className="font-medium text-text">Customer Notes:</p>
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

                  {order.status === "pending" && (
                    <>
                      <Button
                        variant="secondary"
                        size="sm"
                        fullWidth
                        onClick={() => handleStatusUpdate(order.id, "accepted")}
                      >
                        Accept
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        fullWidth
                        onClick={() => {
                          setSelectedOrder(order);
                          setShowRejectModal(true);
                        }}
                      >
                        إلغاء
                      </Button>
                    </>
                  )}

                  {order.status === "accepted" && (
                    <>
                      <Button
                        variant="secondary"
                        size="sm"
                        fullWidth
                        onClick={() =>
                          handleStatusUpdate(order.id, "completed")
                        }
                      >
                        Mark Complete
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        fullWidth
                        onClick={() => {
                          setSelectedOrder(order);
                          setShowRejectModal(true);
                        }}
                      >
                        إلغاء
                      </Button>
                    </>
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
        <div className="flex صنف-center justify-between p-4 bg-bg-subtle rounded-lg">
          <span className="font-medium text-text">Status</span>
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
          <h4 className="font-semibold text-text mb-3">Customer Information</h4>
          <div className="space-y-2 text-sm">
            {order.customer_name && (
              <p className="text-text-secondary">
                <strong className="text-text">Name:</strong>{" "}
                {order.customer_name}
              </p>
            )}
            {order.customer_phone && (
              <p className="text-text-secondary">
                <strong className="text-text">Phone:</strong>{" "}
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
          <h4 className="font-semibold text-text mb-3">Order Items</h4>
          <div className="space-y-3">
            {order.items?.map((item: any, index: number) => (
              <div
                key={index}
                className="flex صنف-start justify-between p-3 bg-bg-subtle rounded-lg"
              >
                <div className="flex-1">
                  <p className="font-medium text-text">
                    {item.quantity}x {item.name}
                  </p>
                  {item.size && (
                    <p className="text-sm text-text-secondary">
                      Size: {item.size}
                    </p>
                  )}
                  {item.addons && item.addons.length > 0 && (
                    <p className="text-sm text-text-secondary">
                      Add-ons: {item.addons.join(", ")}
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
            <span>Tax</span>
            <span>{formatCurrency(order.tax)}</span>
          </div>
          {order.discount && order.discount > 0 && (
            <div className="flex justify-between text-success">
              <span>Discount</span>
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
          <div className="bg-accent-secondary/10 border border-accent-secondary/20 rounded-lg p-4">
            <h4 className="font-semibold text-text mb-2">Customer Notes</h4>
            <p className="text-text-secondary text-sm">
              {order.customer_notes}
            </p>
          </div>
        )}

        {/* Payment Info */}
        {order.payment_method && (
          <div>
            <h4 className="font-semibold text-text mb-2">Payment</h4>
            <p className="text-text-secondary text-sm">
              Method: {order.payment_method}
            </p>
            {order.payment_transaction_id && (
              <p className="text-text-secondary text-sm">
                Transaction ID: {order.payment_transaction_id}
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
          message="Are you sure you want to cancel this order? This action cannot be undone."
        />

        <Textarea
          label="Reason for Cancellation (Optional)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="E.g., Out of stock, Kitchen closed, Customer requested, etc."
          rows={3}
        />

        <div className="flex gap-3">
          <Button variant="outline" onClick={onClose} fullWidth>
            Back
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

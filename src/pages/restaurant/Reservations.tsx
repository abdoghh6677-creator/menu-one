import React, { useEffect, useState } from "react";
import { CheckCircle, XCircle, Clock, Users, Calendar, Phone, User, MessageSquare } from "lucide-react";
import { Card, Button, Badge, Loading, Alert, Modal, Input, Textarea } from "../../components/ui";
import { subscribeToReservations, updateReservationStatus, type Reservation } from "../../services/restaurantService";
import { getSession } from "../../utils/session";
import { playSuccessBeep, playWarningBeep } from "../../utils/notifications";

const Reservations: React.FC = () => {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [selectedRes, setSelectedRes] = useState<Reservation | null>(null);
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionType, setActionType] = useState<"confirm" | "reject">("confirm");
  const [tableNumber, setTableNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    let mounted = true;
    const user = getSession();
    
    if (!user?.restaurant_id) {
      console.error("No restaurant_id found in session");
      if (mounted) setLoading(false);
      return;
    }

    const sub = subscribeToReservations(user.restaurant_id, (data) => {
      if (mounted) {
        setReservations(data);
        setLoading(false);
      }
    });

    // Fallback: force set loading to false after 8 seconds if no data received
    const timer = setTimeout(() => {
      if (mounted && loading) {
        setLoading(false);
      }
    }, 8000);

    return () => {
      mounted = false;
      clearTimeout(timer);
      if (sub) {
        if (typeof sub === 'function') (sub as any)();
        else if ((sub as any).unsubscribe) (sub as any).unsubscribe();
      }
    };
  }, []);

  const handleStatusUpdate = async () => {
    if (!selectedRes) return;
    setUpdating(true);
    
    const newStatus = actionType === "confirm" ? "confirmed" : "rejected";
    const success = await updateReservationStatus(selectedRes.id, newStatus, tableNumber, notes);
    
    setUpdating(false);
    if (success) {
      if (newStatus === "confirmed") playSuccessBeep();
      else playWarningBeep();
      setShowActionModal(false);
      setSelectedRes(null);
      setTableNumber("");
      setNotes("");
    } else {
      alert("فشل تحديث حالة الحجز");
    }
  };

  const filteredReservations = reservations.filter(r => r.status === statusFilter);

  const stats = {
    pending: reservations.filter(r => r.status === "pending").length,
    confirmed: reservations.filter(r => r.status === "confirmed").length,
  };

  if (loading) return <Loading text="جاري تحميل الحجوزات..." />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-text mb-1">إدارة حجز الطاولات</h2>
          <p className="text-text-secondary">متابعة وتأكيد طلبات حجز الطاولات من العملاء</p>
        </div>
      </div>

      {/* Tabs / Filters */}
      <div className="flex flex-wrap gap-2">
        {[
          { id: "pending", label: "بانتظار التأكيد", count: stats.pending, color: "bg-warning" },
          { id: "confirmed", label: "مؤكدة", count: stats.confirmed, color: "bg-success" },
          { id: "rejected", label: "مرفوضة", count: reservations.filter(r => r.status === "rejected").length, color: "bg-error" },
          { id: "cancelled", label: "ملغاة", count: reservations.filter(r => r.status === "cancelled").length, color: "bg-gray-400" },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setStatusFilter(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
              statusFilter === tab.id ? "bg-accent text-white shadow-md scale-105" : "bg-white text-text-secondary border border-border hover:border-accent/50"
            }`}
          >
            <span className="font-bold">{tab.label}</span>
            {tab.count > 0 && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full text-white ${tab.id === statusFilter ? 'bg-white/20' : tab.color}`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {filteredReservations.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-16 h-16 bg-bg-subtle rounded-full flex items-center justify-center mb-4">
            <Calendar className="w-8 h-8 text-text-secondary opacity-30" />
          </div>
          <p className="text-text-secondary">لا توجد حجوزات في هذه القائمة</p>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredReservations.map(res => (
            <Card key={res.id} className="hover:shadow-md transition-shadow border-t-4 border-t-accent/20">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-accent/10 rounded-lg">
                    <Users className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <h3 className="font-bold text-text">{res.customer_name}</h3>
                    <div className="flex items-center gap-1 text-xs text-text-secondary">
                      <Phone className="w-3 h-3" />
                      <span>{res.customer_phone}</span>
                    </div>
                  </div>
                </div>
                <Badge variant={res.status === 'pending' ? 'warning' : res.status === 'confirmed' ? 'success' : 'error'}>
                  {res.status === 'pending' ? "معلق" : res.status === 'confirmed' ? "مؤكد" : "ملغي"}
                </Badge>
              </div>

              <div className="space-y-3 bg-bg-subtle p-3 rounded-lg mb-4">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-text-secondary">
                    <Calendar className="w-4 h-4" />
                    <span>التاريخ:</span>
                  </div>
                  <span className="font-semibold">{res.reservation_date}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-text-secondary">
                    <Clock className="w-4 h-4" />
                    <span>الوقت:</span>
                  </div>
                  <span className="font-semibold">{res.reservation_time}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-text-secondary">
                    <Users className="w-4 h-4" />
                    <span>عدد الأشخاص:</span>
                  </div>
                  <span className="font-bold text-accent">{res.guests_count}</span>
                </div>
                {res.table_number && (
                  <div className="flex items-center justify-between text-sm border-t border-border pt-2 mt-2">
                    <span className="text-text-secondary">رقم الطاولة:</span>
                    <span className="font-bold text-success">{res.table_number}</span>
                  </div>
                )}
              </div>

              {res.notes && (
                <div className="mb-4 text-xs bg-warning/5 p-2 rounded border border-warning/10 italic text-text-secondary">
                  <MessageSquare className="w-3 h-3 inline ml-1" />
                  "{res.notes}"
                </div>
              )}

              {res.status === "pending" && (
                <div className="flex gap-2 mt-auto">
                  <Button
                    size="sm"
                    className="flex-1 bg-success hover:bg-success/90"
                    icon={<CheckCircle className="w-4 h-4" />}
                    onClick={() => {
                      setSelectedRes(res);
                      setActionType("confirm");
                      setShowActionModal(true);
                    }}
                  >
                    تأكيد
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 border-error text-error hover:bg-error/5"
                    icon={<XCircle className="w-4 h-4" />}
                    onClick={() => {
                      setSelectedRes(res);
                      setActionType("reject");
                      setShowActionModal(true);
                    }}
                  >
                    رفض
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Confirmation/Rejection Modal */}
      <Modal
        isOpen={showActionModal}
        onClose={() => setShowActionModal(false)}
        title={actionType === "confirm" ? "تأكيد الحجز" : "رفض الحجز"}
      >
        <div className="space-y-4">
          {actionType === "confirm" ? (
            <>
              <p className="text-text-secondary">سيتم تأكيد الحجز لـ {selectedRes?.customer_name} لعدد {selectedRes?.guests_count} أشخاص.</p>
              <Input
                label="رقم الطاولة (اختياري)"
                placeholder="مثلاً: 5 أو طاولة VIP"
                value={tableNumber}
                onChange={(e) => setTableNumber(e.target.value)}
              />
            </>
          ) : (
            <p className="text-text-secondary">هل أنت متأكد من رفض طلب الحجز هذا؟</p>
          )}
          
          <Textarea
            label="ملاحظات للمطعم (دخلية)"
            placeholder="أي ملاحظات إضافية..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />

          <div className="flex gap-3 pt-4">
            <Button
              fullWidth
              className={actionType === "confirm" ? "bg-success" : "bg-error"}
              onClick={handleStatusUpdate}
              loading={updating}
            >
              {actionType === "confirm" ? "تأكيد الحجز الآن" : "تأكيد الرفض"}
            </Button>
            <Button
              variant="outline"
              fullWidth
              onClick={() => setShowActionModal(false)}
            >
              إلغاء
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Reservations;

import React, { useEffect, useState } from "react";
import { Plus, Trash2, Eye, EyeOff, Tag, Calendar, Clock, Package } from "lucide-react";
import ImageUpload from "../../components/ImageUpload";
import { Card, Button, Input, Modal, Loading, Alert, Badge } from "../../components/ui";
import {
  getRestaurantPromotions,
  createPromotion,
  deletePromotion,
  togglePromotion,
  type Promotion,
} from "../../services/restaurantService";
import { formatDateTime } from "../../utils/helpers";
import { supabase } from "../../config/supabase";
import type { MenuItem } from "../../config/supabase";

const Promotions: React.FC = () => {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedPromo, setSelectedPromo] = useState<Promotion | null>(null);
  const [restaurantId, setRestaurantId] = useState<string>("");
  const [error, setError] = useState<string>("");

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    if (user?.restaurant_id) {
      setRestaurantId(user.restaurant_id);
      loadPromotions(user.restaurant_id);
      loadMenuItems(user.restaurant_id);
    } else {
      setLoading(false);
    }
  }, []);

  const loadMenuItems = async (rid: string) => {
    const { data, error } = await supabase
      .from("menu_items")
      .select("*")
      .eq("restaurant_id", rid)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setMenuItems(data);
    }
  };

  const loadPromotions = async (rid: string) => {
    setLoading(true);
    setError("");
    try {
      const data = await getRestaurantPromotions(rid);
      setPromotions(data);
    } catch (err) {
      setError("فشل تحميل العروض");
      console.error("Error loading promotions:", err);
    }
    setLoading(false);
  };

  const handleToggle = async (promo: Promotion) => {
    try {
      await togglePromotion(promo.id, !promo.is_active);
      if (restaurantId) loadPromotions(restaurantId);
    } catch (err) {
      setError("فشل تحديث حالة العرض");
      console.error("Error toggling promotion:", err);
    }
  };

  const handleDelete = async () => {
    if (!selectedPromo) return;
    try {
      await deletePromotion(selectedPromo.id);
      setShowDeleteModal(false);
      setSelectedPromo(null);
      if (restaurantId) loadPromotions(restaurantId);
    } catch (err) {
      setError("فشل حذف العرض");
      console.error("Error deleting promotion:", err);
    }
  };

  if (loading) return <Loading text="جاري تحميل العروض..." />;

  const activeCount = promotions.filter((p) => p.is_active).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-text mb-2">العروض والإعلانات</h2>
          <p className="text-text-secondary">إدارة العروض التي تظهر للعملاء عند فتح المنيو</p>
        </div>
        <Button icon={<Plus className="w-5 h-5" />} onClick={() => setShowAddModal(true)}>
          إضافة عرض
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <Card>
          <div className="flex items-center gap-3">
            <div className="bg-accent/10 p-2.5 rounded-lg"><Tag className="w-5 h-5 text-accent" /></div>
            <div>
              <p className="text-text-secondary text-sm">إجمالي العروض</p>
              <p className="text-2xl font-bold text-text">{promotions.length}</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="bg-success/10 p-2.5 rounded-lg"><Eye className="w-5 h-5 text-success" /></div>
            <div>
              <p className="text-text-secondary text-sm">نشطة الآن</p>
              <p className="text-2xl font-bold text-text">{activeCount}</p>
            </div>
          </div>
        </Card>
        <Card className="sm:col-span-1 col-span-2">
          <div className="flex items-center gap-3">
            <div className="bg-warning/10 p-2.5 rounded-lg"><Clock className="w-5 h-5 text-warning" /></div>
            <div>
              <p className="text-text-secondary text-sm">مدة العرض</p>
              <p className="text-sm font-bold text-text">تظهر 4 ثواني عند الفتح</p>
            </div>
          </div>
        </Card>
      </div>

      {error && <Alert type="error" message={error} />}

      {/* Promotions List */}
      {promotions.length === 0 ? (
        <Card className="text-center py-16">
          <Tag className="w-16 h-16 text-text-secondary mx-auto mb-4 opacity-30" />
          <h3 className="text-xl font-semibold text-text mb-2">لا توجد عروض</h3>
          <p className="text-text-secondary mb-6">أضف أول عرض لمطعمك ليظهر للعملاء عند فتح المنيو</p>
          <Button icon={<Plus className="w-5 h-5" />} onClick={() => setShowAddModal(true)}>إضافة أول عرض</Button>
        </Card>
      ) : (
        <div className="grid gap-4">
          {promotions.map((promo) => {
            const isExpired = promo.ends_at && new Date(promo.ends_at) < new Date();
            return (
              <Card key={promo.id} className={`transition-all ${!promo.is_active || isExpired ? "opacity-60" : ""}`}>
                <div className="flex flex-col sm:flex-row gap-4">
                  {/* Promo Image */}
                  <div className="relative w-full sm:w-32 h-40 sm:h-32 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100">
                    {promo.image_url ? (
                      <img src={
                        promo.image_url?.startsWith('http') 
                          ? promo.image_url 
                          : `https://res.cloudinary.com/dpjxle26o/image/upload/${promo.image_url}`
                      } alt={promo.title_ar || promo.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-10 h-10 text-gray-300" />
                      </div>
                    )}
                    {isExpired && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <span className="text-white text-xs font-bold bg-red-500 px-2 py-1 rounded">منتهي</span>
                      </div>
                    )}
                  </div>

                  {/* Promo Info */}
                  <div className="flex-1 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="text-lg font-bold text-text">{promo.title_ar || promo.title}</h3>
                        {promo.title_ar && promo.title && (
                          <p className="text-sm text-text-secondary">{promo.title}</p>
                        )}
                      </div>
                      <Badge variant={promo.is_active && !isExpired ? "success" : "neutral"}>
                        {isExpired ? "منتهي" : promo.is_active ? "نشط" : "موقوف"}
                      </Badge>
                    </div>

                    {(promo.description_ar || promo.description) && (
                      <p className="text-text-secondary text-sm">{promo.description_ar || promo.description}</p>
                    )}

                    {promo.discount_percent && promo.discount_percent > 0 && (
                      <div className="text-sm text-text-secondary flex flex-wrap gap-2">
                        <span className="font-semibold">خصم {promo.discount_percent}%</span>
                        {promo.apply_to === "item" && promo.menu_item_id && (
                          <span>
                            على: {menuItems.find((m) => m.id === promo.menu_item_id)?.name_ar || menuItems.find((m) => m.id === promo.menu_item_id)?.name}
                          </span>
                        )}
                        {promo.apply_to === "all" && <span>على جميع الأصناف</span>}
                      </div>
                    )}

                    <div className="flex flex-wrap gap-3 text-xs text-text-secondary">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        يظهر لمدة {promo.display_duration_seconds} ثواني
                      </span>
                      {promo.ends_at && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          ينتهي: {formatDateTime(promo.ends_at)}
                        </span>
                      )}
                      {!promo.ends_at && (
                        <span className="flex items-center gap-1 text-success">
                          <Calendar className="w-3.5 h-3.5" />
                          بدون تاريخ انتهاء
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex sm:flex-col gap-2 sm:min-w-[140px]">
                    <Button
                      size="sm"
                      variant={promo.is_active ? "outline" : "secondary"}
                      icon={promo.is_active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      onClick={() => handleToggle(promo)}
                      fullWidth
                    >
                      {promo.is_active ? "إيقاف" : "تفعيل"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      icon={<Trash2 className="w-4 h-4" />}
                      onClick={() => { setSelectedPromo(promo); setShowDeleteModal(true); }}
                      fullWidth
                    >
                      حذف
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add Modal */}
      <AddPromotionModal
        isOpen={showAddModal}
        restaurantId={restaurantId}
        menuItems={menuItems}
        onClose={() => setShowAddModal(false)}
        onSuccess={() => { setShowAddModal(false); if (restaurantId) loadPromotions(restaurantId); }}
      />

      {/* Delete Modal */}
      <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="حذف العرض" size="sm">
        <div className="space-y-4">
          <Alert type="warning" message={`هل أنت متأكد من حذف عرض "${selectedPromo?.title_ar || selectedPromo?.title}"؟`} />
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setShowDeleteModal(false)} fullWidth>إلغاء</Button>
            <Button variant="danger" onClick={handleDelete} fullWidth>حذف</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

// ===== Add Promotion Modal =====
interface AddPromotionModalProps {
  isOpen: boolean;
  restaurantId: string;
  menuItems: MenuItem[];
  onClose: () => void;
  onSuccess: () => void;
}

const AddPromotionModal: React.FC<AddPromotionModalProps> = ({ isOpen, restaurantId, menuItems, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [formData, setFormData] = useState({
    title_ar: "",
    title: "",
    description_ar: "",
    description: "",
    image_url: "",
    ends_at: "",
    display_duration_seconds: "4",
    is_active: true,
    apply_to: "all",
    menu_item_id: "",
    discount_percent: "0",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!formData.title_ar) { setError("عنوان العرض (عربي) مطلوب"); return; }
    if (!formData.image_url) { setError("يرجى رفع صورة للعرض"); return; }

    const discount = Number(formData.discount_percent);
    if (isNaN(discount) || discount < 0 || discount > 100) {
      setError("الخصم يجب أن يكون بين 0 و 100");
      return;
    }

    if (formData.apply_to === "item" && !formData.menu_item_id) {
      setError("يرجى اختيار الصنف الذي يطبّق عليه العرض");
      return;
    }

    setLoading(true);
    const success = await createPromotion({
      restaurant_id: restaurantId,
      title: formData.title || formData.title_ar,
      title_ar: formData.title_ar,
      description: formData.description || undefined,
      description_ar: formData.description_ar || undefined,
      image_url: formData.image_url,
      ends_at: formData.ends_at ? new Date(formData.ends_at).toISOString() : undefined,
      display_duration_seconds: parseInt(formData.display_duration_seconds) || 4,
      is_active: formData.is_active,
      discount_percent: discount,
      apply_to: formData.apply_to as "all" | "item",
      menu_item_id: formData.apply_to === "item" ? formData.menu_item_id : undefined,
    });
    setLoading(false);

    if (success) {
      onSuccess();
      resetForm();
    } else {
      setError("فشل إضافة العرض، يرجى المحاولة مرة أخرى");
    }
  };

  const resetForm = () => {
    setFormData({
      title_ar: "",
      title: "",
      description_ar: "",
      description: "",
      image_url: "",
      ends_at: "",
      display_duration_seconds: "4",
      is_active: true,
      apply_to: "all",
      menu_item_id: "",
      discount_percent: "0",
    });
    setError("");
  };

  return (
    <Modal isOpen={isOpen} onClose={() => { onClose(); resetForm(); }} title="إضافة عرض جديد" size="lg">
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && <Alert type="error" message={error} />}

        {/* Image Upload */}
        <ImageUpload
          currentUrl={formData.image_url}
          onUpload={(url) => setFormData({ ...formData, image_url: url })}
          onRemove={() => setFormData({ ...formData, image_url: "" })}
          label="صورة العرض *"
        />

        {/* Titles */}
        <div className="grid sm:grid-cols-2 gap-4">
          <Input
            label="عنوان العرض (عربي) *"
            value={formData.title_ar}
            onChange={(e) => setFormData({ ...formData, title_ar: e.target.value })}
            placeholder="مثال: خصم 50% على كل البيتزا"
            required
          />
          <Input
            label="Title (English)"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="e.g., 50% off all pizzas"
          />
        </div>

        {/* Descriptions */}
        <div className="grid sm:grid-cols-2 gap-4">
          <Input
            label="وصف إضافي (عربي)"
            value={formData.description_ar}
            onChange={(e) => setFormData({ ...formData, description_ar: e.target.value })}
            placeholder="تفاصيل العرض..."
          />
          <Input
            label="Description (English)"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Offer details..."
          />
        </div>

        {/* Settings */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label mb-2">تاريخ انتهاء العرض (اختياري)</label>
            <input
              type="datetime-local"
              value={formData.ends_at}
              onChange={(e) => setFormData({ ...formData, ends_at: e.target.value })}
              className="input-field w-full"
            />
          </div>
          <div>
            <label className="label mb-2">مدة العرض (ثواني)</label>
            <input
              type="number"
              min="2"
              max="15"
              value={formData.display_duration_seconds}
              onChange={(e) => setFormData({ ...formData, display_duration_seconds: e.target.value })}
              className="input-field w-full"
            />
          </div>
        </div>

        {/* Discount & Target */}
        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <label className="label mb-2">الخصم (%)</label>
            <input
              type="number"
              min="0"
              max="100"
              value={formData.discount_percent}
              onChange={(e) => setFormData({ ...formData, discount_percent: e.target.value })}
              className="input-field w-full"
              placeholder="مثال: 25"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="label mb-2">تطبيق العرض على</label>
            <div className="flex flex-wrap gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="apply_to"
                  value="all"
                  checked={formData.apply_to === "all"}
                  onChange={() => setFormData({ ...formData, apply_to: "all", menu_item_id: "" })}
                  className="rounded border-border"
                />
                <span>كل الأصناف</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="apply_to"
                  value="item"
                  checked={formData.apply_to === "item"}
                  onChange={() => setFormData({ ...formData, apply_to: "item" })}
                  className="rounded border-border"
                />
                <span>صنف محدد</span>
              </label>
            </div>

            {formData.apply_to === "item" && (
              <select
                value={formData.menu_item_id}
                onChange={(e) => setFormData({ ...formData, menu_item_id: e.target.value })}
                className="input-field w-full mt-2"
              >
                <option value="">اختر صنفاً</option>
                {menuItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name_ar || item.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.is_active}
            onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
            className="rounded border-border"
          />
          <span className="text-text">تفعيل العرض فوراً</span>
        </label>

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="outline" onClick={() => { onClose(); resetForm(); }} fullWidth>إلغاء</Button>
          <Button type="submit" loading={loading} fullWidth>إضافة العرض</Button>
        </div>
      </form>
    </Modal>
  );
};

export default Promotions;

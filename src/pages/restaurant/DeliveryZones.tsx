import React, { useEffect, useState } from "react";
import { Plus, Edit, Trash2, MapPin, AlertCircle } from "lucide-react";
import { Card, Button, Input, Modal, Loading, Alert } from "../../components/ui";
import { subscribeToDeliveryZones, createDeliveryZone, updateDeliveryZone, deleteDeliveryZone } from "../../services/restaurantService";
import type { DeliveryZone } from "../../config/supabase";
import { formatCurrency } from "../../utils/helpers";
import { t } from "../../config/translations";

const DeliveryZones: React.FC = () => {
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedZone, setSelectedZone] = useState<DeliveryZone | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [restaurantId, setRestaurantId] = useState("");

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    if (!user.restaurant_id) return;
    setRestaurantId(user.restaurant_id);
    
    const subscription = subscribeToDeliveryZones(user.restaurant_id, (data) => {
      setZones(data);
      setLoading(false);
    });
    
    return () => {
      if (subscription && typeof subscription.unsubscribe === 'function') {
        subscription.unsubscribe();
      }
    };
  }, []);

  if (loading) return <Loading text={t("common", "loading")} />;

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-text mb-2">{t("deliveryZones", "title")}</h2>
          <p className="text-text-secondary">{t("deliveryZones", "subtitle")}</p>
        </div>
        <Button icon={<Plus className="w-5 h-5" />} onClick={() => setShowAddModal(true)}>
          {t("deliveryZones", "addZone")}
        </Button>
      </div>

      <Alert type="info" message={t("deliveryZones", "feeNote")} />

      {/* Zones List */}
      {zones.length === 0 ? (
        <Card className="text-center py-12">
          <MapPin className="w-16 h-16 text-text-secondary mx-auto mb-4 opacity-50" />
          <h3 className="text-xl font-semibold text-text mb-2">{t("deliveryZones", "noZones")}</h3>
          <p className="text-text-secondary mb-4">{t("deliveryZones", "noZonesDesc")}</p>
          <Button icon={<Plus className="w-5 h-5" />} onClick={() => setShowAddModal(true)}>
            {t("deliveryZones", "addZone")}
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4">
          {zones.map((zone) => (
            <Card key={zone.id} className="hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
                    <MapPin className="w-6 h-6 text-accent" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-text">{zone.name_ar}</h3>
                    <p className="text-sm text-text-secondary">{zone.name_en}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-6">
                  <div className="text-left">
                    <p className="text-xs text-text-secondary mb-1">{t("deliveryZones", "deliveryFee")}</p>
                    <p className="text-xl font-bold text-accent">{formatCurrency(zone.delivery_fee)}</p>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" icon={<Edit className="w-4 h-4" />}
                      onClick={() => { setSelectedZone(zone); setShowEditModal(true); }}>
                      {t("common", "edit")}
                    </Button>
                    <Button size="sm" variant="outline" icon={<Trash2 className="w-4 h-4" />}
                      onClick={() => { setSelectedZone(zone); setShowDeleteModal(true); }}>
                      {t("common", "delete")}
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
          
          {/* Virtual "Other Area" card for preview */}
          <Card className="bg-bg-subtle border-dashed border-2 border-border opacity-70">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gray-200 flex items-center justify-center">
                  <MapPin className="w-6 h-6 text-gray-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-text-secondary">{t("deliveryZones", "otherArea")}</h3>
                  <p className="text-sm text-text-secondary">{t("deliveryZones", "otherAreaDesc")}</p>
                </div>
              </div>
              <div className="text-left py-2 px-4 italic text-sm text-text-secondary">
                {t("deliveryZones", "willBeConfirmed")}
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Modals */}
      <ZoneModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        mode="add"
        restaurantId={restaurantId}
      />
      <ZoneModal
        isOpen={showEditModal}
        zone={selectedZone}
        onClose={() => { setShowEditModal(false); setSelectedZone(null); }}
        mode="edit"
        restaurantId={restaurantId}
      />
      <DeleteZoneModal
        isOpen={showDeleteModal}
        zone={selectedZone}
        onClose={() => { setShowDeleteModal(false); setSelectedZone(null); }}
      />
    </div>
  );
};

interface ZoneModalProps {
  isOpen: boolean;
  zone?: DeliveryZone | null;
  onClose: () => void;
  mode: "add" | "edit";
  restaurantId: string;
}

const ZoneModal: React.FC<ZoneModalProps> = ({ isOpen, zone, onClose, mode, restaurantId }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    name_ar: "",
    name_en: "",
    delivery_fee: "",
  });

  useEffect(() => {
    if (mode === "edit" && zone) {
      setFormData({
        name_ar: zone.name_ar,
        name_en: zone.name_en,
        delivery_fee: zone.delivery_fee.toString(),
      });
    } else {
      setFormData({ name_ar: "", name_en: "", delivery_fee: "" });
    }
  }, [mode, zone, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    if (!formData.name_ar || !formData.name_en || !formData.delivery_fee) {
      setError(t("menu", "nameRequired"));
      return;
    }

    setLoading(true);
    const zoneData = {
      restaurant_id: restaurantId,
      name_ar: formData.name_ar,
      name_en: formData.name_en,
      delivery_fee: parseFloat(formData.delivery_fee),
    };

    let result;
    if (mode === "add") {
      result = await createDeliveryZone(zoneData);
    } else if (zone) {
      result = await updateDeliveryZone(zone.id, zoneData);
    }

    setLoading(false);
    if (result?.success) {
      onClose();
    } else {
      setError(result?.error?.message || t("common", "error"));
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={mode === "add" ? t("deliveryZones", "addZone") : t("deliveryZones", "editZone")} size="md">
      <form onSubmit={handleSubmit} className="space-y-5" dir="rtl">
        {error && <Alert type="error" message={error} />}

        <Input 
          label={t("deliveryZones", "zoneNameAr")} 
          value={formData.name_ar} 
          onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })} 
          placeholder="مثال: المهندسين" 
          required 
        />
        
        <Input 
          label={t("deliveryZones", "zoneNameEn")} 
          value={formData.name_en} 
          onChange={(e) => setFormData({ ...formData, name_en: e.target.value })} 
          placeholder="e.g., Mohandessin" 
          required 
        />

        <Input 
          label={t("deliveryZones", "deliveryFee")} 
          type="number" 
          step="0.01" 
          value={formData.delivery_fee}
          onChange={(e) => setFormData({ ...formData, delivery_fee: e.target.value })} 
          placeholder="0.00" 
          required 
        />

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onClose} fullWidth>{t("common", "cancel")}</Button>
          <Button type="submit" loading={loading} fullWidth>{t("common", "save")}</Button>
        </div>
      </form>
    </Modal>
  );
};

const DeleteZoneModal: React.FC<{ isOpen: boolean; zone: DeliveryZone | null; onClose: () => void }> = ({ isOpen, zone, onClose }) => {
  const [loading, setLoading] = useState(false);
  
  const handleDelete = async () => {
    if (!zone) return;
    setLoading(true);
    await deleteDeliveryZone(zone.id);
    setLoading(false);
    onClose();
  };

  if (!zone) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t("common", "delete")} size="md">
      <div className="space-y-4" dir="rtl">
        <Alert type="warning" message={`${t("deliveryZones", "deleteConfirm")} (${zone.name_ar})`} />
        <div className="flex gap-3">
          <Button variant="outline" onClick={onClose} fullWidth>{t("common", "cancel")}</Button>
          <Button variant="danger" onClick={handleDelete} loading={loading} fullWidth>{t("common", "delete")}</Button>
        </div>
      </div>
    </Modal>
  );
};

export default DeliveryZones;

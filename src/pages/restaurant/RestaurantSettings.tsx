import React, { useState, useEffect } from "react";
import { Download, QrCode as QrCodeIcon, ExternalLink, Truck, UtensilsCrossed, ShoppingBag, Banknote, Smartphone, Link, Building2, Upload, Clock, Shield, Save } from "lucide-react";
import { Card, Button, Loading, Alert, Input, Textarea, Select } from "../../components/ui";
import { QRCodeSVG } from "qrcode.react";
import { supabase } from "../../config/supabase";
import type { Restaurant } from "../../config/supabase";

const DEFAULT_ORDER_TYPES = { dine_in: true, takeaway: true, delivery: false };
const DEFAULT_PAYMENT = { cash_enabled: true, instapay_enabled: false, instapay_link: "", instapay_whatsapp: "" };

const RestaurantSettings: React.FC = () => {
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [orderTypes, setOrderTypes] = useState(DEFAULT_ORDER_TYPES);
  const [payment, setPayment] = useState(DEFAULT_PAYMENT);
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [saving, setSaving] = useState(false);
  const [savingPayment, setSavingPayment] = useState(false);
  const [savingWhatsapp, setSavingWhatsapp] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [savePaymentSuccess, setSavePaymentSuccess] = useState(false);
  const [saveWhatsappSuccess, setSaveWhatsappSuccess] = useState(false);

  // معلومات المطعم
  const [restaurantInfo, setRestaurantInfo] = useState({
    name: "",
    description: "",
    phone: "",
    email: "",
    address: "",
    website: ""
  });

  // الشعار وصور الغلاف
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>("");
  const [coverPreview, setCoverPreview] = useState<string>("");

  // ساعات العمل والإجازات
  const [businessHours, setBusinessHours] = useState({
    monday: { open: "09:00", close: "22:00", closed: false },
    tuesday: { open: "09:00", close: "22:00", closed: false },
    wednesday: { open: "09:00", close: "22:00", closed: false },
    thursday: { open: "09:00", close: "22:00", closed: false },
    friday: { open: "09:00", close: "22:00", closed: false },
    saturday: { open: "09:00", close: "22:00", closed: false },
    sunday: { open: "09:00", close: "22:00", closed: false }
  });

  // كلمة المرور
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });

  // حالات الحفظ
  const [savingInfo, setSavingInfo] = useState(false);
  const [savingImages, setSavingImages] = useState(false);
  const [savingHours, setSavingHours] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  // رسائل النجاح
  const [saveInfoSuccess, setSaveInfoSuccess] = useState(false);
  const [saveImagesSuccess, setSaveImagesSuccess] = useState(false);
  const [saveHoursSuccess, setSaveHoursSuccess] = useState(false);
  const [savePasswordSuccess, setSavePasswordSuccess] = useState(false);

  useEffect(() => {
    const fetchRestaurant = async () => {
      try {
        const userData = localStorage.getItem("user");
        if (!userData) { setError("لم يتم العثور على بيانات المستخدم"); setLoading(false); return; }
        const user = JSON.parse(userData);
        if (!user.restaurant_id) { setError("لم يتم العثور على معرّف المطعم"); setLoading(false); return; }
        const { data, error: fetchError } = await supabase.from("restaurants").select("*").eq("id", user.restaurant_id).single();
        if (fetchError) throw fetchError;
        setRestaurant(data);
        if (data.order_types_enabled) setOrderTypes({ ...DEFAULT_ORDER_TYPES, ...data.order_types_enabled });
        if (data.payment_settings) setPayment({ ...DEFAULT_PAYMENT, ...data.payment_settings });
        if (data.whatsapp_number) setWhatsappNumber(data.whatsapp_number);

        // تحميل معلومات المطعم
        setRestaurantInfo({
          name: data.name || "",
          description: data.description || "",
          phone: data.phone || "",
          email: data.email || "",
          address: data.address || "",
          website: data.website || ""
        });

        // تحميل ساعات العمل
        if (data.business_hours) setBusinessHours({ ...businessHours, ...data.business_hours });

        // تحميل معاينات الصور
        if (data.logo_url) setLogoPreview(data.logo_url);
        if (data.cover_url) setCoverPreview(data.cover_url);
      } catch (err) {
        setError("فشل تحميل بيانات المطعم");
      } finally {
        setLoading(false);
      }
    };
    fetchRestaurant();
  }, []);

  const downloadQRCode = () => {
    if (!restaurant) return;
    const svg = document.getElementById("qr-code-svg");
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width; canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      const pngFile = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.download = `${restaurant.slug}-qr-code.png`;
      a.href = pngFile; a.click();
    };
    img.src = "data:image/svg+xml;base64," + btoa(svgData);
  };

  const saveOrderTypes = async () => {
    if (!restaurant) return;
    setSaving(true); setSaveSuccess(false);
    const { error } = await supabase.from("restaurants").update({ order_types_enabled: orderTypes }).eq("id", restaurant.id);
    setSaving(false);
    if (!error) { setSaveSuccess(true); setTimeout(() => setSaveSuccess(false), 3000); }
    else { console.error("Save order types error:", error); setError("فشل حفظ إعدادات الطلبات: " + (error?.message || "خطأ غير معروف")); }
  };

  const savePaymentSettings = async () => {
    if (!restaurant) return;
    if (payment.instapay_enabled && !payment.instapay_link) {
      setError("يرجى إدخال رابط InstaPay");
      return;
    }
    setSavingPayment(true); setSavePaymentSuccess(false);
    const { error } = await supabase.from("restaurants").update({ payment_settings: payment }).eq("id", restaurant.id);
    setSavingPayment(false);
    if (!error) { setSavePaymentSuccess(true); setTimeout(() => setSavePaymentSuccess(false), 3000); }
    else { console.error("Save payment error:", error); setError("فشل حفظ إعدادات الدفع: " + (error?.message || "خطأ غير معروف")); }
  };

  const saveWhatsappSettings = async () => {
    if (!restaurant) return;
    setSavingWhatsapp(true); setSaveWhatsappSuccess(false);
    const { error } = await supabase.from("restaurants").update({ whatsapp_number: whatsappNumber }).eq("id", restaurant.id);
    setSavingWhatsapp(false);
    if (!error) { setSaveWhatsappSuccess(true); setTimeout(() => setSaveWhatsappSuccess(false), 3000); }
    else { console.error("Save whatsapp error:", error); setError("فشل حفظ رقم واتساب: " + (error?.message || "خطأ غير معروف")); }
  };

  // حفظ معلومات المطعم
  const saveRestaurantInfo = async () => {
    if (!restaurant) return;
    setSavingInfo(true); setSaveInfoSuccess(false);
    const { error } = await supabase.from("restaurants").update({
      name: restaurantInfo.name,
      description: restaurantInfo.description,
      phone: restaurantInfo.phone,
      email: restaurantInfo.email,
      address: restaurantInfo.address,
      website: restaurantInfo.website
    }).eq("id", restaurant.id);
    setSavingInfo(false);
    if (!error) { setSaveInfoSuccess(true); setTimeout(() => setSaveInfoSuccess(false), 3000); }
    else { setError("فشل حفظ معلومات المطعم: " + (error?.message || "خطأ غير معروف")); }
  };

  // رفع الصور
  const uploadImage = async (file: File, type: 'logo' | 'cover') => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${restaurant?.id}_${type}_${Date.now()}.${fileExt}`;
    const { data, error } = await supabase.storage
      .from('restaurant-images')
      .upload(fileName, file);

    if (error) throw error;
    return data.path;
  };

  // حفظ الصور
  const saveImages = async () => {
    if (!restaurant) return;
    setSavingImages(true); setSaveImagesSuccess(false);

    try {
      const updates: any = {};

      if (logoFile) {
        const logoPath = await uploadImage(logoFile, 'logo');
        const { data: logoUrl } = supabase.storage
          .from('restaurant-images')
          .getPublicUrl(logoPath);
        updates.logo_url = logoUrl.publicUrl;
      }

      if (coverFile) {
        const coverPath = await uploadImage(coverFile, 'cover');
        const { data: coverUrl } = supabase.storage
          .from('restaurant-images')
          .getPublicUrl(coverPath);
        updates.cover_url = coverUrl.publicUrl;
      }

      if (Object.keys(updates).length > 0) {
        const { error } = await supabase.from("restaurants").update(updates).eq("id", restaurant.id);
        if (error) throw error;
      }

      setSaveImagesSuccess(true);
      setTimeout(() => setSaveImagesSuccess(false), 3000);
    } catch (err) {
      setError("فشل رفع الصور: " + (err as Error).message);
    } finally {
      setSavingImages(false);
    }
  };

  // حفظ ساعات العمل
  const saveBusinessHours = async () => {
    if (!restaurant) return;
    setSavingHours(true); setSaveHoursSuccess(false);
    const { error } = await supabase.from("restaurants").update({ business_hours: businessHours }).eq("id", restaurant.id);
    setSavingHours(false);
    if (!error) { setSaveHoursSuccess(true); setTimeout(() => setSaveHoursSuccess(false), 3000); }
    else { setError("فشل حفظ ساعات العمل: " + (error?.message || "خطأ غير معروف")); }
  };

  // حفظ كلمة المرور
  const savePassword = async () => {
    if (!restaurant) return;
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError("كلمة المرور الجديدة غير متطابقة");
      return;
    }
    if (passwordData.newPassword.length < 6) {
      setError("كلمة المرور يجب أن تكون 6 أحرف على الأقل");
      return;
    }

    setSavingPassword(true); setSavePasswordSuccess(false);

    // التحقق من كلمة المرور الحالية
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("password")
      .eq("restaurant_id", restaurant.id)
      .single();

    if (userError || userData.password !== passwordData.currentPassword) {
      setError("كلمة المرور الحالية غير صحيحة");
      setSavingPassword(false);
      return;
    }

    // تحديث كلمة المرور
    const { error } = await supabase
      .from("users")
      .update({ password: passwordData.newPassword })
      .eq("restaurant_id", restaurant.id);

    setSavingPassword(false);
    if (!error) {
      setSavePasswordSuccess(true);
      setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setTimeout(() => setSavePasswordSuccess(false), 3000);
    } else {
      setError("فشل تغيير كلمة المرور: " + (error?.message || "خطأ غير معروف"));
    }
  };

  // معالجة رفع الصور
  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onload = () => setLogoPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCoverFile(file);
      const reader = new FileReader();
      reader.onload = () => setCoverPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  if (loading) return <Loading text="جاري تحميل الإعدادات..." />;
  if (error || !restaurant) return <Alert type="error" message={error || "المطعم غير موجود"} />;

  const menuUrl = `${window.location.origin}/menu/${restaurant.slug}`;

  const orderTypeOptions = [
    { key: "dine_in" as const, label: "داخل المطعم (Dine-in)", desc: "العميل يجلس داخل المطعم", icon: UtensilsCrossed },
    { key: "takeaway" as const, label: "استلام من الفرع (Takeaway)", desc: "العميل يستلم الطلب من الفرع", icon: ShoppingBag },
    { key: "delivery" as const, label: "توصيل (Delivery)", desc: "توصيل الطلب لعنوان العميل", icon: Truck },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-text mb-2">الإعدادات</h2>
        <p className="text-text-secondary">إدارة جميع إعدادات مطعمك</p>
      </div>

      {/* ===== معلومات المطعم ===== */}
      <Card>
        <div className="flex items-start gap-2 mb-5">
          <Building2 className="w-6 h-6 text-accent" />
          <div>
            <h3 className="text-xl font-bold text-text">معلومات المطعم والتواصل</h3>
            <p className="text-text-secondary text-sm">تحديث بيانات المطعم ومعلومات التواصل</p>
          </div>
        </div>

        {saveInfoSuccess && <Alert type="success" message="تم حفظ معلومات المطعم بنجاح ✓" className="mb-4" />}

        <div className="grid md:grid-cols-2 gap-4">
          <Input
            label="اسم المطعم"
            value={restaurantInfo.name}
            onChange={(e) => setRestaurantInfo({ ...restaurantInfo, name: e.target.value })}
            required
          />
          <Input
            label="رقم الهاتف"
            type="tel"
            value={restaurantInfo.phone}
            onChange={(e) => setRestaurantInfo({ ...restaurantInfo, phone: e.target.value })}
            placeholder="01XXXXXXXXX"
          />
          <Input
            label="البريد الإلكتروني"
            type="email"
            value={restaurantInfo.email}
            onChange={(e) => setRestaurantInfo({ ...restaurantInfo, email: e.target.value })}
            placeholder="info@restaurant.com"
          />
          <Input
            label="الموقع الإلكتروني"
            value={restaurantInfo.website}
            onChange={(e) => setRestaurantInfo({ ...restaurantInfo, website: e.target.value })}
            placeholder="https://restaurant.com"
          />
          <div className="md:col-span-2">
            <Textarea
              label="وصف المطعم"
              value={restaurantInfo.description}
              onChange={(e) => setRestaurantInfo({ ...restaurantInfo, description: e.target.value })}
              placeholder="وصف مختصر عن مطعمك..."
              rows={3}
            />
          </div>
          <div className="md:col-span-2">
            <Textarea
              label="العنوان"
              value={restaurantInfo.address}
              onChange={(e) => setRestaurantInfo({ ...restaurantInfo, address: e.target.value })}
              placeholder="العنوان التفصيلي للمطعم..."
              rows={2}
            />
          </div>
        </div>

        <Button onClick={saveRestaurantInfo} loading={savingInfo} fullWidth className="mt-5">
          حفظ معلومات المطعم
        </Button>
      </Card>

      {/* ===== الشعار وصور الغلاف ===== */}
      <Card>
        <div className="flex items-start gap-2 mb-5">
          <Upload className="w-6 h-6 text-accent" />
          <div>
            <h3 className="text-xl font-bold text-text">الشعار وصور الغلاف</h3>
            <p className="text-text-secondary text-sm">رفع شعار المطعم وصورة الغلاف</p>
          </div>
        </div>

        {saveImagesSuccess && <Alert type="success" message="تم رفع الصور بنجاح ✓" className="mb-4" />}

        <div className="grid md:grid-cols-2 gap-6">
          {/* الشعار */}
          <div className="space-y-4">
            <div>
              <label className="label mb-2">شعار المطعم</label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                {logoPreview ? (
                  <div className="space-y-3">
                    <img src={logoPreview} alt="Logo" className="w-24 h-24 object-cover rounded-lg mx-auto" />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoChange}
                      className="text-sm"
                    />
                  </div>
                ) : (
                  <div className="space-y-3">
                    <Upload className="w-12 h-12 text-gray-400 mx-auto" />
                    <div>
                      <p className="text-sm text-gray-600">انقر لرفع الشعار</p>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoChange}
                        className="text-sm mt-2"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* صورة الغلاف */}
          <div className="space-y-4">
            <div>
              <label className="label mb-2">صورة الغلاف</label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                {coverPreview ? (
                  <div className="space-y-3">
                    <img src={coverPreview} alt="Cover" className="w-full h-32 object-cover rounded-lg" />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleCoverChange}
                      className="text-sm"
                    />
                  </div>
                ) : (
                  <div className="space-y-3">
                    <Upload className="w-12 h-12 text-gray-400 mx-auto" />
                    <div>
                      <p className="text-sm text-gray-600">انقر لرفع صورة الغلاف</p>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleCoverChange}
                        className="text-sm mt-2"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <Button onClick={saveImages} loading={savingImages} fullWidth className="mt-5">
          حفظ الصور
        </Button>
      </Card>

      {/* ===== ساعات العمل ===== */}
      <Card>
        <div className="flex items-start gap-2 mb-5">
          <Clock className="w-6 h-6 text-accent" />
          <div>
            <h3 className="text-xl font-bold text-text">ساعات العمل والإجازات</h3>
            <p className="text-text-secondary text-sm">تحديد مواعيد العمل وأيام الإجازات</p>
          </div>
        </div>

        {saveHoursSuccess && <Alert type="success" message="تم حفظ ساعات العمل بنجاح ✓" className="mb-4" />}

        <div className="space-y-4">
          {Object.entries(businessHours).map(([day, hours]) => (
            <div key={day} className="flex items-center gap-4 p-4 border rounded-lg">
              <div className="w-24 font-medium text-text">
                {day === 'monday' ? 'الاثنين' :
                 day === 'tuesday' ? 'الثلاثاء' :
                 day === 'wednesday' ? 'الأربعاء' :
                 day === 'thursday' ? 'الخميس' :
                 day === 'friday' ? 'الجمعة' :
                 day === 'saturday' ? 'السبت' : 'الأحد'}
              </div>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={hours.closed}
                  onChange={(e) => setBusinessHours({
                    ...businessHours,
                    [day]: { ...hours, closed: e.target.checked }
                  })}
                />
                <span className="text-sm">مغلق</span>
              </label>

              {!hours.closed && (
                <>
                  <Input
                    type="time"
                    value={hours.open}
                    onChange={(e) => setBusinessHours({
                      ...businessHours,
                      [day]: { ...hours, open: e.target.value }
                    })}
                    className="w-32"
                  />
                  <span className="text-text-secondary">إلى</span>
                  <Input
                    type="time"
                    value={hours.close}
                    onChange={(e) => setBusinessHours({
                      ...businessHours,
                      [day]: { ...hours, close: e.target.value }
                    })}
                    className="w-32"
                  />
                </>
              )}
            </div>
          ))}
        </div>

        <Button onClick={saveBusinessHours} loading={savingHours} fullWidth className="mt-5">
          حفظ ساعات العمل
        </Button>
      </Card>

      {/* ===== كلمة المرور ===== */}
      <Card>
        <div className="flex items-start gap-2 mb-5">
          <Shield className="w-6 h-6 text-accent" />
          <div>
            <h3 className="text-xl font-bold text-text">تغيير كلمة المرور والأمان</h3>
            <p className="text-text-secondary text-sm">تحديث كلمة المرور لحسابك</p>
          </div>
        </div>

        {savePasswordSuccess && <Alert type="success" message="تم تغيير كلمة المرور بنجاح ✓" className="mb-4" />}

        <div className="space-y-4">
          <Input
            label="كلمة المرور الحالية"
            type="password"
            value={passwordData.currentPassword}
            onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
            required
          />
          <Input
            label="كلمة المرور الجديدة"
            type="password"
            value={passwordData.newPassword}
            onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
            required
          />
          <Input
            label="تأكيد كلمة المرور الجديدة"
            type="password"
            value={passwordData.confirmPassword}
            onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
            required
          />
        </div>

        <Button onClick={savePassword} loading={savingPassword} fullWidth className="mt-5">
          تغيير كلمة المرور
        </Button>
      </Card>

      {/* ===== QR Code ===== */}
      <Card>
        <div className="flex items-start gap-2 mb-4">
          <QrCodeIcon className="w-6 h-6 text-accent" />
          <div>
            <h3 className="text-xl font-bold text-text">QR Code المنيو</h3>
            <p className="text-text-secondary text-sm">يمكن للعملاء مسح هذا الرمز للوصول إلى منيوك</p>
          </div>
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="flex flex-col items-center gap-4">
            <div className="bg-white p-6 rounded-lg shadow-md">
              <QRCodeSVG id="qr-code-svg" value={menuUrl} size={200} level="H" includeMargin={true} />
            </div>
            <Button icon={<Download className="w-5 h-5" />} onClick={downloadQRCode} fullWidth>تنزيل QR Code</Button>
          </div>
          <div className="space-y-4">
            <div>
              <label className="label mb-2">اسم المطعم</label>
              <div className="p-3 bg-bg-subtle rounded-lg text-text font-medium">{restaurant.name}</div>
            </div>
            <div>
              <label className="label mb-2">رابط المنيو</label>
              <div className="p-3 bg-bg-subtle rounded-lg break-all text-text-secondary text-sm">{menuUrl}</div>
              <a href={menuUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-accent hover:text-accent-secondary mt-2 text-sm">
                <ExternalLink className="w-4 h-4" /><span>فتح صفحة المنيو</span>
              </a>
            </div>
            <div className="bg-success/10 border border-success/20 rounded-lg p-3">
              <p className="text-success text-sm">✓ تحديثات المنيو تظهر فوراً</p>
              <p className="text-success text-sm">✓ لا يحتاج العملاء لتثبيت أي تطبيق</p>
            </div>
          </div>
        </div>
      </Card>

      {/* ===== Payment Methods ===== */}
      <Card>
        <div className="flex items-start gap-2 mb-5">
          <Banknote className="w-6 h-6 text-accent" />
          <div>
            <h3 className="text-xl font-bold text-text">طرق الدفع</h3>
            <p className="text-text-secondary text-sm">اختر طرق الدفع المتاحة للعملاء</p>
          </div>
        </div>

        {savePaymentSuccess && <Alert type="success" message="تم حفظ إعدادات الدفع بنجاح ✓" className="mb-4" />}

        <div className="space-y-4">
          {/* Cash */}
          <div className={`rounded-xl border-2 transition-colors ${payment.cash_enabled ? "border-green-400 bg-green-50" : "border-gray-200"}`}>
            <label className="flex items-center justify-between p-4 cursor-pointer">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${payment.cash_enabled ? "bg-green-100" : "bg-gray-100"}`}>
                  <Banknote className={`w-5 h-5 ${payment.cash_enabled ? "text-green-600" : "text-gray-400"}`} />
                </div>
                <div>
                  <p className="font-bold text-text">الدفع عند الاستلام (كاش)</p>
                  <p className="text-sm text-text-secondary">العميل يدفع نقداً عند استلام الطلب</p>
                </div>
              </div>
              <div className="relative">
                <input type="checkbox" className="sr-only" checked={payment.cash_enabled}
                  onChange={(e) => setPayment({ ...payment, cash_enabled: e.target.checked })} />
                <div className={`w-12 h-6 rounded-full transition-colors ${payment.cash_enabled ? "bg-green-500" : "bg-gray-300"}`}>
                  <div className={`w-5 h-5 bg-white rounded-full shadow absolute top-0.5 transition-all ${payment.cash_enabled ? "right-0.5" : "left-0.5"}`} />
                </div>
              </div>
            </label>
          </div>

          {/* InstaPay */}
          <div className={`rounded-xl border-2 transition-colors ${payment.instapay_enabled ? "border-purple-400 bg-purple-50" : "border-gray-200"}`}>
            <label className="flex items-center justify-between p-4 cursor-pointer">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl ${payment.instapay_enabled ? "bg-purple-100" : "bg-gray-100"}`}>
                  <img src="/icons/instapay-logo.png" alt="InstaPay" className="w-7 h-7 object-contain" />
                </div>
                <div>
                  <p className="font-bold text-text">InstaPay</p>
                  <p className="text-sm text-text-secondary">الدفع الإلكتروني عبر InstaPay</p>
                </div>
              </div>
              <div className="relative">
                <input type="checkbox" className="sr-only" checked={payment.instapay_enabled}
                  onChange={(e) => setPayment({ ...payment, instapay_enabled: e.target.checked })} />
                <div className={`w-12 h-6 rounded-full transition-colors ${payment.instapay_enabled ? "bg-purple-500" : "bg-gray-300"}`}>
                  <div className={`w-5 h-5 bg-white rounded-full shadow absolute top-0.5 transition-all ${payment.instapay_enabled ? "right-0.5" : "left-0.5"}`} />
                </div>
              </div>
            </label>

            {/* InstaPay Details */}
            {payment.instapay_enabled && (
              <div className="px-4 pb-4 space-y-3 border-t border-purple-200 pt-3">
                <div>
                  <label className="label mb-1 flex items-center gap-1">
                    <Link className="w-4 h-4 text-purple-600" />
                    رابط الدفع InstaPay *
                  </label>
                  <Input
                    value={payment.instapay_link}
                    onChange={(e) => setPayment({ ...payment, instapay_link: e.target.value })}
                    placeholder="https://ipn.eg/S/username/instapay/xxxxx"
                  />
                  <p className="text-xs text-text-secondary mt-1">الرابط اللي يفتحه العميل للدفع</p>
                </div>
                <div>
                  <label className="label mb-1 flex items-center gap-1">
                    <Smartphone className="w-4 h-4 text-purple-600" />
                    رقم واتساب لاستقبال صور التحويل
                  </label>
                  <Input
                    value={payment.instapay_whatsapp}
                    onChange={(e) => setPayment({ ...payment, instapay_whatsapp: e.target.value })}
                    placeholder="01XXXXXXXXX"
                  />
                  <p className="text-xs text-text-secondary mt-1">العميل يبعت screenshot التحويل على هذا الرقم</p>
                </div>

                {/* Preview */}
                {payment.instapay_link && (
                  <div className="bg-white rounded-lg p-3 border border-purple-200">
                    <p className="text-xs text-purple-600 font-semibold mb-2">معاينة ما سيظهر للعميل:</p>
                    <div className="flex items-center gap-2 bg-purple-600 text-white rounded-lg px-4 py-2.5 w-fit">
                      <img src="/icons/instapay-logo.png" alt="InstaPay" className="w-5 h-5 object-contain brightness-0 invert" />
                      <span className="font-bold text-sm">ادفع بـ InstaPay</span>
                    </div>
                    {payment.instapay_whatsapp && (
                      <p className="text-xs text-gray-500 mt-2">📱 واتساب: {payment.instapay_whatsapp}</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <Button onClick={savePaymentSettings} loading={savingPayment} fullWidth className="mt-5">
          حفظ إعدادات الدفع
        </Button>
      </Card>

      {/* ===== WhatsApp Settings ===== */}
      <Card>
        <div className="mb-4">
          <h3 className="text-xl font-bold text-text mb-1">إعدادات واتساب</h3>
          <p className="text-text-secondary text-sm">أضف رقم واتساب لتلقي إشعارات الطلبات الجديدة</p>
        </div>

        {saveWhatsappSuccess && <Alert type="success" message="تم حفظ رقم واتساب بنجاح ✓" className="mb-4" />}

        <div className="space-y-4">
          <Input
            label="رقم واتساب"
            type="tel"
            placeholder="201234567890"
            value={whatsappNumber}
            onChange={(e) => setWhatsappNumber(e.target.value)}
            helperText="أدخل رقم واتساب بدون + أو 00 (مثال: 201234567890)"
          />
        </div>

        <Button onClick={saveWhatsappSettings} loading={savingWhatsapp} fullWidth className="mt-5">
          حفظ رقم واتساب
        </Button>
      </Card>

      {/* ===== Order Types ===== */}
      <Card>
        <div className="mb-4">
          <h3 className="text-xl font-bold text-text mb-1">أنواع الطلبات المتاحة</h3>
          <p className="text-text-secondary text-sm">اختر أنواع الطلبات التي تريد إتاحتها للعملاء</p>
        </div>

        {saveSuccess && <Alert type="success" message="تم حفظ الإعدادات بنجاح ✓" className="mb-4" />}

        <div className="space-y-3 mb-5">
          {orderTypeOptions.map(({ key, label, desc, icon: Icon }) => (
            <label key={key} className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-colors ${orderTypes[key] ? "border-accent bg-accent/5" : "border-border hover:border-accent/40"}`}>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${orderTypes[key] ? "bg-accent/10" : "bg-bg-subtle"}`}>
                  <Icon className={`w-5 h-5 ${orderTypes[key] ? "text-accent" : "text-text-secondary"}`} />
                </div>
                <div>
                  <p className="font-semibold text-text">{label}</p>
                  <p className="text-sm text-text-secondary">{desc}</p>
                </div>
              </div>
              <div className="relative">
                <input type="checkbox" className="sr-only" checked={orderTypes[key]}
                  onChange={(e) => setOrderTypes({ ...orderTypes, [key]: e.target.checked })} />
                <div className={`w-12 h-6 rounded-full transition-colors ${orderTypes[key] ? "bg-accent" : "bg-gray-300"}`}>
                  <div className={`w-5 h-5 bg-white rounded-full shadow absolute top-0.5 transition-all ${orderTypes[key] ? "right-0.5" : "left-0.5"}`} />
                </div>
              </div>
            </label>
          ))}
        </div>
        <Button onClick={saveOrderTypes} loading={saving} fullWidth>حفظ إعدادات الطلبات</Button>
      </Card>

      {/* ===== Coming Soon ===== */}
      <Card className="bg-bg-subtle">
        <h3 className="text-lg font-bold text-text mb-3">إعدادات إضافية (قريباً)</h3>
        <ul className="space-y-2 text-text-secondary text-sm">
          <li>• تحديث معلومات المطعم والتواصل</li>
          <li>• رفع الشعار وصور الغلاف</li>
          <li>• تخصيص ألوان صفحة الطلب</li>
          <li>• ضبط ساعات العمل والإجازات</li>
          <li>• تغيير كلمة المرور والأمان</li>
        </ul>
      </Card>
    </div>
  );
};

export default RestaurantSettings;

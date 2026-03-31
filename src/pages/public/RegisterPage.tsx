import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Store, ArrowRight, CheckCircle, Utensils } from "lucide-react";
import { Button, Input, Textarea, Alert, Card } from "../../components/ui";
import { supabase } from "../../config/supabase";
import { isValidEmail } from "../../utils/helpers";

interface FormData {
  restaurant_name: string;
  owner_name: string;
  phone: string;
  email: string;
  password: string;
  city: string;
  address: string;
  restaurant_type: string;
  heard_from: string;
  notes: string;
}

const restaurantTypes = ["مطعم", "كافيه", "مخبز", "فود تراك", "مطبخ سحابي", "فاين داينينج", "فاست فود", "أخرى"];
const heardFromOptions = ["بحث جوجل", "سوشيال ميديا", "صديق / إحالة", "إعلان", "أخرى"];
const cities = ["القاهرة", "الجيزة", "الإسكندرية", "المنصورة", "طنطا", "الزقازيق", "بورسعيد", "السويس", "الأقصر", "أسوان", "أخرى"];

const RegisterPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [createdAccount, setCreatedAccount] = useState<{
    email: string;
    restaurantName: string;
  } | null>(null);
  const [formData, setFormData] = useState<FormData>({
    restaurant_name: "", owner_name: "", phone: "", email: "", password: "",
    city: "", address: "", restaurant_type: "", heard_from: "", notes: "",
  });
  const [errors, setErrors] = useState<Partial<FormData>>({});

  const validate = (): boolean => {
    const e: Partial<FormData> = {};
    if (!formData.restaurant_name.trim()) e.restaurant_name = "اسم المطعم مطلوب";
    if (!formData.owner_name.trim()) e.owner_name = "اسم المالك مطلوب";
    if (!formData.phone.trim()) e.phone = "رقم الهاتف مطلوب";
    if (!formData.email.trim()) e.email = "البريد الإلكتروني مطلوب";
    if (!isValidEmail(formData.email)) e.email = "يرجى إدخال بريد إلكتروني صحيح";
    if (!formData.password.trim()) e.password = "كلمة المرور مطلوبة";
    if (formData.password.length < 6) e.password = "كلمة المرور يجب أن تكون 6 أحرف على الأقل";
    if (!formData.city.trim()) e.city = "المدينة مطلوبة";
    if (!formData.restaurant_type) e.restaurant_type = "نوع المطعم مطلوب";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!validate()) return;
    setLoading(true);

    try {
      console.log("🚀 بدء عملية التسجيل...");
      console.log("📝 البيانات المرسلة:", {
        p_restaurant_name: formData.restaurant_name,
        p_owner_name: formData.owner_name,
        p_phone: formData.phone,
        p_city: formData.city,
        p_restaurant_type: formData.restaurant_type,
        p_email: formData.email || null,
        p_password: "***", // لا نعرض كلمة المرور
        p_address: formData.address || null,
        p_heard_from: formData.heard_from || null,
        p_notes: formData.notes || null,
      });

      // إنشاء الحساب تلقائياً بدون مراجعة
      const { data: result, error: submitError } = await supabase.rpc(
        "auto_create_restaurant",
        {
          p_restaurant_name: formData.restaurant_name,
          p_owner_name: formData.owner_name,
          p_phone: formData.phone,
          p_city: formData.city,
          p_restaurant_type: formData.restaurant_type,
          p_email: formData.email || null,
          p_password: formData.password,
          p_address: formData.address || null,
          p_heard_from: formData.heard_from || null,
          p_notes: formData.notes || null,
        }
      );

      console.log("📡 استجابة Supabase:", { data: result, error: submitError });

      if (submitError) {
        console.error("❌ خطأ من Supabase:", submitError);
        throw new Error(submitError.message);
      }

      if (!result || !result.success) {
        console.error("❌ خطأ في النتيجة:", result);
        throw new Error(result?.message || "فشل في إنشاء الحساب");
      }

      console.log("✅ تم إنشاء الحساب بنجاح:", result);

      // حفظ بيانات الدخول لعرضها للمستخدم
      setCreatedAccount({
        email: result.email,
        restaurantName: result.restaurant_name,
      });

      setSuccess(true);
    } catch (err: unknown) {
      console.error("💥 خطأ في handleSubmit:", err);
      const msg = err instanceof Error ? err.message : "خطأ غير متوقع";
      setError("فشل إرسال الطلب: " + msg);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof FormData]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  if (success && createdAccount) {
    return (
      <div className="min-h-screen bg-gradient-to-bl from-orange-50 to-white flex items-center justify-center px-4" dir="rtl">
        <div className="w-full max-w-md text-center">
          <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-14 h-14 text-green-500" />
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900 mb-3">تم إنشاء حسابك بنجاح!</h1>
          <p className="text-gray-500 text-lg mb-8 leading-relaxed">
            مرحباً بك في FoodOrder! تم إنشاء حساب مطعمك تلقائياً.
          </p>

          <Card className="mb-6">
            <div className="text-right space-y-4">
              <div>
                <h3 className="font-bold text-gray-800 mb-2">تم إنشاء حسابك بنجاح!</h3>
                <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                  <div className="flex justify-between">
                    <span className="font-mono text-sm bg-white px-2 py-1 rounded">{createdAccount.email}</span>
                    <span className="text-gray-600">البريد الإلكتروني:</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-mono text-sm bg-white px-2 py-1 rounded">{createdAccount.restaurantName}</span>
                    <span className="text-gray-600">اسم المطعم:</span>
                  </div>
                </div>
              </div>

              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-green-800 text-sm">
                  ✅ <strong>جاهز للاستخدام:</strong> يمكنك الآن تسجيل الدخول باستخدام البريد الإلكتروني وكلمة المرور التي أدخلتها.
                </p>
              </div>
            </div>
          </Card>

          <div className="space-y-3">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 bg-accent text-white px-8 py-3 rounded-2xl font-bold hover:bg-accent/90 transition-colors w-full justify-center"
            >
              <ArrowRight className="w-5 h-5" />
              تسجيل الدخول الآن
            </Link>

            <Link to="/" className="inline-block text-accent font-semibold hover:underline">
              العودة للرئيسية
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-bl from-orange-50 to-white py-12 px-4" dir="rtl">
      <div className="w-full max-w-2xl mx-auto">
        <Link to="/" className="inline-flex items-center gap-2 text-gray-500 hover:text-accent transition-colors mb-8">
          <ArrowRight className="w-4 h-4" />
          العودة للرئيسية
        </Link>

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-accent/10 mb-4">
            <Utensils className="w-9 h-9 text-accent" />
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900 mb-2">سجّل مطعمك</h1>
          <p className="text-gray-500">انضم لمنصة FoodOrder وابدأ استقبال الطلبات الرقمية</p>
        </div>

        {error && <Alert type="error" message={error} className="mb-6" />}

        <Card>
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* معلومات المطعم */}
            <div>
              <h3 className="font-bold text-gray-800 text-sm uppercase tracking-wider mb-4 pb-2 border-b border-gray-100">معلومات المطعم</h3>
              <div className="grid sm:grid-cols-2 gap-4">
                <Input label="اسم المطعم *" name="restaurant_name" value={formData.restaurant_name}
                  onChange={handleChange} placeholder="مثال: مطعم الأصيل" required
                  error={errors.restaurant_name} />
                <div>
                  <label className="label mb-1.5">نوع المطعم *</label>
                  <select name="restaurant_type" value={formData.restaurant_type} onChange={handleChange} required
                    className="input-field w-full">
                    <option value="">اختر نوع المطعم</option>
                    {restaurantTypes.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                  {errors.restaurant_type && <p className="text-error text-xs mt-1">{errors.restaurant_type}</p>}
                </div>
              </div>
            </div>

            {/* معلومات المالك */}
            <div>
              <h3 className="font-bold text-gray-800 text-sm uppercase tracking-wider mb-4 pb-2 border-b border-gray-100">معلومات المالك</h3>
              <div className="grid sm:grid-cols-2 gap-4">
                <Input label="اسم المالك *" name="owner_name" value={formData.owner_name}
                  onChange={handleChange} placeholder="الاسم الكامل" required error={errors.owner_name} />
                <Input label="رقم الهاتف *" name="phone" type="text" value={formData.phone}
                  onChange={handleChange} placeholder="01XXXXXXXXX" required error={errors.phone} />
                <Input label="البريد الإلكتروني *" name="email" type="email"
                  value={formData.email} onChange={handleChange} placeholder="your@email.com" required />
                <Input label="كلمة المرور *" name="password" type="password"
                  value={formData.password} onChange={handleChange} placeholder="أدخل كلمة مرور قوية" required error={errors.password} />
              </div>
            </div>

            {/* الموقع */}
            <div>
              <h3 className="font-bold text-gray-800 text-sm uppercase tracking-wider mb-4 pb-2 border-b border-gray-100">الموقع</h3>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="label mb-1.5">المدينة *</label>
                  <select name="city" value={formData.city} onChange={handleChange} required
                    className="input-field w-full">
                    <option value="">اختر المدينة</option>
                    {cities.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                  {errors.city && <p className="text-error text-xs mt-1">{errors.city}</p>}
                </div>
                <Input label="العنوان التفصيلي" name="address" value={formData.address}
                  onChange={handleChange} placeholder="الشارع، الحي..." />
              </div>
            </div>

            {/* إضافي */}
            <div>
              <h3 className="font-bold text-gray-800 text-sm uppercase tracking-wider mb-4 pb-2 border-b border-gray-100">معلومات إضافية</h3>
              <div className="space-y-4">
                <div>
                  <label className="label mb-1.5">كيف سمعت عنا؟</label>
                  <select name="heard_from" value={formData.heard_from} onChange={handleChange}
                    className="input-field w-full">
                    <option value="">اختر...</option>
                    {heardFromOptions.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <Textarea label="ملاحظات إضافية (اختياري)" name="notes" value={formData.notes}
                  onChange={handleChange} placeholder="أي معلومات إضافية..." rows={3} />
              </div>
            </div>

            <Button type="submit" loading={loading} fullWidth size="lg" icon={<Store className="w-5 h-5" />}>
              إرسال طلب التسجيل
            </Button>
          </form>
        </Card>

        <p className="text-center text-gray-500 text-sm mt-6">
          لديك حساب بالفعل؟{" "}
          <Link to="/login" className="text-accent font-semibold hover:underline">تسجيل الدخول</Link>
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;

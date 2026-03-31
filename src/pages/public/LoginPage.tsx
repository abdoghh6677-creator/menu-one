import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Store, ArrowRight, Mail, Lock, AlertCircle } from "lucide-react";
import { Button, Input, Alert, Card } from "../../components/ui";
import { APP_CONFIG } from "../../config/config";
import { supabase } from "../../config/supabase";
import { isValidEmail } from "../../utils/helpers";
import { saveSession } from "../../utils/session";

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({ email: "", password: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!formData.email || !formData.password) {
      setError("يرجى إدخال البريد الإلكتروني وكلمة المرور");
      return;
    }
    if (!isValidEmail(formData.email)) {
      setError("يرجى إدخال بريد إلكتروني صحيح");
      return;
    }
    setLoading(true);
    try {
      const { data: loginData, error: loginError } = await supabase.rpc(
        "restaurant_login",
        { p_email: formData.email.toLowerCase(), p_password: formData.password }
      );
      if (loginError) {
        setError(`فشل تسجيل الدخول: ${loginError.message}`);
        setLoading(false);
        return;
      }
      if (!loginData || loginData.length === 0) {
        const { data: registrationData } = await supabase
          .from("registration_requests")
          .select("status")
          .eq("email", formData.email.toLowerCase())
          .single();
        if (registrationData?.status === "pending") {
          setError("pending");
          setLoading(false);
          return;
        }
        setError("البريد الإلكتروني أو كلمة المرور غير صحيحة");
        setLoading(false);
        return;
      }
      const userData = loginData[0];
      if (!userData.restaurant_is_active) {
        setError("حسابك غير نشط. يرجى التواصل مع الدعم.");
        setLoading(false);
        return;
      }
      saveSession({
        id: userData.id,
        email: userData.email,
        role: userData.role,
        restaurant_id: userData.restaurant_id,
        restaurant: {
          name: userData.restaurant_name,
          slug: userData.restaurant_slug,
          is_active: userData.restaurant_is_active,
        },
        temp_password: userData.temp_password,
      });
      navigate("/restaurant");
    } catch (err: any) {
      setError(`خطأ: ${err?.message || "خطأ في الاتصال"}`);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError("");
  };

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4" dir="rtl">
      <div className="w-full max-w-md">
        <Link to="/" className="inline-flex items-center text-text-secondary hover:text-text mb-8">
          <ArrowRight className="w-4 h-4 ml-2" />
          العودة للرئيسية
        </Link>
        <Card>
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-accent/5 mb-4">
              <Store className="w-10 h-10 text-accent" />
            </div>
            <h1 className="text-2xl font-bold text-text mb-2">مرحباً بعودتك</h1>
            <p className="text-text-secondary">سجّل الدخول إلى لوحة تحكم مطعمك</p>
          </div>

          {error === "pending" && (
            <Alert type="warning" title="الحساب قيد المراجعة" message="طلب تسجيلك قيد المراجعة. سيتواصل معك فريقنا خلال 24 ساعة." className="mb-6" />
          )}
          {error && error !== "pending" && (
            <Alert type="error" message={error} className="mb-6" />
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input label="البريد الإلكتروني" name="email" type="email" value={formData.email} onChange={handleChange} placeholder="your@email.com" icon={<Mail className="w-5 h-5" />} required autoComplete="email" />
            <Input label="كلمة المرور" name="password" type="password" value={formData.password} onChange={handleChange} placeholder="أدخل كلمة المرور" icon={<Lock className="w-5 h-5" />} required autoComplete="current-password" />
            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center text-text-secondary">
                <input type="checkbox" className="ml-2 rounded border-border" />
                تذكرني
              </label>
              <a href="#" className="text-accent hover:underline">نسيت كلمة المرور؟</a>
            </div>
            <Button type="submit" loading={loading} fullWidth size="lg">تسجيل الدخول</Button>
          </form>

          <div className="mt-6 text-center text-sm text-text-secondary">
            ليس لديك حساب؟{" "}
            <Link to="/register" className="text-accent font-medium hover:underline">سجّل مطعمك</Link>
          </div>
          <div className="mt-6 pt-6 border-t border-border text-center">
            <Link to="/admin/login" className="text-sm text-text-secondary hover:text-text flex items-center justify-center">
              <AlertCircle className="w-4 h-4 ml-2" />
              دخول الأدمن
            </Link>
          </div>
        </Card>
        <p className="mt-6 text-center text-sm text-text-secondary">
          تحتاج مساعدة؟ تواصل معنا على support@{APP_CONFIG.appName.toLowerCase()}.com
        </p>
      </div>
    </div>
  );
};

export default LoginPage;

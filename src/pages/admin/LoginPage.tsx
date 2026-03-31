import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Shield, ArrowRight, Mail, Lock } from "lucide-react";
import { Button, Alert } from "../../components/ui";
import { supabase } from "../../config/supabase";
import { isValidEmail, hashPassword } from "../../utils/helpers";

const AdminLogin: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({ email: "", password: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!formData.email || !formData.password) { setError("يرجى إدخال البريد الإلكتروني وكلمة المرور"); return; }
    if (!isValidEmail(formData.email)) { setError("يرجى إدخال بريد إلكتروني صحيح"); return; }
    setLoading(true);
    try {
      const passwordHash = await hashPassword(formData.password);
      const { data: adminData, error: adminError } = await supabase.rpc("admin_login", {
        p_email: formData.email.toLowerCase(),
        p_password_hash: passwordHash,
      });
      if (adminError || !adminData || adminData.length === 0) {
        setError("البريد الإلكتروني أو كلمة المرور غير صحيحة");
        setLoading(false);
        return;
      }
      const admin = adminData[0];
      localStorage.setItem("admin", JSON.stringify({ id: admin.id, email: admin.email, name: admin.name }));
      navigate("/admin");
    } catch {
      setError("حدث خطأ. يرجى المحاولة مرة أخرى.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4" dir="rtl">
      <div className="w-full max-w-md">
        <Link to="/" className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-8 transition-colors">
          <ArrowRight className="w-4 h-4" />
          العودة للرئيسية
        </Link>

        <div className="bg-gray-800 rounded-2xl p-8 border border-gray-700">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-accent/20 mb-4">
              <Shield className="w-9 h-9 text-accent" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-1">لوحة الأدمن</h1>
            <p className="text-gray-400 text-sm">للمشرفين والإدارة فقط</p>
          </div>

          {error && <Alert type="error" message={error} className="mb-5" />}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">البريد الإلكتروني</label>
              <div className="relative">
                <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input type="email" name="email" value={formData.email}
                  onChange={(e) => { setFormData(p => ({ ...p, email: e.target.value })); setError(""); }}
                  placeholder="admin@foodorder.com"
                  className="w-full bg-gray-700 border border-gray-600 text-white rounded-xl pr-10 pl-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent placeholder-gray-500"
                  required autoComplete="email" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">كلمة المرور</label>
              <div className="relative">
                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input type="password" name="password" value={formData.password}
                  onChange={(e) => { setFormData(p => ({ ...p, password: e.target.value })); setError(""); }}
                  placeholder="أدخل كلمة المرور"
                  className="w-full bg-gray-700 border border-gray-600 text-white rounded-xl pr-10 pl-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent placeholder-gray-500"
                  required autoComplete="current-password" />
              </div>
            </div>

            <Button type="submit" loading={loading} fullWidth size="lg">دخول الأدمن</Button>
          </form>

          <div className="mt-6 p-4 bg-gray-700/50 rounded-xl border border-gray-600">
            <p className="text-xs text-gray-400 font-medium mb-1">بيانات الدخول الافتراضية:</p>
            <p className="text-xs text-gray-300">البريد: admin@foodorder.com</p>
            <p className="text-xs text-gray-300">الباسورد: admin123</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;

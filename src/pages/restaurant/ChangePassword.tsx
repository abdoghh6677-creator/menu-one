import React, { useState } from "react";
import { KeyRound, Eye, EyeOff, CheckCircle, ShieldCheck } from "lucide-react";
import { Card, Button, Alert } from "../../components/ui";
import { supabase } from "../../config/supabase";
import { hashPassword } from "../../utils/helpers";
import { getSession, updateSessionUser } from "../../utils/session";

const ChangePassword: React.FC = () => {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const user = getSession();

  // قوة كلمة المرور
  const getPasswordStrength = (pwd: string) => {
    let score = 0;
    if (pwd.length >= 8) score++;
    if (pwd.length >= 12) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    return score;
  };

  const strength = getPasswordStrength(newPassword);
  const strengthLabels = ["", "ضعيفة جداً", "ضعيفة", "متوسطة", "قوية", "قوية جداً"];
  const strengthColors = ["", "bg-red-500", "bg-orange-500", "bg-yellow-500", "bg-blue-500", "bg-green-500"];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!currentPassword) { setError("يرجى إدخال كلمة المرور الحالية"); return; }
    if (newPassword.length < 8) { setError("كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل"); return; }
    if (newPassword !== confirmPassword) { setError("كلمة المرور الجديدة غير متطابقة"); return; }
    if (newPassword === currentPassword) { setError("كلمة المرور الجديدة يجب أن تختلف عن الحالية"); return; }

    setLoading(true);
    try {
      // التحقق من كلمة المرور الحالية
      const currentHash = await hashPassword(currentPassword);
      const { data: verifyData } = await supabase.rpc("restaurant_login", {
        p_email: user?.email,
        p_password_hash: currentHash,
      });

      if (!verifyData || verifyData.length === 0) {
        setError("كلمة المرور الحالية غير صحيحة");
        setLoading(false);
        return;
      }

      // تحديث كلمة المرور
      const newHash = await hashPassword(newPassword);
      const { error: updateError } = await supabase
        .from("users")
        .update({ password_hash: newHash, temp_password: false })
        .eq("id", user?.id);

      if (updateError) throw updateError;

      // تحديث الجلسة
      updateSessionUser({ temp_password: false });

      setSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setError("فشل تغيير كلمة المرور: " + (err.message || "خطأ غير متوقع"));
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="max-w-md mx-auto">
        <Card className="text-center py-12">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-12 h-12 text-green-500" />
          </div>
          <h2 className="text-2xl font-bold text-text mb-2">تم تغيير كلمة المرور!</h2>
          <p className="text-text-secondary mb-6">كلمة مرورك الجديدة محفوظة بأمان.</p>
          <Button onClick={() => setSuccess(false)} variant="outline">تغيير مرة أخرى</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-text mb-2">تغيير كلمة المرور</h2>
        <p className="text-text-secondary">اختر كلمة مرور قوية لحماية حسابك</p>
      </div>

      <Card>
        <div className="flex items-center gap-3 mb-6 p-3 bg-blue-50 rounded-xl">
          <ShieldCheck className="w-5 h-5 text-blue-600 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-blue-800">نصائح لكلمة مرور قوية</p>
            <p className="text-xs text-blue-600">8 أحرف على الأقل، حروف كبيرة وصغيرة، أرقام ورموز</p>
          </div>
        </div>

        {error && <Alert type="error" message={error} className="mb-4" />}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* كلمة المرور الحالية */}
          <div>
            <label className="label mb-2">كلمة المرور الحالية</label>
            <div className="relative">
              <input
                type={showCurrent ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="أدخل كلمة المرور الحالية"
                className="input-field w-full pl-10"
                required
              />
              <button type="button" onClick={() => setShowCurrent(!showCurrent)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text">
                {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* كلمة المرور الجديدة */}
          <div>
            <label className="label mb-2">كلمة المرور الجديدة</label>
            <div className="relative">
              <input
                type={showNew ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="أدخل كلمة المرور الجديدة"
                className="input-field w-full pl-10"
                required
              />
              <button type="button" onClick={() => setShowNew(!showNew)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text">
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* مؤشر القوة */}
            {newPassword && (
              <div className="mt-2 space-y-1">
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${i <= strength ? strengthColors[strength] : "bg-gray-200"}`} />
                  ))}
                </div>
                <p className={`text-xs font-medium ${strength <= 2 ? "text-red-500" : strength <= 3 ? "text-yellow-600" : "text-green-600"}`}>
                  قوة كلمة المرور: {strengthLabels[strength]}
                </p>
              </div>
            )}
          </div>

          {/* تأكيد كلمة المرور */}
          <div>
            <label className="label mb-2">تأكيد كلمة المرور الجديدة</label>
            <div className="relative">
              <input
                type={showConfirm ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="أعد كتابة كلمة المرور الجديدة"
                className="input-field w-full pl-10"
                required
              />
              <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text">
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* تطابق كلمة المرور */}
            {confirmPassword && (
              <p className={`text-xs mt-1 font-medium ${newPassword === confirmPassword ? "text-green-600" : "text-red-500"}`}>
                {newPassword === confirmPassword ? "✓ كلمتا المرور متطابقتان" : "✗ كلمتا المرور غير متطابقتين"}
              </p>
            )}
          </div>

          <Button
            type="submit"
            loading={loading}
            fullWidth
            size="lg"
            icon={<KeyRound className="w-5 h-5" />}
          >
            تغيير كلمة المرور
          </Button>
        </form>
      </Card>
    </div>
  );
};

export default ChangePassword;

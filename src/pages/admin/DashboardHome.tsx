import React, { useEffect, useState } from "react";
import { Store as StoreIcon, FileText, ShoppingBag, DollarSign, TrendingUp, AlertCircle } from "lucide-react";
import { Card, Loading } from "../../components/ui";
import { getPlatformStats } from "../../services/adminService";
import { formatCurrency } from "../../utils/helpers";
import { Link } from "react-router-dom";

const DashboardHome: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ activeRestaurants: 0, pendingRequests: 0, totalOrders: 0, todayRevenue: 0 });

  useEffect(() => {
    getPlatformStats().then((data) => { setStats(data); setLoading(false); });
  }, []);

  if (loading) return <Loading text="جاري التحميل..." />;

  const statCards = [
    { label: "المطاعم النشطة", value: stats.activeRestaurants, icon: StoreIcon, color: "text-success", bg: "bg-success/10" },
    { label: "طلبات التسجيل", value: stats.pendingRequests, icon: FileText, color: "text-warning", bg: "bg-warning/10",
      extra: stats.pendingRequests > 0 ? <Link to="/admin/requests" className="text-xs text-accent hover:underline mt-1 block">مراجعة الآن ←</Link> : null },
    { label: "إجمالي الطلبات", value: stats.totalOrders, icon: ShoppingBag, color: "text-blue-600", bg: "bg-blue-50",
      sub: <span className="text-xs text-success flex items-center mt-1"><TrendingUp className="w-3 h-3 ml-1" />كل الأوقات</span> },
    { label: "إيرادات اليوم", value: formatCurrency(stats.todayRevenue), icon: DollarSign, color: "text-success", bg: "bg-success/10",
      sub: <span className="text-xs text-gray-400 mt-1 block">على مستوى المنصة</span> },
  ];

  const quickActions = [
    { to: "/admin/requests", icon: FileText, title: "مراجعة الطلبات", desc: `${stats.pendingRequests} طلب ينتظر المراجعة` },
    { to: "/admin/restaurants", icon: StoreIcon, title: "إدارة المطاعم", desc: `${stats.activeRestaurants} مطعم نشط` },
    { to: "/admin/analytics", icon: TrendingUp, title: "التحليلات", desc: "مقاييس أداء المنصة" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-1">نظرة عامة على المنصة</h2>
        <p className="text-gray-500">متابعة أداء شبكة مطاعمك</p>
      </div>

      {/* Stats */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {statCards.map((s, i) => (
          <Card key={i} className="hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-gray-500 text-sm mb-1">{s.label}</p>
                <p className="text-3xl font-bold text-gray-900">{s.value}</p>
                {s.extra}{s.sub}
              </div>
              <div className={`p-3 rounded-xl ${s.bg}`}><s.icon className={`w-6 h-6 ${s.color}`} /></div>
            </div>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <Card>
        <h3 className="text-lg font-bold text-gray-900 mb-4">إجراءات سريعة</h3>
        <div className="grid sm:grid-cols-3 gap-4">
          {quickActions.map((a, i) => (
            <Link key={i} to={a.to} className="p-4 border border-gray-200 rounded-xl hover:border-accent hover:bg-accent/5 transition-all">
              <a.icon className="w-8 h-8 text-accent mb-2" />
              <h4 className="font-bold text-gray-900 mb-1">{a.title}</h4>
              <p className="text-sm text-gray-500">{a.desc}</p>
            </Link>
          ))}
        </div>
      </Card>

      {/* Alert */}
      {stats.pendingRequests > 0 && (
        <div className="bg-warning/10 border border-warning/30 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-gray-900 mb-1">يتطلب إجراء</h4>
            <p className="text-gray-600 text-sm">
              لديك {stats.pendingRequests} طلب تسجيل ينتظر المراجعة.{" "}
              <Link to="/admin/requests" className="text-accent font-semibold hover:underline">مراجعة الآن</Link>
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardHome;

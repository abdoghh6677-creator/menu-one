import React, { useEffect, useState } from "react";
import { ShoppingBag, Utensils, DollarSign, Clock, TrendingUp, Users, Star, Timer } from "lucide-react";
import { Card, Loading } from "../../components/ui";
import { getRestaurantStats } from "../../services/restaurantService";
import { formatCurrency } from "../../utils/helpers";

const RestaurantHome: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    if (!user.restaurant_id) return;
    const data = await getRestaurantStats(user.restaurant_id);
    setStats(data);
    setLoading(false);
  };

  if (loading) return <Loading text="جاري تحميل لوحة التحكم..." />;

  const statCards = [
    { title: "الطلبات المعلقة", value: stats?.pendingOrders || 0, icon: Clock, color: "text-warning", bgColor: "bg-warning/10" },
    { title: "طلبات اليوم", value: stats?.completedToday || 0, icon: ShoppingBag, color: "text-accent", bgColor: "bg-accent/10" },
    { title: "إيرادات اليوم", value: formatCurrency(stats?.revenueToday || 0), icon: DollarSign, color: "text-success", bgColor: "bg-success/10" },
    { title: "إجمالي الطلبات", value: stats?.totalOrders || 0, icon: Utensils, color: "text-accent-secondary", bgColor: "bg-accent-secondary/10" },
    { title: "متوسط قيمة الطلب", value: formatCurrency(stats?.avgOrderValue || 0), icon: TrendingUp, color: "text-purple-600", bgColor: "bg-purple-100" },
    { title: "إيرادات الأسبوع", value: formatCurrency(stats?.revenueWeek || 0), icon: DollarSign, color: "text-blue-600", bgColor: "bg-blue-100" },
    { title: "معدل الاحتفاظ", value: `${Math.round(stats?.customerRetention || 0)}%`, icon: Users, color: "text-green-600", bgColor: "bg-green-100" },
    { title: "متوسط وقت التحضير", value: `${stats?.avgPreparationTime || 0} دقيقة`, icon: Timer, color: "text-orange-600", bgColor: "bg-orange-100" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-text mb-2">لوحة التحكم</h2>
        <p className="text-text-secondary">مرحباً! إليك نظرة عامة على مطعمك</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, index) => (
          <Card key={index} className="hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-text-secondary text-sm mb-1">{stat.title}</p>
                <p className="text-2xl font-bold text-text">{stat.value}</p>
              </div>
              <div className={`${stat.bgColor} p-3 rounded-lg`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* أكثر الأصناف طلباً */}
      {stats?.topItems && stats.topItems.length > 0 && (
        <Card>
          <h3 className="text-lg font-semibold text-text mb-4 flex items-center gap-2">
            <Star className="w-5 h-5 text-yellow-500" />
            أكثر الأصناف طلباً
          </h3>
          <div className="space-y-3">
            {stats.topItems.map((item: any, index: number) => (
              <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 bg-accent/10 text-accent rounded-full flex items-center justify-center text-sm font-bold">
                    {index + 1}
                  </span>
                  <span className="font-medium text-text">{item.name}</span>
                </div>
                <span className="text-text-secondary text-sm">{item.count} طلب</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* أوقات الذروة والفئات الشعبية */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* أوقات الذروة */}
        {stats?.peakHours && stats.peakHours.length > 0 && (
          <Card>
            <h3 className="text-lg font-semibold text-text mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-500" />
              أوقات الذروة
            </h3>
            <div className="space-y-3">
              {stats.peakHours.map((hour: any, index: number) => (
                <div key={index} className="flex items-center justify-between py-2">
                  <span className="font-medium text-text">
                    {hour.hour.toString().padStart(2, '0')}:00 - {(hour.hour + 1).toString().padStart(2, '0')}:00
                  </span>
                  <span className="text-text-secondary text-sm">{hour.count} طلب</span>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* الفئات الأكثر شعبية */}
        {stats?.popularCategories && stats.popularCategories.length > 0 && (
          <Card>
            <h3 className="text-lg font-semibold text-text mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-500" />
              الفئات الأكثر شعبية
            </h3>
            <div className="space-y-3">
              {stats.popularCategories.map((category: any, index: number) => (
                <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                  <span className="font-medium text-text">{category.category}</span>
                  <span className="text-text-secondary text-sm">{category.count} طلب</span>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>

      {/* توزيع حالات الطلبات */}
      {stats?.statusDistribution && (
        <Card>
          <h3 className="text-lg font-semibold text-text mb-4">توزيع حالات الطلبات</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {Object.entries(stats.statusDistribution).map(([status, count]) => {
              const statusLabels: { [key: string]: string } = {
                pending: "معلق",
                accepted: "مقبول",
                preparing: "قيد التحضير",
                ready: "جاهز",
                completed: "مكتمل",
                cancelled: "ملغي",
                rejected: "مرفوض",
              };
              const statusColors: { [key: string]: string } = {
                pending: "bg-yellow-100 text-yellow-800",
                accepted: "bg-blue-100 text-blue-800",
                preparing: "bg-orange-100 text-orange-800",
                ready: "bg-green-100 text-green-800",
                completed: "bg-green-100 text-green-800",
                cancelled: "bg-red-100 text-red-800",
                rejected: "bg-red-100 text-red-800",
              };

              return (
                <div key={status} className="text-center">
                  <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[status] || "bg-gray-100 text-gray-800"}`}>
                    {statusLabels[status] || status}
                  </div>
                  <p className="text-2xl font-bold text-text mt-2">{count as number}</p>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <Card>
        <h3 className="text-lg font-semibold text-text mb-4">إجراءات سريعة</h3>
        <div className="grid sm:grid-cols-3 gap-4">
          <a href="/restaurant/orders" className="p-4 border border-border rounded-lg hover:border-accent hover:bg-accent/5 transition-colors text-center">
            <ShoppingBag className="w-8 h-8 text-accent mx-auto mb-2" />
            <p className="font-medium text-text">عرض الطلبات</p>
            <p className="text-sm text-text-secondary">إدارة الطلبات الواردة</p>
          </a>
          <a href="/restaurant/menu" className="p-4 border border-border rounded-lg hover:border-accent hover:bg-accent/5 transition-colors text-center">
            <Utensils className="w-8 h-8 text-accent mx-auto mb-2" />
            <p className="font-medium text-text">إدارة المنيو</p>
            <p className="text-sm text-text-secondary">تحديث الأصناف والأسعار</p>
          </a>
          <a href="/restaurant/reports" className="p-4 border border-border rounded-lg hover:border-accent hover:bg-accent/5 transition-colors text-center">
            <DollarSign className="w-8 h-8 text-accent mx-auto mb-2" />
            <p className="font-medium text-text">عرض التقارير</p>
            <p className="text-sm text-text-secondary">المبيعات والتحليلات</p>
          </a>
        </div>
      </Card>
    </div>
  );
};

export default RestaurantHome;

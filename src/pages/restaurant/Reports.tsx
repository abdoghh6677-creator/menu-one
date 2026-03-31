import React, { useState, useEffect } from "react";
import { TrendingUp, DollarSign, ShoppingBag, Package, Calendar, Download } from "lucide-react";
import { Card, Button, Loading } from "../../components/ui";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { supabase } from "../../config/supabase";
import { formatCurrency } from "../../utils/helpers";
import { getSession } from "../../utils/session";

interface ReportData {
  totalRevenue: number;
  totalOrders: number;
  avgOrderValue: number;
  topItems: { name: string; count: number; revenue: number }[];
  dailyData: { date: string; revenue: number; orders: number }[];
  orderTypeDistribution: { type: string; label: string; count: number }[];
}

const orderTypeLabels: Record<string, string> = {
  qr: "داخل المطعم",
  counter: "استلام من الفرع",
  phone: "توصيل",
  table: "طاولة",
  unknown: "غير محدد",
};

const COLORS = ["#f97316", "#3b82f6", "#10b981", "#8b5cf6", "#f43f5e"];

const Reports: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [dateRange, setDateRange] = useState<"7" | "30" | "90">("30");

  useEffect(() => { fetchReportData(); }, [dateRange]);

  const fetchReportData = async () => {
    setLoading(true);
    try {
      const user = getSession();
      if (!user?.restaurant_id) return;

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(dateRange));

      const { data: orders, error } = await supabase
        .from("orders")
        .select("*")
        .eq("restaurant_id", user.restaurant_id)
        .gte("created_at", startDate.toISOString())
        .in("status", ["completed", "ready", "preparing", "accepted"]);

      if (error) throw error;

      // ✅ إصلاح: استخدام `total` بدلاً من `total_amount`
      const totalRevenue = orders?.reduce((sum, o) => sum + (o.total || 0), 0) || 0;
      const totalOrders = orders?.length || 0;
      const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      // أكثر الأصناف طلباً
      const itemCounts: Record<string, { count: number; revenue: number }> = {};
      orders?.forEach((order) => {
        order.items?.forEach((item: any) => {
          if (!itemCounts[item.name]) itemCounts[item.name] = { count: 0, revenue: 0 };
          itemCounts[item.name].count += item.quantity;
          // ✅ إصلاح: استخدام item_total
          itemCounts[item.name].revenue += (item.item_total || item.item_total || 0) * item.quantity;
        });
      });

      const topItems = Object.entries(itemCounts)
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      // البيانات اليومية
      const dailyMap: Record<string, { revenue: number; orders: number }> = {};
      orders?.forEach((order) => {
        const date = new Date(order.created_at).toLocaleDateString("ar-EG", {
          timeZone: 'Africa/Cairo',
          month: "short",
          day: "numeric"
        });
        if (!dailyMap[date]) dailyMap[date] = { revenue: 0, orders: 0 };
        // ✅ إصلاح: استخدام `total`
        dailyMap[date].revenue += order.total || 0;
        dailyMap[date].orders += 1;
      });

      const dailyData = Object.entries(dailyMap)
        .map(([date, data]) => ({ date, ...data }))
        .slice(-14);

      // توزيع أنواع الطلبات
      const typeCounts: Record<string, number> = {};
      orders?.forEach((order) => {
        const type = order.order_type || "unknown";
        typeCounts[type] = (typeCounts[type] || 0) + 1;
      });

      const orderTypeDistribution = Object.entries(typeCounts).map(([type, count]) => ({
        type, count, label: orderTypeLabels[type] || type,
      }));

      setReportData({ totalRevenue, totalOrders, avgOrderValue, topItems, dailyData, orderTypeDistribution });
    } catch (err) {
      console.error("خطأ في التقارير:", err);
    } finally {
      setLoading(false);
    }
  };

  const exportCSV = () => {
    if (!reportData) return;
    const rows = [
      ["المقياس", "القيمة"],
      ["إجمالي الإيرادات", formatCurrency(reportData.totalRevenue)],
      ["إجمالي الطلبات", String(reportData.totalOrders)],
      ["متوسط قيمة الطلب", formatCurrency(reportData.avgOrderValue)],
      [""],
      ["الصنف", "الكمية", "الإيرادات"],
      ...reportData.topItems.map((i) => [i.name, String(i.count), formatCurrency(i.revenue)]),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `تقرير-${dateRange}-يوم.csv`; a.click();
  };

  if (loading) return <Loading text="جاري تحميل التقارير..." />;

  if (!reportData) return (
    <div className="text-center py-20 text-text-secondary">لا توجد بيانات للفترة المحددة</div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-text mb-1">التقارير والتحليلات</h2>
          <p className="text-text-secondary">تتبع أداء مبيعاتك</p>
        </div>
        <div className="flex gap-3">
          <select value={dateRange} onChange={(e) => setDateRange(e.target.value as "7" | "30" | "90")} className="input">
            <option value="7">آخر 7 أيام</option>
            <option value="30">آخر 30 يوم</option>
            <option value="90">آخر 90 يوم</option>
          </select>
          <Button icon={<Download className="w-4 h-4" />} onClick={exportCSV} variant="outline">تصدير CSV</Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "إجمالي الإيرادات", value: formatCurrency(reportData.totalRevenue), icon: DollarSign, color: "text-success", bg: "bg-success/10" },
          { label: "إجمالي الطلبات", value: String(reportData.totalOrders), icon: ShoppingBag, color: "text-accent", bg: "bg-accent/10" },
          { label: "متوسط قيمة الطلب", value: formatCurrency(reportData.avgOrderValue), icon: TrendingUp, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "فترة التقرير", value: `${dateRange} يوم`, icon: Calendar, color: "text-warning", bg: "bg-warning/10" },
        ].map((s, i) => (
          <Card key={i}>
            <div className="flex items-center justify-between mb-3">
              <div className={`p-2.5 rounded-lg ${s.bg}`}><s.icon className={`w-5 h-5 ${s.color}`} /></div>
            </div>
            <div className="text-2xl font-bold text-text mb-1">{s.value}</div>
            <p className="text-text-secondary text-sm">{s.label}</p>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* الإيرادات اليومية */}
        <Card>
          <h3 className="text-lg font-bold text-text mb-4">الإيرادات اليومية</h3>
          {reportData.dailyData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-text-secondary text-sm">لا توجد بيانات</div>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={reportData.dailyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" stroke="#9ca3af" tick={{ fontSize: 11 }} />
                <YAxis stroke="#9ca3af" tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}`} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ borderRadius: "8px", fontSize: "12px" }} />
                <Line type="monotone" dataKey="revenue" stroke="#f97316" strokeWidth={2.5} dot={false} name="الإيرادات" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* أنواع الطلبات */}
        <Card>
          <h3 className="text-lg font-bold text-text mb-4">الطلبات حسب النوع</h3>
          {reportData.orderTypeDistribution.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-text-secondary text-sm">لا توجد بيانات</div>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={reportData.orderTypeDistribution} dataKey="count" nameKey="label"
                  cx="50%" cy="50%" outerRadius={90} label={({ name, percent }: any) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
                  labelLine={false}>
                  {reportData.orderTypeDistribution.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => `${v} طلب`} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {/* عدد الطلبات اليومي */}
      <Card>
        <h3 className="text-lg font-bold text-text mb-4">عدد الطلبات اليومي</h3>
        {reportData.dailyData.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-text-secondary text-sm">لا توجد بيانات</div>
        ) : (
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={reportData.dailyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" stroke="#9ca3af" tick={{ fontSize: 11 }} />
              <YAxis stroke="#9ca3af" tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ borderRadius: "8px", fontSize: "12px" }} />
              <Bar dataKey="orders" fill="#3b82f6" name="الطلبات" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>

      {/* أكثر الأصناف طلباً */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-text">الأصناف الأكثر طلباً</h3>
          <Package className="w-5 h-5 text-accent" />
        </div>
        {reportData.topItems.length === 0 ? (
          <p className="text-text-secondary text-center py-8">لا توجد مبيعات حتى الآن</p>
        ) : (
          <div className="space-y-3">
            {reportData.topItems.map((item, index) => (
              <div key={item.name} className="flex items-center gap-4 p-3 bg-bg-subtle rounded-xl">
                <div className="w-9 h-9 bg-accent rounded-full text-white font-bold flex items-center justify-center flex-shrink-0">{index + 1}</div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-text truncate">{item.name}</p>
                  <p className="text-sm text-text-secondary">{item.count} طلب</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-bold text-success">{formatCurrency(item.revenue)}</p>
                  <p className="text-xs text-text-secondary">إيرادات</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

export default Reports;

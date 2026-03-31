import React, { useEffect, useState } from "react";
import { useNavigate, Routes, Route, Link, useLocation } from "react-router-dom";
import { Shield, LogOut, LayoutDashboard, FileText, Store as StoreIcon, BarChart3 } from "lucide-react";
import DashboardHome from "./DashboardHome";
import PendingRequests from "./PendingRequests";
import AllRestaurants from "./AllRestaurants";
import Analytics from "./Analytics";

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [admin, setAdmin] = useState<any>(null);

  useEffect(() => {
    const adminData = localStorage.getItem("admin");
    if (!adminData) navigate("/admin/login");
    else setAdmin(JSON.parse(adminData));
  }, [navigate]);

  const handleLogout = () => { localStorage.removeItem("admin"); navigate("/admin/login"); };

  if (!admin) return null;

  const navItems = [
    { path: "/admin", icon: LayoutDashboard, label: "الرئيسية" },
    { path: "/admin/requests", icon: FileText, label: "طلبات التسجيل" },
    { path: "/admin/restaurants", icon: StoreIcon, label: "المطاعم" },
    { path: "/admin/analytics", icon: BarChart3, label: "التحليلات" },
  ];

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* Top Nav */}
      <nav className="bg-gray-900 sticky top-0 z-40 border-b border-gray-700">
        <div className="container-custom">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-accent/20 rounded-xl flex items-center justify-center">
                <Shield className="w-5 h-5 text-accent" />
              </div>
              <div>
                <h1 className="text-base font-bold text-white">لوحة الأدمن</h1>
                <p className="text-xs text-gray-400">{admin.email}</p>
              </div>
            </div>
            <button onClick={handleLogout} className="flex items-center gap-2 text-gray-400 hover:text-red-400 transition-colors text-sm">
              <LogOut className="w-4 h-4" />
              خروج
            </button>
          </div>
        </div>
      </nav>

      {/* Secondary Nav */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="container-custom">
          <div className="flex gap-1 overflow-x-auto">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link key={item.path} to={item.path}
                  className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors whitespace-nowrap text-sm ${
                    isActive ? "border-accent text-accent font-medium" : "border-transparent text-gray-400 hover:text-gray-200"
                  }`}>
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container-custom py-8">
        <Routes>
          <Route index element={<DashboardHome />} />
          <Route path="requests" element={<PendingRequests />} />
          <Route path="restaurants" element={<AllRestaurants />} />
          <Route path="analytics" element={<Analytics />} />
        </Routes>
      </div>
    </div>
  );
};

export default AdminDashboard;

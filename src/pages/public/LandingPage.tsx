import React from "react";
import { Link } from "react-router-dom";
import {
  QrCode, Smartphone, BarChart3, Zap, Globe,
  ChevronLeft, CheckCircle, Menu, X,
  Utensils, Bell
} from "lucide-react";

const LandingPage: React.FC = () => {

  const features = [
    { icon: QrCode, title: "منيو QR ذكي", desc: "عملاؤك يمسحون QR ويطلبون مباشرة بدون تطبيق" },
    { icon: Bell, title: "إشعارات فورية", desc: "استقبل إشعار صوتي فور وصول أي طلب جديد" },
    { icon: BarChart3, title: "تقارير تفصيلية", desc: "تابع مبيعاتك وأداء مطعمك لحظة بلحظة" },
    { icon: Zap, title: "تحديث فوري", desc: "عدّل المنيو وسعر أي صنف ويظهر للعملاء فوراً" },
    { icon: Smartphone, title: "يعمل كتطبيق", desc: "العميل يثبّت المنيو على هاتفه كتطبيق كامل" },
    { icon: Globe, title: "عربي وإنجليزي", desc: "المنيو متاح باللغتين — العميل يختار" },
  ];

  return (
    <div className="min-h-screen bg-white" dir="rtl">

      {/* ===== Navbar ===== */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 bg-accent rounded-xl flex items-center justify-center">
                <Utensils className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">FoodOrder</span>
            </div>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-gray-600 hover:text-accent transition-colors text-sm font-medium">المميزات</a>
              <a href="#how" className="text-gray-600 hover:text-accent transition-colors text-sm font-medium">كيف يعمل؟</a>
              <Link to="/login" className="text-gray-600 hover:text-accent transition-colors text-sm font-medium">تسجيل الدخول</Link>
              <Link to="/register" className="bg-accent text-white px-5 py-2 rounded-xl text-sm font-bold hover:bg-accent/90 transition-colors">ابدأ مجاناً</Link>
            </div>
          </div>
        </div>
      </nav>

      {/* ===== Hero ===== */}
      <section className="relative overflow-hidden bg-gradient-to-bl from-orange-50 via-white to-amber-50 pt-16 pb-24">
        {/* Decorative circles */}
        <div className="absolute top-10 left-10 w-72 h-72 bg-accent/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-orange-100/50 rounded-full blur-3xl" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-accent/10 text-accent px-4 py-2 rounded-full text-sm font-semibold mb-8">
            <Zap className="w-4 h-4" />
            الحل الرقمي الأمثل لمطعمك في مصر
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 leading-tight mb-6">
            منيو رقمي ذكي
            <br />
            <span className="text-accent">لمطعمك في دقائق</span>
          </h1>

          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-10 leading-relaxed">
            دع عملاءك يطلبون بمسح QR Code بسيط — بدون تطبيق، بدون تعقيد.
            استقبل الطلبات فوراً وإدارة مطعمك من مكان واحد.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
            <Link to="/register"
              className="flex items-center gap-2 bg-accent text-white px-8 py-4 rounded-2xl text-lg font-bold hover:bg-accent/90 transition-all shadow-lg shadow-accent/30 hover:shadow-xl hover:shadow-accent/40 hover:-translate-y-0.5">
              ابدأ تجربتك المجانية
              <ChevronLeft className="w-5 h-5" />
            </Link>
            <Link to="/login"
              className="flex items-center gap-2 border-2 border-gray-200 text-gray-700 px-8 py-4 rounded-2xl text-lg font-semibold hover:border-accent hover:text-accent transition-all">
              تسجيل الدخول
            </Link>
          </div>

          {/* Stats */}
          <div className="flex flex-wrap justify-center gap-8 text-center">
            {[
              { n: "500+", label: "مطعم يثق بنا" },
              { n: "50K+", label: "طلب يومياً" },
              { n: "99.9%", label: "وقت التشغيل" },
              { n: "4.9/5", label: "تقييم العملاء" },
            ].map((s) => (
              <div key={s.n}>
                <div className="text-3xl font-extrabold text-accent">{s.n}</div>
                <div className="text-sm text-gray-500 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Features ===== */}
      <section id="features" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="text-accent font-semibold text-sm uppercase tracking-wider">المميزات</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mt-2 mb-4">كل ما يحتاجه مطعمك</h2>
            <p className="text-gray-500 text-lg max-w-xl mx-auto">منصة متكاملة تغطي كل احتياجات مطعمك الرقمية</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((f, i) => (
              <div key={i} className="group p-6 rounded-2xl border border-gray-100 hover:border-accent/30 hover:shadow-lg hover:shadow-accent/5 transition-all bg-white">
                <div className="w-12 h-12 bg-accent/10 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-accent group-hover:scale-110 transition-all">
                  <f.icon className="w-6 h-6 text-accent group-hover:text-white transition-colors" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== CTA ===== */}
      <section className="py-24 bg-accent">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4">جاهز تحوّل مطعمك للرقمي؟</h2>
          <p className="text-white/80 text-lg mb-10">انضم لمئات المطاعم اللي بتستخدم FoodOrder يومياً</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/register"
              className="flex items-center justify-center gap-2 bg-white text-accent px-8 py-4 rounded-2xl text-lg font-bold hover:bg-gray-50 transition-all shadow-xl">
              سجّل مطعمك مجاناً
              <ChevronLeft className="w-5 h-5" />
            </Link>
            <Link to="/login"
              className="flex items-center justify-center gap-2 border-2 border-white/40 text-white px-8 py-4 rounded-2xl text-lg font-semibold hover:bg-white/10 transition-all">
              تسجيل الدخول
            </Link>
          </div>
        </div>
      </section>

      {/* ===== Footer ===== */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
                <Utensils className="w-4 h-4 text-white" />
              </div>
              <span className="text-white font-bold text-lg">FoodOrder</span>
            </div>
            <div className="flex gap-6 text-sm">
              <a href="#features" className="hover:text-white transition-colors">المميزات</a>
              <a href="#pricing" className="hover:text-white transition-colors">الأسعار</a>
              <Link to="/login" className="hover:text-white transition-colors">تسجيل الدخول</Link>
              <Link to="/register" className="hover:text-white transition-colors">سجّل مطعمك</Link>
            </div>
            <p className="text-sm">© 2026 FoodOrder — جميع الحقوق محفوظة</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;

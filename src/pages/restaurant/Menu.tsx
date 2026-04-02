import React, { useEffect, useState } from "react";
import { Plus, Edit, Trash2, Eye, EyeOff, Search, Package, Tag, ChevronUp, ChevronDown, X } from "lucide-react";
import ImageUpload from "../../components/ImageUpload";
import LazyImage from "../../components/LazyImage";
import { Card, Button, Input, Badge, Modal, Loading, Alert, Textarea } from "../../components/ui";
import { subscribeToMenuItems, createMenuItem, updateMenuItem, deleteMenuItem, toggleMenuItemAvailability } from "../../services/restaurantService";
import { fetchCategories, createCategory, updateCategory, deleteCategory, reorderCategories, type Category } from "../../services/categoryService";
import type { MenuItem } from "../../config/supabase";
import { formatCurrency } from "../../utils/helpers";

// ─── Hook: جلب التصنيفات مع real-time تحديث ─────────────────────────────────
const useCategories = (restaurantId: string) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = async () => {
    if (!restaurantId) return;
    const data = await fetchCategories(restaurantId);
    setCategories(data);
    setLoading(false);
  };

  useEffect(() => { reload(); }, [restaurantId]);
  return { categories, loading, reload };
};

// ─── Modal إدارة التصنيفات ───────────────────────────────────────────────────
const CategoryManagerModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  restaurantId: string;
  categories: Category[];
  onReload: () => void;
}> = ({ isOpen, onClose, restaurantId, categories, onReload }) => {
  const [nameAr, setNameAr] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editNameAr, setEditNameAr] = useState("");
  const [editNameEn, setEditNameEn] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleAdd = async () => {
    if (!nameAr.trim()) { setError("اسم التصنيف مطلوب"); return; }
    setSaving(true); setError("");
    const res = await createCategory(restaurantId, nameAr, nameEn);
    setSaving(false);
    if (res.success) { setNameAr(""); setNameEn(""); onReload(); }
    else setError(res.error?.message || "فشل إضافة التصنيف");
  };

  const handleUpdate = async (cat: Category) => {
    if (!editNameAr.trim()) return;
    setSaving(true);
    await updateCategory(cat.id, editNameAr, editNameEn);
    setSaving(false);
    setEditId(null);
    onReload();
  };

  const handleDelete = async (cat: Category) => {
    if (!confirm(`حذف تصنيف "${cat.name}"؟ سيتم إلغاء تصنيف الأصناف التابعة له.`)) return;
    await deleteCategory(restaurantId, cat.id, cat.name);
    onReload();
  };

  const move = async (index: number, dir: -1 | 1) => {
    const newList = [...categories];
    const swapIdx = index + dir;
    if (swapIdx < 0 || swapIdx >= newList.length) return;
    [newList[index], newList[swapIdx]] = [newList[swapIdx], newList[index]];
    const updates = newList.map((c, i) => ({ id: c.id, display_order: i }));
    await reorderCategories(updates);
    onReload();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="إدارة التصنيفات" size="md">
      <div className="space-y-5" dir="rtl">
        {/* إضافة تصنيف جديد */}
        <div className="bg-gray-50 rounded-xl p-4 space-y-3">
          <h4 className="font-semibold text-gray-700">إضافة تصنيف جديد</h4>
          {error && <Alert type="error" message={error} />}
          <div className="grid grid-cols-2 gap-2">
            <Input placeholder="الاسم بالعربي *" value={nameAr} onChange={e => setNameAr(e.target.value)} />
            <Input placeholder="Name in English" value={nameEn} onChange={e => setNameEn(e.target.value)} />
          </div>
          <Button onClick={handleAdd} loading={saving} icon={<Plus className="w-4 h-4" />} size="sm">
            إضافة
          </Button>
        </div>

        {/* قائمة التصنيفات */}
        <div className="space-y-2 max-h-72 overflow-y-auto">
          {categories.length === 0 && (
            <p className="text-center text-gray-400 py-4 text-sm">لا توجد تصنيفات بعد</p>
          )}
          {categories.map((cat, idx) => (
            <div key={cat.id} className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2">
              {/* ترتيب */}
              <div className="flex flex-col gap-0.5">
                <button onClick={() => move(idx, -1)} disabled={idx === 0} className="text-gray-300 hover:text-gray-600 disabled:opacity-20">
                  <ChevronUp className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => move(idx, 1)} disabled={idx === categories.length - 1} className="text-gray-300 hover:text-gray-600 disabled:opacity-20">
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
              </div>

              {editId === cat.id ? (
                /* وضع التعديل */
                <div className="flex-1 flex gap-2">
                  <Input value={editNameAr} onChange={e => setEditNameAr(e.target.value)} placeholder="عربي" />
                  <Input value={editNameEn} onChange={e => setEditNameEn(e.target.value)} placeholder="English" />
                  <Button size="sm" loading={saving} onClick={() => handleUpdate(cat)}>حفظ</Button>
                  <button onClick={() => setEditId(null)} className="p-1 text-gray-400 hover:text-gray-600">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                /* وضع العرض */
                <div className="flex-1 flex items-center justify-between">
                  <div>
                    <span className="font-medium text-gray-800">{cat.name}</span>
                    {cat.name_en && <span className="text-xs text-gray-400 mr-2">/ {cat.name_en}</span>}
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => { setEditId(cat.id); setEditNameAr(cat.name); setEditNameEn(cat.name_en || ""); }}
                      className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleDelete(cat)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
};

// ─── Dropdown اختيار التصنيف في فورم الصنف ───────────────────────────────────
const CategorySelect: React.FC<{
  categories: Category[];
  valueAr: string;
  valueEn: string;
  onChange: (ar: string, en: string) => void;
  restaurantId: string;
  onCategoriesChange: () => void;
}> = ({ categories, valueAr, valueEn, onChange, restaurantId, onCategoriesChange }) => {
  const [showNew, setShowNew] = useState(false);
  const [newAr, setNewAr] = useState("");
  const [newEn, setNewEn] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === "__new__") { setShowNew(true); return; }
    if (val === "") { onChange("", ""); return; }
    const cat = categories.find(c => c.name === val);
    onChange(cat?.name || val, cat?.name_en || "");
  };

  const handleAddNew = async () => {
    if (!newAr.trim()) return;
    setSaving(true);
    const res = await createCategory(restaurantId, newAr, newEn);
    setSaving(false);
    if (res.success) {
      onChange(newAr, newEn);
      setShowNew(false);
      setNewAr(""); setNewEn("");
      onCategoriesChange();
    }
  };

  return (
    <div className="space-y-2">
      <label className="label">التصنيف</label>
      <select
        value={valueAr}
        onChange={handleSelectChange}
        className="input-field w-full"
        dir="rtl"
      >
        <option value="">— بدون تصنيف —</option>
        {categories.map(cat => (
          <option key={cat.id} value={cat.name}>
            {cat.name}{cat.name_en ? ` / ${cat.name_en}` : ""}
          </option>
        ))}
        <option value="__new__">➕ إضافة تصنيف جديد...</option>
      </select>

      {showNew && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 space-y-2">
          <p className="text-sm font-medium text-blue-700">تصنيف جديد</p>
          <div className="grid grid-cols-2 gap-2">
            <Input placeholder="الاسم بالعربي *" value={newAr} onChange={e => setNewAr(e.target.value)} />
            <Input placeholder="Name in English" value={newEn} onChange={e => setNewEn(e.target.value)} />
          </div>
          <div className="flex gap-2">
            <Button size="sm" loading={saving} onClick={handleAddNew}>إضافة وتحديد</Button>
            <Button size="sm" variant="outline" onClick={() => { setShowNew(false); setNewAr(""); setNewEn(""); }}>إلغاء</Button>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── الصفحة الرئيسية للمنيو ──────────────────────────────────────────────────
const Menu: React.FC = () => {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [restaurantId, setRestaurantId] = useState("");

  const { categories, reload: reloadCategories } = useCategories(restaurantId);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    if (!user.restaurant_id) return;
    setRestaurantId(user.restaurant_id);
    const subscription = subscribeToMenuItems(user.restaurant_id, (data) => {
      setMenuItems(data);
      setLoading(false);
    });
    return () => { subscription.unsubscribe(); };
  }, []);

  // التصنيفات المستخدمة فعلاً في الأصناف (للفلتر)
  const usedCategories = ["all", ...new Set(
    menuItems.map(item => item.category_ar || item.category).filter(Boolean)
  )];
  // نرتّبها حسب ترتيب menu_categories
  const orderedFilterCats = [
    "all",
    ...categories.filter(c => usedCategories.includes(c.name)).map(c => c.name),
    ...usedCategories.filter(u => u !== "all" && !categories.find(c => c.name === u)),
  ];

  const filteredItems = menuItems.filter((item) => {
    const nameAr = item.name_ar || item.name || "";
    const nameEn = item.name || "";
    const matchesSearch = nameAr.toLowerCase().includes(searchTerm.toLowerCase()) ||
      nameEn.toLowerCase().includes(searchTerm.toLowerCase());
    const itemCat = item.category_ar || item.category;
    const matchesCategory = categoryFilter === "all" || itemCat === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const handleToggleAvailability = async (item: MenuItem) => {
    await toggleMenuItemAvailability(item.id, !item.is_available);
  };

  if (loading) return <Loading text="جاري تحميل المنيو..." />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-text mb-2">إدارة المنيو</h2>
          <p className="text-text-secondary">إدارة أصناف المنيو والتوفر</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            icon={<Tag className="w-4 h-4" />}
            onClick={() => setShowCategoryManager(true)}
          >
            إدارة التصنيفات
          </Button>
          <Button icon={<Plus className="w-5 h-5" />} onClick={() => setShowAddModal(true)}>
            إضافة صنف
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2 text-sm text-success">
        <div className="w-2 h-2 bg-success rounded-full animate-pulse" />
        <span>تحديث مباشر • تغييرات التوفر تظهر للعملاء فوراً</span>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <Input placeholder="البحث في الأصناف..." value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)} icon={<Search className="w-5 h-5" />} />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {orderedFilterCats.map((category) => (
            <button key={category} onClick={() => setCategoryFilter(category || "all")}
              className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                categoryFilter === category
                  ? "bg-accent text-white"
                  : "bg-white border border-border text-text-secondary hover:bg-bg-subtle"
              }`}>
              {category === "all" ? "كل الأصناف" : category}
            </button>
          ))}
        </div>
      </div>

      {/* Items */}
      {filteredItems.length === 0 ? (
        <Card className="text-center py-12">
          <Package className="w-16 h-16 text-text-secondary mx-auto mb-4 opacity-50" />
          <h3 className="text-xl font-semibold text-text mb-2">لا توجد أصناف</h3>
          <p className="text-text-secondary mb-4">
            {searchTerm || categoryFilter !== "all" ? "جرّب تعديل الفلاتر" : "ابدأ بإضافة أول صنف في المنيو"}
          </p>
          <Button icon={<Plus className="w-5 h-5" />} onClick={() => setShowAddModal(true)}>إضافة أول صنف</Button>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredItems.map((item) => (
            <Card key={item.id} className={`hover:shadow-lg transition-shadow ${!item.is_available ? "opacity-60" : ""}`}>
              <div className="flex flex-col lg:flex-row gap-4">
                {item.image_url && (
                  <LazyImage
                    src={item.image_url?.startsWith('http') ? item.image_url : `${import.meta.env.VITE_CLOUDINARY_BASE_URL}/${item.image_url}`}
                    alt={item.name_ar || item.name}
                    width={256}
                    quality={80}
                    className="w-full lg:w-32 rounded-lg"
                    skeletonClass="h-32"
                  />
                )}
                <div className="flex-1 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-bold text-text">{item.name_ar || item.name}</h3>
                        {item.name && item.name_ar && (
                          <span className="text-sm text-text-secondary">({item.name})</span>
                        )}
                        <Badge variant={item.is_available ? "success" : "neutral"}>
                          {item.is_available ? "متاح" : "غير متاح"}
                        </Badge>
                      </div>
                      {(item.category_ar || item.category) && (
                        <Badge variant="neutral" className="text-xs">{item.category_ar || item.category}</Badge>
                      )}
                    </div>
                  </div>
                  {(item.description_ar || item.description) && (
                    <p className="text-text-secondary text-sm">{item.description_ar || item.description}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-4 text-sm">
                    <div>
                      <span className="text-text-secondary">السعر الأساسي: </span>
                      <span className="text-accent font-semibold text-lg">{formatCurrency(item.base_price)}</span>
                    </div>
                    {item.sizes && item.sizes.length > 0 && (
                      <div>
                        <span className="text-text-secondary">الأحجام: </span>
                        <span className="text-text">{item.sizes.map((s) => s.name_ar || s.name).join("، ")}</span>
                      </div>
                    )}
                    {item.addons && item.addons.length > 0 && (
                      <div>
                        <span className="text-text-secondary">إضافات: </span>
                        <span className="text-text">{item.addons.length} متاحة</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex lg:flex-col gap-2 lg:min-w-[160px]">
                  <Button size="sm" variant={item.is_available ? "outline" : "secondary"}
                    icon={item.is_available ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    onClick={() => handleToggleAvailability(item)} fullWidth>
                    {item.is_available ? "تعيين غير متاح" : "تعيين متاح"}
                  </Button>
                  <Button size="sm" variant="outline" icon={<Edit className="w-4 h-4" />}
                    onClick={() => { setSelectedItem(item); setShowEditModal(true); }} fullWidth>تعديل</Button>
                  <Button size="sm" variant="outline" icon={<Trash2 className="w-4 h-4" />}
                    onClick={() => { setSelectedItem(item); setShowDeleteModal(true); }} fullWidth>حذف</Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modals */}
      <CategoryManagerModal
        isOpen={showCategoryManager}
        onClose={() => setShowCategoryManager(false)}
        restaurantId={restaurantId}
        categories={categories}
        onReload={reloadCategories}
      />
      <MenuItemModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        mode="add"
        categories={categories}
        restaurantId={restaurantId}
        onCategoriesChange={reloadCategories}
      />
      <MenuItemModal
        isOpen={showEditModal}
        item={selectedItem}
        onClose={() => { setShowEditModal(false); setSelectedItem(null); }}
        mode="edit"
        categories={categories}
        restaurantId={restaurantId}
        onCategoriesChange={reloadCategories}
      />
      <DeleteModal
        isOpen={showDeleteModal}
        item={selectedItem}
        onClose={() => { setShowDeleteModal(false); setSelectedItem(null); }}
      />
    </div>
  );
};

// ─── Modal إضافة/تعديل صنف ───────────────────────────────────────────────────
interface MenuItemModalProps {
  isOpen: boolean;
  item?: MenuItem | null;
  onClose: () => void;
  mode: "add" | "edit";
  categories: Category[];
  restaurantId: string;
  onCategoriesChange: () => void;
}

const MenuItemModal: React.FC<MenuItemModalProps> = ({
  isOpen, item, onClose, mode, categories, restaurantId, onCategoriesChange,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    name: "", name_ar: "",
    description: "", description_ar: "",
    category: "", category_ar: "",
    base_price: "", image_url: "", is_available: true,
    sizes: [] as { name: string; name_ar?: string; price: number }[],
    addons: [] as { name: string; name_ar?: string; price: number }[],
  });
  const [newSize, setNewSize] = useState({ name: "", name_ar: "", price: "" });
  const [newAddon, setNewAddon] = useState({ name: "", name_ar: "", price: "" });

  useEffect(() => {
    if (mode === "edit" && item) {
      setFormData({
        name: item.name || "", name_ar: item.name_ar || "",
        description: item.description || "", description_ar: item.description_ar || "",
        category: item.category || "", category_ar: item.category_ar || "",
        base_price: item.base_price.toString(), image_url: item.image_url || "",
        is_available: item.is_available,
        sizes: item.sizes || [], addons: item.addons || [],
      });
    } else {
      setFormData({ name: "", name_ar: "", description: "", description_ar: "", category: "", category_ar: "", base_price: "", image_url: "", is_available: true, sizes: [], addons: [] });
    }
  }, [mode, item, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!formData.name_ar || !formData.base_price) {
      setError("اسم الصنف (عربي) والسعر مطلوبان"); return;
    }
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    if (!user.restaurant_id) { setError("لم يتم العثور على معرّف المطعم"); return; }
    setLoading(true);
    const menuItemData = {
      restaurant_id: user.restaurant_id,
      name: formData.name || formData.name_ar,
      name_ar: formData.name_ar || undefined,
      description: formData.description || undefined,
      description_ar: formData.description_ar || undefined,
      category: formData.category || undefined,
      category_ar: formData.category_ar || undefined,
      base_price: parseFloat(formData.base_price),
      image_url: formData.image_url || undefined,
      is_available: formData.is_available,
      sizes: formData.sizes.length > 0 ? formData.sizes : undefined,
      addons: formData.addons.length > 0 ? formData.addons : undefined,
    };
    let success = false; let errorMessage = "";
    if (mode === "add") {
      const result = await createMenuItem(menuItemData);
      success = result.success;
      if (result.error) errorMessage = result.error.message;
    } else if (item) {
      const result = await updateMenuItem(item.id, menuItemData);
      success = result.success;
      if (result.error) errorMessage = result.error.message;
    }
    setLoading(false);
    if (success) onClose();
    else setError(errorMessage || (mode === "add" ? "فشل إضافة الصنف" : "فشل تعديل الصنف"));
  };

  const addSize = () => {
    if (newSize.name_ar && newSize.price) {
      setFormData({ ...formData, sizes: [...formData.sizes, { name: newSize.name || newSize.name_ar, name_ar: newSize.name_ar, price: parseFloat(newSize.price) }] });
      setNewSize({ name: "", name_ar: "", price: "" });
    }
  };
  const addAddon = () => {
    if (newAddon.name_ar && newAddon.price) {
      setFormData({ ...formData, addons: [...formData.addons, { name: newAddon.name || newAddon.name_ar, name_ar: newAddon.name_ar, price: parseFloat(newAddon.price) }] });
      setNewAddon({ name: "", name_ar: "", price: "" });
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={mode === "add" ? "إضافة صنف" : "تعديل الصنف"} size="lg">
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && <Alert type="error" message={error} />}

        <div className="grid sm:grid-cols-2 gap-4">
          <Input label="اسم الصنف (عربي) *" value={formData.name_ar} onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })} placeholder="مثال: بيتزا مارغريتا" required />
          <Input label="Item Name (English)" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="e.g., Margherita Pizza" />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <Textarea label="الوصف (عربي)" value={formData.description_ar} onChange={(e) => setFormData({ ...formData, description_ar: e.target.value })} placeholder="وصف الصنف..." rows={2} />
          <Textarea label="Description (English)" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Describe your item..." rows={2} />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          {/* Dropdown التصنيف */}
          <CategorySelect
            categories={categories}
            valueAr={formData.category_ar}
            valueEn={formData.category}
            onChange={(ar, en) => setFormData({ ...formData, category_ar: ar, category: en })}
            restaurantId={restaurantId}
            onCategoriesChange={onCategoriesChange}
          />
          <Input label="السعر الأساسي (ج.م)" type="number" step="0.01" value={formData.base_price}
            onChange={(e) => setFormData({ ...formData, base_price: e.target.value })} placeholder="0.00" required />
        </div>

        <ImageUpload
          currentUrl={formData.image_url}
          onUpload={(url) => setFormData({ ...formData, image_url: url })}
          onRemove={() => setFormData({ ...formData, image_url: "" })}
          label="صورة الصنف (اختياري)"
        />

        {/* Sizes */}
        <div>
          <label className="label mb-3">الأحجام (اختياري)</label>
          <div className="space-y-2 mb-3">
            {formData.sizes.map((size, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-bg-subtle rounded-lg">
                <span className="text-text">{size.name_ar || size.name} / {size.name} — {formatCurrency(size.price)}</span>
                <button type="button" onClick={() => setFormData({ ...formData, sizes: formData.sizes.filter((_, i) => i !== index) })} className="text-error hover:bg-error/10 p-1 rounded"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Input placeholder="اسم الحجم (عربي)" value={newSize.name_ar} onChange={(e) => setNewSize({ ...newSize, name_ar: e.target.value })} />
            <Input placeholder="Size Name (EN)" value={newSize.name} onChange={(e) => setNewSize({ ...newSize, name: e.target.value })} />
            <Input placeholder="السعر" type="number" step="0.01" value={newSize.price} onChange={(e) => setNewSize({ ...newSize, price: e.target.value })} />
          </div>
          <Button type="button" onClick={addSize} variant="outline" className="mt-2">+ إضافة حجم</Button>
        </div>

        {/* Addons */}
        <div>
          <label className="label mb-3">الإضافات (اختياري)</label>
          <div className="space-y-2 mb-3">
            {formData.addons.map((addon, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-bg-subtle rounded-lg">
                <span className="text-text">{addon.name_ar || addon.name} / {addon.name} — +{formatCurrency(addon.price)}</span>
                <button type="button" onClick={() => setFormData({ ...formData, addons: formData.addons.filter((_, i) => i !== index) })} className="text-error hover:bg-error/10 p-1 rounded"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Input placeholder="اسم الإضافة (عربي)" value={newAddon.name_ar} onChange={(e) => setNewAddon({ ...newAddon, name_ar: e.target.value })} />
            <Input placeholder="Addon Name (EN)" value={newAddon.name} onChange={(e) => setNewAddon({ ...newAddon, name: e.target.value })} />
            <Input placeholder="السعر" type="number" step="0.01" value={newAddon.price} onChange={(e) => setNewAddon({ ...newAddon, price: e.target.value })} />
          </div>
          <Button type="button" onClick={addAddon} variant="outline" className="mt-2">+ إضافة</Button>
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={formData.is_available}
            onChange={(e) => setFormData({ ...formData, is_available: e.target.checked })} className="rounded border-border" />
          <span className="text-text">متاح للطلب</span>
        </label>

        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={onClose} fullWidth>إلغاء</Button>
          <Button type="submit" loading={loading} fullWidth>{mode === "add" ? "إضافة الصنف" : "حفظ التغييرات"}</Button>
        </div>
      </form>
    </Modal>
  );
};

// ─── Modal حذف صنف ───────────────────────────────────────────────────────────
const DeleteModal: React.FC<{ isOpen: boolean; item: MenuItem | null; onClose: () => void }> = ({ isOpen, item, onClose }) => {
  const [loading, setLoading] = useState(false);
  const handleDelete = async () => {
    if (!item) return;
    setLoading(true);
    await deleteMenuItem(item.id);
    setLoading(false);
    onClose();
  };
  if (!item) return null;
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="حذف الصنف" size="md">
      <div className="space-y-4">
        <Alert type="warning" message={`هل أنت متأكد من حذف "${item.name_ar || item.name}"؟ لا يمكن التراجع عن هذا الإجراء.`} />
        <div className="flex gap-3">
          <Button variant="outline" onClick={onClose} fullWidth>إلغاء</Button>
          <Button variant="danger" onClick={handleDelete} loading={loading} fullWidth>حذف الصنف</Button>
        </div>
      </div>
    </Modal>
  );
};

export default Menu;

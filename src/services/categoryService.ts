import { supabase } from "../config/supabase";

export interface Category {
  id: string;
  restaurant_id: string;
  name: string;          // عربي
  name_en?: string;      // إنجليزي (نخزّنه في description مؤقتاً)
  display_order: number;
  is_active: boolean;
  created_at: string;
}

// جلب كل تصنيفات مطعم
export const fetchCategories = async (restaurantId: string): Promise<Category[]> => {
  const { data, error } = await supabase
    .from("menu_categories")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .eq("is_active", true)
    .order("display_order", { ascending: true });

  if (error) return [];
  // نعيد استخدام حقل description لتخزين الاسم الإنجليزي
  return (data || []).map((row: any) => ({
    ...row,
    name_en: row.description || "",
  }));
};

// إضافة تصنيف جديد
export const createCategory = async (
  restaurantId: string,
  name: string,
  name_en: string
): Promise<{ success: boolean; data?: Category; error?: any }> => {
  // نحسب آخر display_order
  const { data: existing } = await supabase
    .from("menu_categories")
    .select("display_order")
    .eq("restaurant_id", restaurantId)
    .order("display_order", { ascending: false })
    .limit(1);

  const nextOrder = existing && existing.length > 0 ? (existing[0].display_order + 1) : 0;

  const { data, error } = await supabase
    .from("menu_categories")
    .insert([{
      restaurant_id: restaurantId,
      name: name.trim(),
      description: name_en.trim(), // نستخدم description للاسم الإنجليزي
      display_order: nextOrder,
      is_active: true,
    }])
    .select()
    .single();

  if (error) return { success: false, error };
  return { success: true, data: { ...data, name_en: data.description || "" } };
};

// تعديل تصنيف
export const updateCategory = async (
  categoryId: string,
  name: string,
  name_en: string
): Promise<{ success: boolean; error?: any }> => {
  const { error } = await supabase
    .from("menu_categories")
    .update({ name: name.trim(), description: name_en.trim() })
    .eq("id", categoryId);

  return { success: !error, error };
};

// حذف تصنيف (مع تحويل أصنافه لبلا تصنيف)
export const deleteCategory = async (
  restaurantId: string,
  categoryId: string,
  categoryName: string
): Promise<{ success: boolean; error?: any }> => {
  // نحدّث الأصناف التابعة لهذا التصنيف لتفريغ category و category_ar
  // نستخدم OR condition للبحث في كلا الحقلين
  await supabase
    .from("menu_items")
    .update({ category: null, category_ar: null })
    .eq("restaurant_id", restaurantId)
    .or(`category.eq.${categoryName},category_ar.eq.${categoryName}`);

  const { error } = await supabase
    .from("menu_categories")
    .delete()
    .eq("id", categoryId);

  return { success: !error, error };
};

// تحديث ترتيب التصنيفات
export const reorderCategories = async (
  categories: { id: string; display_order: number }[]
): Promise<void> => {
  await Promise.all(
    categories.map(({ id, display_order }) =>
      supabase.from("menu_categories").update({ display_order }).eq("id", id)
    )
  );
};

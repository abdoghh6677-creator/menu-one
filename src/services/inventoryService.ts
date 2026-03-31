import { supabase } from "../config/supabase";

// ─── Types ────────────────────────────────────────────────────────────────────
export interface SimpleStock {
  id: string;
  name: string;
  name_ar?: string;
  category_ar?: string;
  category?: string;
  track_inventory: boolean;
  stock_quantity: number | null;
  min_stock_alert: number;
  is_available: boolean;
  base_price: number;
  image_url?: string;
}

export interface Ingredient {
  id: string;
  restaurant_id: string;
  name: string;
  unit: string;
  current_qty: number;
  min_qty: number;
  cost_per_unit: number | null;
  supplier_name: string | null;
  created_at: string;
}

export interface ItemIngredient {
  id: string;
  menu_item_id: string;
  ingredient_id: string;
  qty_per_unit: number;
  ingredient?: Ingredient;
}

export interface InventoryMovement {
  id: string;
  ingredient_id: string | null;
  menu_item_id: string | null;
  movement_type: "in" | "out" | "adjust" | "order_deduct";
  qty: number;
  note: string | null;
  created_at: string;
}

// ─── Simple Stock (per menu item) ────────────────────────────────────────────
export const fetchSimpleStock = async (restaurantId: string): Promise<SimpleStock[]> => {
  const { data, error } = await supabase
    .from("menu_items")
    .select("id,name,name_ar,category,category_ar,track_inventory,stock_quantity,min_stock_alert,is_available,base_price,image_url")
    .eq("restaurant_id", restaurantId)
    .order("category_ar", { ascending: true });
  if (error) return [];
  return (data || []).map(d => ({
    ...d,
    track_inventory: d.track_inventory ?? false,
    stock_quantity: d.stock_quantity ?? null,
    min_stock_alert: d.min_stock_alert ?? 5,
  }));
};

export const updateSimpleStock = async (
  itemId: string,
  track: boolean,
  qty: number | null,
  minAlert: number
) => {
  const { error } = await supabase.from("menu_items").update({
    track_inventory: track,
    stock_quantity: track ? qty : null,
    min_stock_alert: minAlert,
    is_available: track && qty !== null ? qty > 0 : undefined,
  }).eq("id", itemId);
  return !error;
};

export const adjustSimpleStock = async (
  itemId: string, delta: number, note: string, restaurantId: string, userId: string
) => {
  const { data: item } = await supabase
    .from("menu_items").select("stock_quantity,min_stock_alert").eq("id", itemId).single();
  if (!item) return false;

  const newQty = Math.max(0, (item.stock_quantity ?? 0) + delta);
  const { error } = await supabase.from("menu_items").update({
    stock_quantity: newQty,
    is_available: newQty > 0,
  }).eq("id", itemId);

  if (!error) {
    await supabase.from("inventory_movements").insert({
      restaurant_id: restaurantId,
      menu_item_id: itemId,
      movement_type: delta > 0 ? "in" : "out",
      qty: Math.abs(delta),
      note,
      created_by: userId,
    });
  }
  return !error;
};

// ─── Ingredients ─────────────────────────────────────────────────────────────
export const fetchIngredients = async (restaurantId: string): Promise<Ingredient[]> => {
  const { data, error } = await supabase
    .from("inventory_ingredients")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("name");
  return error ? [] : (data || []);
};

export const createIngredient = async (
  restaurantId: string, ingredient: Omit<Ingredient, "id" | "restaurant_id" | "created_at">
) => {
  const { data, error } = await supabase.from("inventory_ingredients")
    .insert({ restaurant_id: restaurantId, ...ingredient }).select().single();
  return { success: !error, data, error };
};

export const updateIngredient = async (id: string, updates: Partial<Ingredient>) => {
  const { error } = await supabase.from("inventory_ingredients")
    .update({ ...updates, updated_at: new Date().toISOString() }).eq("id", id);
  return !error;
};

export const deleteIngredient = async (id: string) => {
  const { error } = await supabase.from("inventory_ingredients").delete().eq("id", id);
  return !error;
};

export const adjustIngredient = async (
  ingredientId: string, delta: number, note: string,
  restaurantId: string, userId: string
) => {
  const { data } = await supabase
    .from("inventory_ingredients").select("current_qty").eq("id", ingredientId).single();
  if (!data) return false;

  const newQty = Math.max(0, data.current_qty + delta);
  const { error } = await supabase.from("inventory_ingredients")
    .update({ current_qty: newQty, updated_at: new Date().toISOString() }).eq("id", ingredientId);

  if (!error) {
    await supabase.from("inventory_movements").insert({
      restaurant_id: restaurantId,
      ingredient_id: ingredientId,
      movement_type: delta > 0 ? "in" : "out",
      qty: Math.abs(delta),
      note, created_by: userId,
    });
  }
  return !error;
};

// ─── Item ↔ Ingredients (Recipe) ─────────────────────────────────────────────
export const fetchItemIngredients = async (menuItemId: string): Promise<ItemIngredient[]> => {
  const { data, error } = await supabase
    .from("item_ingredients")
    .select("*, ingredient:inventory_ingredients(*)")
    .eq("menu_item_id", menuItemId);
  return error ? [] : (data || []);
};

export const upsertItemIngredient = async (
  menuItemId: string, ingredientId: string, qtyPerUnit: number
) => {
  const { error } = await supabase.from("item_ingredients")
    .upsert({ menu_item_id: menuItemId, ingredient_id: ingredientId, qty_per_unit: qtyPerUnit },
             { onConflict: "menu_item_id,ingredient_id" });
  return !error;
};

export const deleteItemIngredient = async (id: string) => {
  const { error } = await supabase.from("item_ingredients").delete().eq("id", id);
  return !error;
};

// ─── Low stock alerts ────────────────────────────────────────────────────────
export const getLowStockItems = async (restaurantId: string) => {
  const [simpleRes, ingRes] = await Promise.all([
    supabase.from("menu_items")
      .select("id,name,name_ar,stock_quantity,min_stock_alert")
      .eq("restaurant_id", restaurantId)
      .eq("track_inventory", true)
      .not("stock_quantity", "is", null),
    supabase.from("inventory_ingredients")
      .select("id,name,current_qty,min_qty,unit")
      .eq("restaurant_id", restaurantId),
  ]);

  const lowSimple = (simpleRes.data || []).filter(
    (i: any) => i.stock_quantity <= (i.min_stock_alert ?? 5)
  );
  const lowIng = (ingRes.data || []).filter(
    (i: any) => i.current_qty <= i.min_qty
  );
  return { lowSimple, lowIng };
};

// ─── Movements log ────────────────────────────────────────────────────────────
export const fetchMovements = async (
  restaurantId: string, limit = 50
): Promise<InventoryMovement[]> => {
  const { data, error } = await supabase
    .from("inventory_movements")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return error ? [] : (data || []);
};

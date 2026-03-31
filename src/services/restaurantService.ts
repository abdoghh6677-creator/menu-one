import { supabase } from "../config/supabase";
import type { Order, MenuItem } from "../config/supabase";
import type { StaffPermissions } from "../utils/session";

/**
 * Restaurant API Service
 * All restaurant dashboard operations with real-time support
 */

// Subscribe to restaurant's orders with real-time updates
export const subscribeToOrders = (
  restaurantId: string,
  callback: (orders: Order[]) => void,
  onNewOrder?: (order: Order) => void
) => {
  let previousOrderCount = 0;

  const fetchOrders = async () => {
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .order("created_at", { ascending: false });

    if (!error && data) {
      // تحقق من طلبات جديدة
      if (data.length > previousOrderCount && previousOrderCount > 0) {
        // طلب جديد
        const newOrders = data.slice(0, data.length - previousOrderCount);
        newOrders.forEach(order => {
          if (onNewOrder) onNewOrder(order);
        });
      }
      previousOrderCount = data.length;
      callback(data);
    }
  };

  fetchOrders();

  const subscription = supabase
    .channel(`restaurant-orders-${restaurantId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "orders",
        filter: `restaurant_id=eq.${restaurantId}`,
      },
      () => {
        fetchOrders();
      }
    )
    .subscribe();

  // Fallback polling every 5 seconds
  const pollingInterval = setInterval(fetchOrders, 5000);

  // Return object with unsubscribe method to clean up both
  return {
    unsubscribe: () => {
      subscription.unsubscribe();
      clearInterval(pollingInterval);
    }
  };
};

// Update order items and notes
export const updateOrderItems = async (
  orderId: string,
  items: any[],
  customerNotes?: string
) => {
  // حساب المجاميع الجديدة
  const subtotal = items.reduce((sum, item) => sum + (item.item_total * item.quantity), 0);
  const tax = 0; // يمكن تعديل حسب المتطلبات
  const total = subtotal + tax;

  const { error } = await supabase
    .from("orders")
    .update({
      items,
      subtotal,
      tax,
      total,
      customer_notes: customerNotes,
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId);

  return !error;
};

// Update order status
export const updateOrderStatus = async (
  orderId: string,
  status: string,
  paymentData?: {
    paymentMethod?: string;
    transactionId?: string;
  },
  notes?: string
) => {
  const updateData: any = { status };

  if (paymentData) {
    updateData.payment_method = paymentData.paymentMethod;
    updateData.payment_transaction_id = paymentData.transactionId;
  }

  if (notes) {
    updateData.internal_notes = notes;
  }

  const { error } = await supabase
    .from("orders")
    .update(updateData)
    .eq("id", orderId);

  return !error;
};

// Subscribe to menu items with real-time updates
export const subscribeToMenuItems = (
  restaurantId: string,
  callback: (items: MenuItem[]) => void
) => {
  const fetchItems = async () => {
    const { data, error } = await supabase
      .from("menu_items")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .order("created_at", { ascending: false });

    if (!error && data) {
      callback(data);
    }
  };

  fetchItems();

  const subscription = supabase
    .channel(`restaurant-menu-${restaurantId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "menu_items",
        filter: `restaurant_id=eq.${restaurantId}`,
      },
      () => {
        fetchItems();
      }
    )
    .subscribe();

  return subscription;
};

// Create menu item
export const createMenuItem = async (item: Partial<MenuItem>) => {
  const { data, error } = await supabase
    .from("menu_items")
    .insert([item])
    .select()
    .single();

  return { success: !error, data, error };
};

// Update menu item
export const updateMenuItem = async (
  itemId: string,
  updates: Partial<MenuItem>
) => {
  const { data, error } = await supabase
    .from("menu_items")
    .update(updates)
    .eq("id", itemId)
    .select()
    .single();

  return { success: !error, data, error };
};

// Toggle menu item availability (triggers real-time update for customers)
export const toggleMenuItemAvailability = async (
  itemId: string,
  isAvailable: boolean
) => {
  const { error } = await supabase
    .from("menu_items")
    .update({ is_available: isAvailable })
    .eq("id", itemId);

  return !error;
};

// Delete menu item
export const deleteMenuItem = async (itemId: string) => {
  const { error } = await supabase.from("menu_items").delete().eq("id", itemId);

  return !error;
};

// Create order (manual or from customer)
export const createOrder = async (order: Partial<Order>) => {
  const { data, error } = await supabase
    .from("orders")
    .insert([order])
    .select()
    .single();

  return { data, error };
};

// Get restaurant stats
export const getRestaurantStats = async (restaurantId: string) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const weekAgo = new Date(today);
    weekAgo.setDate(today.getDate() - 7);

    const monthAgo = new Date(today);
    monthAgo.setDate(today.getDate() - 30);

    const [
      { data: todayOrders },
      { data: pendingOrders },
      { count: totalOrders },
      { data: weekOrders },
      { data: monthOrders },
      { data: allOrders },
      { data: menuItems },
    ] = await Promise.all([
      supabase
        .from("orders")
        .select("total, status, created_at, items")
        .eq("restaurant_id", restaurantId)
        .gte("created_at", today.toISOString()),
      supabase
        .from("orders")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .eq("status", "pending"),
      supabase
        .from("orders")
        .select("*", { count: "exact", head: true })
        .eq("restaurant_id", restaurantId),
      supabase
        .from("orders")
        .select("total, status, created_at")
        .eq("restaurant_id", restaurantId)
        .gte("created_at", weekAgo.toISOString()),
      supabase
        .from("orders")
        .select("total, status, created_at")
        .eq("restaurant_id", restaurantId)
        .gte("created_at", monthAgo.toISOString()),
      supabase
        .from("orders")
        .select("total, status, created_at, items, customer_name, customer_phone")
        .eq("restaurant_id", restaurantId)
        .order("created_at", { ascending: false })
        .limit(1000),
      supabase
        .from("menu_items")
        .select("id, name, name_ar, category, category_ar")
        .eq("restaurant_id", restaurantId)
        .eq("is_available", true),
    ]);

    const completedToday =
      todayOrders?.filter((o) => o.status === "completed").length || 0;
    const revenueToday =
      todayOrders
        ?.filter((o) => o.status === "completed")
        .reduce((sum, o) => sum + (o.total || 0), 0) || 0;

    // إحصائيات إضافية
    const completedWeek = weekOrders?.filter((o) => o.status === "completed") || [];
    const revenueWeek = completedWeek.reduce((sum, o) => sum + (o.total || 0), 0);

    const completedMonth = monthOrders?.filter((o) => o.status === "completed") || [];
    const revenueMonth = completedMonth.reduce((sum, o) => sum + (o.total || 0), 0);

    // متوسط قيمة الطلب
    const avgOrderValue = allOrders && allOrders.length > 0
      ? allOrders.filter(o => o.status === "completed").reduce((sum, o) => sum + (o.total || 0), 0) / allOrders.filter(o => o.status === "completed").length
      : 0;

    // أكثر الأصناف طلباً
    const itemCounts: { [key: string]: number } = {};
    allOrders?.forEach(order => {
      if (order.status === "completed" && order.items) {
        order.items.forEach((item: any) => {
          const itemId = item.menu_item_id || item.id;
          itemCounts[itemId] = (itemCounts[itemId] || 0) + (item.quantity || 1);
        });
      }
    });

    const topItems = Object.entries(itemCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([itemId, count]) => {
        const menuItem = menuItems?.find(item => item.id === itemId);
        return {
          name: menuItem?.name_ar || menuItem?.name || "غير معروف",
          count
        };
      });

    // توزيع حالات الطلبات
    const statusCounts = {
      pending: 0,
      accepted: 0,
      preparing: 0,
      ready: 0,
      completed: 0,
      cancelled: 0,
      rejected: 0,
    };

    allOrders?.forEach(order => {
      const status = order.status as keyof typeof statusCounts;
      if (statusCounts[status] !== undefined) {
        statusCounts[status]++;
      }
    });

    // أوقات الذروة
    const hourCounts: { [key: number]: number } = {};
    allOrders?.forEach(order => {
      const hour = new Date(order.created_at).getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });

    const peakHours = Object.entries(hourCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([hour, count]) => ({
        hour: parseInt(hour),
        count
      }));

    // الفئات الأكثر شعبية
    const categoryCounts: { [key: string]: number } = {};
    allOrders?.forEach(order => {
      if (order.status === "completed" && order.items) {
        order.items.forEach((item: any) => {
          const itemId = item.menu_item_id || item.id;
          const menuItem = menuItems?.find(mi => mi.id === itemId);
          if (menuItem) {
            const category = menuItem.category_ar || menuItem.category || "غير مصنف";
            categoryCounts[category] = (categoryCounts[category] || 0) + (item.quantity || 1);
          }
        });
      }
    });

    const popularCategories = Object.entries(categoryCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([category, count]) => ({ category, count }));

    // معدل الاحتفاظ بالعملاء (نسبة العملاء الذين طلبوا أكثر من مرة)
    const customerOrders: { [key: string]: number } = {};
    allOrders?.forEach(order => {
      if (order.customer_phone) {
        customerOrders[order.customer_phone] = (customerOrders[order.customer_phone] || 0) + 1;
      }
    });

    const totalCustomers = Object.keys(customerOrders).length;
    const returningCustomers = Object.values(customerOrders).filter(count => count > 1).length;
    const customerRetention = totalCustomers > 0 ? (returningCustomers / totalCustomers) * 100 : 0;

    // متوسط وقت التحضير (افتراضي - يمكن تحسينه لاحقاً)
    const avgPreparationTime = 25; // دقائق

    return {
      pendingOrders: pendingOrders?.length || 0,
      completedToday,
      revenueToday,
      totalOrders: totalOrders || 0,
      revenueWeek,
      revenueMonth,
      avgOrderValue,
      topItems,
      statusDistribution: statusCounts,
      peakHours,
      popularCategories,
      customerRetention,
      avgPreparationTime,
    };
  } catch (error) {
    console.error("Error fetching restaurant stats:", error);
    return {
      pendingOrders: 0,
      completedToday: 0,
      revenueToday: 0,
      totalOrders: 0,
      revenueWeek: 0,
      revenueMonth: 0,
      avgOrderValue: 0,
      topItems: [],
      statusDistribution: {
        pending: 0,
        accepted: 0,
        preparing: 0,
        ready: 0,
        completed: 0,
        cancelled: 0,
        rejected: 0,
      },
      peakHours: [],
      popularCategories: [],
      customerRetention: 0,
      avgPreparationTime: 0,
    };
  }
};

// =====================================================
// Promotions Service
// =====================================================

export interface Promotion {
  id: string;
  restaurant_id: string;
  title: string;
  title_ar?: string;
  description?: string;
  description_ar?: string;
  image_url: string;
  is_active: boolean;
  starts_at?: string;
  ends_at?: string;
  display_duration_seconds: number;

  // Discount settings
  discount_percent?: number; // 0-100
  apply_to?: "all" | "item"; // applies to all menu items or a single item
  menu_item_id?: string; // when apply_to === "item"

  created_at: string;
}

// جلب العروض النشطة للعملاء
export const getActivePromotions = async (restaurantId: string): Promise<Promotion[]> => {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("promotions")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .eq("is_active", true)
    .or(`ends_at.is.null,ends_at.gt.${now}`)
    .order("created_at", { ascending: false });

  if (error) return [];
  return data || [];
};

// جلب كل عروض المطعم (للوحة التحكم)
export const getRestaurantPromotions = async (restaurantId: string): Promise<Promotion[]> => {
  const { data, error } = await supabase
    .from("promotions")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("created_at", { ascending: false });

  if (error) return [];
  return data || [];
};

// إضافة عرض
export const createPromotion = async (promotion: Partial<Promotion>): Promise<boolean> => {
  const { error } = await supabase.from("promotions").insert([promotion]);
  return !error;
};

// تحديث عرض
export const updatePromotion = async (id: string, updates: Partial<Promotion>): Promise<boolean> => {
  const { error } = await supabase.from("promotions").update(updates).eq("id", id);
  return !error;
};

// حذف عرض
export const deletePromotion = async (id: string): Promise<boolean> => {
  const { error } = await supabase.from("promotions").delete().eq("id", id);
  return !error;
};

// تفعيل/إيقاف عرض
export const togglePromotion = async (id: string, isActive: boolean): Promise<boolean> => {
  const { error } = await supabase.from("promotions").update({ is_active: isActive }).eq("id", id);
  return !error;
};

// ==================== إدارة الموظفين (بدون صلاحيات) ====================

// الحصول على جميع موظفي المطعم (جميع المستخدمين النشطين)
export const getAllStaff = async (): Promise<any[]> => {
  const { data, error } = await supabase
    .from("users")
    .select("id, full_name, email, role")
    .eq("is_active", true)
    .order("full_name");

  if (error) {
    console.error("Error fetching staff:", error);
    return [];
  }

  return data || [];
};

// الحصول على قائمة المستخدمين الذين يمكن إضافتهم كموظفين
export const getAvailableUsersForStaff = async (): Promise<any[]> => {
  // جميع المستخدمين النشطين (بما أنه لا يوجد نظام صلاحيات)
  const { data, error } = await supabase
    .from("users")
    .select("id, full_name, email")
    .eq("is_active", true)
    .order("full_name");

  if (error) {
    console.error("Error fetching available users:", error);
    return [];
  }

  return data || [];
};

// إضافة موظف (لا يوجد صلاحيات، فقط تأكيد أنه مستخدم نشط)
export const addStaffMember = async (userId: string): Promise<boolean> => {
  // لا نحتاج لفعل شيء محدد، المستخدم نشط بالفعل
  console.log('Staff member added (no permissions system):', userId);
  return true;
};

// حذف موظف (تعطيل المستخدم)
export const removeStaffMember = async (userId: string): Promise<boolean> => {
  const { error } = await supabase
    .from("users")
    .update({ is_active: false })
    .eq("id", userId);

  if (error) {
    console.error("Error removing staff member:", error);
    return false;
  }

  console.log('Staff member removed (deactivated):', userId);
  return true;
};

// التحقق من صلاحية (دائماً true بما أنه لا يوجد نظام صلاحيات)
export const checkPermission = async (
  restaurantId: string,
  userId: string,
  permission: string
): Promise<boolean> => {
  // بدون نظام صلاحيات، جميع الموظفين لديهم جميع الصلاحيات
  return true;
};

export interface InventoryItem {
  id: string;
  restaurant_id: string;
  menu_item_id: string;
  item_name: string;
  current_stock: number;
  minimum_stock: number;
  unit: string;
  cost_price?: number;
  supplier_name?: string;
  last_restocked_at?: string;
  auto_deduct: boolean;
  low_stock_alert: boolean;
  created_at: string;
  updated_at: string;
}

// الحصول على جميع عناصر المخزون للمطعم
export const getInventoryItems = async (restaurantId: string): Promise<InventoryItem[]> => {
  const { data, error } = await supabase
    .from("inventory")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("item_name");

  if (error) {
    console.error("Error fetching inventory items:", error);
    return [];
  }

  return data || [];
};

// الحصول على عنصر مخزون واحد
export const getInventoryItem = async (inventoryId: string): Promise<InventoryItem | null> => {
  const { data, error } = await supabase
    .from("inventory")
    .select("*")
    .eq("id", inventoryId)
    .single();

  if (error) {
    console.error("Error fetching inventory item:", error);
    return null;
  }

  return data;
};

// إضافة عنصر مخزون جديد
export const createInventoryItem = async (item: Partial<InventoryItem>): Promise<{ success: boolean; data?: InventoryItem; error?: any }> => {
  const { data, error } = await supabase
    .from("inventory")
    .insert([item])
    .select()
    .single();

  return { success: !error, data, error };
};

// تحديث عنصر مخزون
export const updateInventoryItem = async (
  inventoryId: string,
  updates: Partial<InventoryItem>
): Promise<boolean> => {
  const { error } = await supabase
    .from("inventory")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", inventoryId);

  return !error;
};

// حذف عنصر مخزون
export const deleteInventoryItem = async (inventoryId: string): Promise<boolean> => {
  const { error } = await supabase
    .from("inventory")
    .delete()
    .eq("id", inventoryId);

  return !error;
};

// تحديث مخزون متعدد العناصر (للتعبئة الجماعية)
export const bulkUpdateInventory = async (
  restaurantId: string,
  updates: Array<{
    menu_item_id: string;
    current_stock: number;
    minimum_stock?: number;
    cost_price?: number;
    supplier_name?: string;
  }>
): Promise<boolean> => {
  try {
    const { error } = await supabase.rpc('bulk_update_inventory', {
      p_restaurant_id: restaurantId,
      p_updates: updates
    });

    return !error;
  } catch (error) {
    console.error("Error bulk updating inventory:", error);
    return false;
  }
};

// الحصول على تنبيهات المخزون المنخفض
export const getLowStockAlerts = async (restaurantId: string): Promise<Array<{
  menu_item_id: string;
  item_name: string;
  current_stock: number;
  minimum_stock: number;
  unit: string;
}>> => {
  try {
    const { data, error } = await supabase.rpc('get_low_stock_alerts', {
      p_restaurant_id: restaurantId
    });

    if (error) {
      console.error("Error fetching low stock alerts:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("Error in getLowStockAlerts:", error);
    return [];
  }
};

// تفعيل/إيقاف تتبع المخزون لعنصر قائمة
export const toggleInventoryTracking = async (
  menuItemId: string,
  trackInventory: boolean,
  initialStock?: number
): Promise<boolean> => {
  // تحديث menu_items
  const menuUpdate = await supabase
    .from("menu_items")
    .update({
      track_inventory: trackInventory,
      stock_quantity: initialStock || 0
    })
    .eq("id", menuItemId);

  if (!menuUpdate.error && trackInventory && initialStock !== undefined) {
    // إذا كان التتبع مفعل والمخزون الأولي محدد، أنشئ سجل مخزون
    const { data: menuItem } = await supabase
      .from("menu_items")
      .select("restaurant_id, name")
      .eq("id", menuItemId)
      .single();

    if (menuItem) {
      await supabase
        .from("inventory")
        .upsert({
          restaurant_id: menuItem.restaurant_id,
          menu_item_id: menuItemId,
          item_name: menuItem.name,
          current_stock: initialStock,
          minimum_stock: 5, // افتراضي
          unit: 'قطعة',
          auto_deduct: true,
          low_stock_alert: true
        });
    }
  }

  return !menuUpdate.error;
};

// الحصول على إحصائيات المخزون
export const getInventoryStats = async (restaurantId: string) => {
  try {
    const { data: inventory, error } = await supabase
      .from("inventory")
      .select("current_stock, minimum_stock, cost_price")
      .eq("restaurant_id", restaurantId);

    if (error) {
      console.error("Error fetching inventory stats:", error);
      return {
        totalItems: 0,
        lowStockItems: 0,
        totalValue: 0,
        outOfStockItems: 0
      };
    }

    const totalItems = inventory?.length || 0;
    const lowStockItems = inventory?.filter(item => item.current_stock <= item.minimum_stock).length || 0;
    const outOfStockItems = inventory?.filter(item => item.current_stock <= 0).length || 0;
    const totalValue = inventory?.reduce((sum, item) =>
      sum + (item.current_stock * (item.cost_price || 0)), 0) || 0;

    return {
      totalItems,
      lowStockItems,
      totalValue,
      outOfStockItems
    };
  } catch (error) {
    console.error("Error in getInventoryStats:", error);
    return {
      totalItems: 0,
      lowStockItems: 0,
      totalValue: 0,
      outOfStockItems: 0
    };
  }
};

// الاشتراك في تحديثات المخزون (real-time)
export const subscribeToInventory = (
  restaurantId: string,
  callback: (items: InventoryItem[]) => void
) => {
  const fetchInventory = async () => {
    const items = await getInventoryItems(restaurantId);
    callback(items);
  };

  fetchInventory();

  const subscription = supabase
    .channel(`restaurant-inventory-${restaurantId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "inventory",
        filter: `restaurant_id=eq.${restaurantId}`,
      },
      () => {
        fetchInventory();
      }
    )
    .subscribe();

  return subscription;
};

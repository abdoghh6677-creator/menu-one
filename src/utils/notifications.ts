// =====================================================
// إشعارات الطلبات الجديدة - صوتية + Push
// =====================================================

// Shared AudioContext for all beep functions
let sharedAudioContext: AudioContext | null = null;

const getAudioContext = (): AudioContext => {
  if (!sharedAudioContext) {
    sharedAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return sharedAudioContext;
};

const unlockAudioContext = async (): Promise<void> => {
  const ctx = getAudioContext();
  if (ctx.state === 'suspended') {
    await ctx.resume();
  }
};

// Unlock AudioContext on first user interaction
if (typeof document !== 'undefined') {
  document.addEventListener('click', unlockAudioContext, { once: true });
  document.addEventListener('touchstart', unlockAudioContext, { once: true });
}

/** طلب إذن الإشعارات */
export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const result = await Notification.requestPermission();
  return result === "granted";
};

/** إشعار صوتي */
export const playNotificationSound = async (): Promise<void> => {
  try {
    const audioContext = getAudioContext();
    
    // استئناف السياق إذا كان معلقاً
    if (audioContext.state === 'suspended') {
      await audioContext.resume();
    }
    
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.setValueAtTime(800, audioContext.currentTime); // تردد
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
  } catch (error) {
    // fallback: لا شيء
    console.warn('Audio not supported');
  }
};

/** إرسال إشعار محلي عبر Service Worker */
export const sendLocalNotification = async (options: {
  title: string;
  body: string;
  orderId?: string;
  url?: string;
}): Promise<void> => {
  if (!("serviceWorker" in navigator)) return;
  try {
    const registration = await navigator.serviceWorker.ready;
    if (registration.active) {
      registration.active.postMessage({
        type: "LOCAL_NOTIFICATION",
        ...options,
      });
    }
  } catch (err) {
    // fallback: إشعار عادي
    if (Notification.permission === "granted") {
      new Notification(options.title, { body: options.body, icon: "/icons/icon-192.png" });
    }
  }
};

/** إشعار طلب جديد مع صوت */
export const notifyNewOrder = async (orderNumber: string, orderType: string): Promise<void> => {
  const typeLabels: Record<string, string> = {
    qr: "داخل المطعم",
    counter: "استلام",
    phone: "توصيل",
    table: "طاولة",
  };
  const label = typeLabels[orderType] || orderType;

  // تشغيل الصوت
  await playNotificationSound();

  // إرسال الإشعار
  await sendLocalNotification({
    title: `🔔 طلب جديد - #${orderNumber}`,
    body: `نوع الطلب: ${label} — اضغط للعرض`,
    url: "/restaurant/orders",
  });
};

/** إرسال تفاصيل الطلب عبر واتساب */
export const sendOrderViaWhatsApp = (order: any, restaurantName?: string, whatsappNumber?: string): void => {
  if (!whatsappNumber) {
    alert("لم يتم تحديد رقم واتساب للمطعم");
    return;
  }

  // تنسيق تفاصيل الطلب
  const orderTypeLabels: Record<string, string> = {
    qr: "داخل المطعم",
    counter: "استلام من الفرع",
    phone: "توصيل",
    table: "طاولة",
  };

  const statusLabels: Record<string, string> = {
    pending: "معلق",
    accepted: "مقبول",
    preparing: "قيد التحضير",
    ready: "جاهز",
    completed: "مكتمل",
    cancelled: "ملغي",
    rejected: "مرفوض",
  };

  let message = `🔔 *طلب جديد - إشعار للمطعم*\n\n`;
  message += `🏪 *المطعم:* ${restaurantName || "مطعمنا"}\n`;
  message += `📋 *رقم الطلب:* #${order.order_number}\n`;
  message += `📅 *التاريخ:* ${new Date(order.created_at).toLocaleString('ar-EG', {
    timeZone: 'Africa/Cairo',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })}\n`;
  message += `📍 *نوع الطلب:* ${orderTypeLabels[order.order_type] || order.order_type}\n`;

  if (order.table_number) {
    message += `🪑 *الطاولة:* ${order.table_number}\n`;
  }

  if (order.customer_name) {
    message += `👤 *اسم العميل:* ${order.customer_name}\n`;
  }

  if (order.customer_phone) {
    message += `📞 *هاتف العميل:* ${order.customer_phone}\n`;
  }

  message += `📊 *الحالة:* ${statusLabels[order.status] || order.status}\n\n`;

  message += `🛒 *الأصناف المطلوبة:*\n`;
  if (order.items && Array.isArray(order.items)) {
    order.items.forEach((item: any, index: number) => {
      message += `${index + 1}. ${item.name}`;
      if (item.selected_size) {
        message += ` (${item.selected_size.name})`;
      }
      message += ` - ${item.quantity}×${item.item_total} ج.م\n`;

      if (item.selected_addons && item.selected_addons.length > 0) {
        message += `   إضافات: ${item.selected_addons.map((a: any) => a.name).join(", ")}\n`;
      }
    });
  }

  message += `\n💰 *المجموع:* ${order.subtotal} ج.م\n`;
  if (order.tax) {
    message += `💸 *الضريبة:* ${order.tax} ج.م\n`;
  }
  if (order.discount && order.discount > 0) {
    message += `🎁 *الخصم:* -${order.discount} ج.م\n`;
  }
  message += `💵 *الإجمالي:* ${order.total} ج.م\n\n`;

  if (order.customer_notes) {
    message += `📝 *ملاحظات العميل:* ${order.customer_notes}\n\n`;
  }

  message += `⚡ *يرجى التحقق من الطلب وتأكيد الاستلام!*`;

  // تنظيف رقم الهاتف
  const phoneNumber = whatsappNumber.replace(/\D/g, '');

  // إنشاء رابط واتساب
  const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;

  // فتح واتساب في نافذة جديدة
  window.open(whatsappUrl, '_blank');
};

/** صوت الإشعار */
export const playNotificationBeep = async (): Promise<void> => {
  try {
    const ctx = getAudioContext();
    
    // استئناف السياق إذا كان معلقاً
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }
    
    const playBeep = (freq: number, start: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = "sine";
      gain.gain.setValueAtTime(0.4, ctx.currentTime + start);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + duration);
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + duration);
    };
    // 3 نغمات متصاعدة لطلب جديد
    playBeep(440, 0, 0.2);
    playBeep(550, 0.25, 0.2);
    playBeep(660, 0.5, 0.3);
  } catch {
    // تجاهل لو المتصفح لا يدعمه
  }
};

/** صوت تأكيد (للقبول أو الإكمال) */
export const playSuccessBeep = async (): Promise<void> => {
  try {
    const ctx = getAudioContext();
    
    // استئناف السياق إذا كان معلقاً
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }
    
    const playBeep = (freq: number, start: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = "sine";
      gain.gain.setValueAtTime(0.3, ctx.currentTime + start);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + duration);
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + duration);
    };
    // نغمتان متساويتان للتأكيد
    playBeep(523, 0, 0.2);
    playBeep(659, 0.25, 0.2);
  } catch {
    // تجاهل لو المتصفح لا يدعمه
  }
};

/** صوت تحذير (للإلغاء) */
export const playWarningBeep = async (): Promise<void> => {
  try {
    const ctx = getAudioContext();
    
    // استئناف السياق إذا كان معلقاً
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }
    
    const playBeep = (freq: number, start: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = "triangle";
      gain.gain.setValueAtTime(0.3, ctx.currentTime + start);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + duration);
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + duration);
    };
    // نغمة منخفضة للتحذير
    playBeep(220, 0, 0.4);
  } catch {
    // تجاهل لو المتصفح لا يدعمه
  }
};

/** فحص حالة الإذن */
export const getNotificationStatus = (): "granted" | "denied" | "default" | "unsupported" => {
  if (!("Notification" in window)) return "unsupported";
  return Notification.permission;
};

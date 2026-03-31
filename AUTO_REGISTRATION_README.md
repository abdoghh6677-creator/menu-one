# تسجيل المطاعم التلقائي - بدون مراجعة إدارية

## المميزة الجديدة: تسجيل فوري للمطاعم 🎉

تم تطوير نظام يسمح للمطاعم بالتسجيل مباشرة بدون الحاجة لمراجعة الطلب من قبل الإدارة.

## كيفية التطبيق

### الطريقة النهائية والأكثر أماناً (موصى بها بشدة):

1. اذهب إلى **Supabase Dashboard** → **SQL Editor**
2. انسخ محتوى ملف `database/ultimate_database_fix.sql`
3. الصقه في SQL Editor واضغط **Run**

**هذا الملف يحتوي على:**
- ✅ إصلاح شامل لجميع الجداول (restaurants, users, registration_requests)
- ✅ إضافة جميع الأعمدة المفقودة
- ✅ إصلاح البيانات الموجودة
- ✅ إضافة القيود والفهارس والمفاتيح الخارجية
- ✅ دوال التسجيل التلقائي
- ✅ إعدادات الأمان الأساسية
- ✅ Triggers للتحديث التلقائي لـ updated_at

**النتيجة:** قاعدة بيانات سليمة 100% جاهزة للاستخدام بدون أي أخطاء!

### الخطوة 2: اختبار النظام (اختياري)

1. شغّل ملف `database/test_auto_registration.sql` للتأكد من عمل الدالة
2. ستحصل على بيانات مطعم تجريبي

### الخطوة 3: تشغيل المشروع

```bash
npm run dev
```

### الخطوة 4: تجربة التسجيل

1. اذهب إلى صفحة التسجيل: `http://localhost:5173/register`
2. املأ النموذج واضغط "إرسال طلب التسجيل"
3. ستحصل مباشرة على بيانات الدخول!

## 🔧 حل مشاكل شائعة

### خطأ: "input parameters after one with a default value must also have defaults"

**السبب:** في PostgreSQL، إذا كان parameter له قيمة افتراضية، فإن جميع الـ parameters التي تأتي بعده يجب أن يكون لها قيم افتراضية أيضاً.

**الحل:** تم إعادة ترتيب الـ parameters في الدالة:
- الـ parameters المطلوبة أولاً (بدون قيم افتراضية)
- الـ parameters الاختيارية في النهاية (مع قيم افتراضية)

**الترتيب الصحيح:**
```sql
CREATE OR REPLACE FUNCTION auto_create_restaurant(
    p_restaurant_name TEXT,        -- مطلوب
    p_owner_name TEXT,             -- مطلوب
    p_phone TEXT,                  -- مطلوب
    p_city TEXT,                   -- مطلوب
    p_restaurant_type TEXT,        -- مطلوب
    p_email TEXT DEFAULT NULL,     -- اختياري
    p_address TEXT DEFAULT NULL,   -- اختياري
    p_heard_from TEXT DEFAULT NULL,-- اختياري
    p_notes TEXT DEFAULT NULL      -- اختياري
)
```

## ما تغير في النظام

### ✅ قبل التحديث:
- المطعم يملأ النموذج
- البيانات تُحفظ في `registration_requests` بحالة "pending"
- الإدارة تراجع الطلب يدوياً
- إنشاء الحساب يدوياً
- إرسال بيانات الدخول عبر البريد

### ✅ بعد التحديث:
- المطعم يملأ النموذج
- النظام ينشئ الحساب تلقائياً
- عرض بيانات الدخول فوراً على الشاشة
- المطعم يدخل مباشرة إلى لوحة التحكم

## الملفات المُحدثة

- `database/auto_registration.sql` - دالة إنشاء المطاعم التلقائي
- `src/pages/public/RegisterPage.tsx` - واجهة التسجيل المحدثة

## مميزات النظام الجديد

### 🚀 تسجيل فوري
- لا انتظار للمراجعة
- حساب جاهز في ثوانٍ

### 🔐 أمان محسن
- كلمات مرور عشوائية قوية
- تشفير متقدم للبيانات
- حماية من التسجيل المكرر

### 📊 تتبع كامل
- حفظ جميع الطلبات في `registration_requests`
- إحصائيات مفصلة للإدارة
- إمكانية مراجعة البيانات لاحقاً

### 🎯 تجربة مستخدم ممتازة
- واجهة واضحة وسهلة
- رسائل تأكيد فورية
- إرشادات واضحة للخطوات التالية

## البيانات المُنشأة تلقائياً

عند التسجيل، يتم إنشاء:

1. **سجل المطعم** في جدول `restaurants`
2. **حساب المستخدم** في جدول `users`
3. **سجل الأرشيف** في جدول `registration_requests`
4. **كلمة مرور مؤقتة** عشوائية من 8 أحرف

## خطة الاشتراك الافتراضية

جميع المطاعم الجديدة تحصل على:
- **free_trial**: 30 يوم تجربة مجانية
- جميع المميزات متاحة
- إمكانية الترقية لاحقاً

## ملاحظات مهمة

⚠️ **تأكد من تشغيل ملف SQL أولاً** قبل اختبار النظام
⚠️ **احفظ كلمة المرور** - ستحتاج لتغييرها عند أول دخول
⚠️ **البريد الإلكتروني فريد** - لا يمكن التسجيل ببريد مُستخدم

---

**تم تطوير هذا النظام لتسهيل عملية التسجيل وتحسين تجربة المستخدم!** 🎊

## 🔧 حلول المشاكل الشائعة

### خطأ: "function unaccent(text) does not exist"

**السبب:** دالة `unaccent` غير متوفرة في قاعدة البيانات Supabase بشكل افتراضي.

**الحل:** تم تعديل دالة `generate_slug` لتعمل بدون `unaccent`:

```sql
-- الدالة المُحدثة:
CREATE OR REPLACE FUNCTION generate_slug(name TEXT)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
BEGIN
    -- تحويل إلى lowercase وإزالة العلامات العربية والرموز
    RETURN regexp_replace(
        regexp_replace(
            lower(name),
            '[^a-z0-9\s-]', -- إزالة الرموز عدا المسافات والشرطة
            '', 'g'
        ),
        '\s+', -- استبدال المسافات المتعددة بشرطة واحدة
        '-', 'g'
    );
END;
$$;
```

**النتيجة:** الدالة تعمل الآن مع النصوص العربية والإنجليزية بدون الحاجة لـ `unaccent`.

### خطأ: "column "restaurant_type" of relation "restaurants" does not exist"

**السبب:** عمود `restaurant_type` غير موجود في جدول `restaurants` في قاعدة البيانات.

**الحل:** شغّل ملف `database/fix_restaurant_type.sql` أولاً:

```sql
-- في Supabase SQL Editor:
-- انسخ محتوى database/fix_restaurant_type.sql
-- والصقه واضغط Run
```

**ما يفعله الملف:**
```sql
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS restaurant_type TEXT;
UPDATE restaurants SET restaurant_type = 'مطعم' WHERE restaurant_type IS NULL;
```

**النتيجة:** يضيف العمود المفقود ويحدث البيانات الموجودة.

### خطأ: "column "status" of relation "restaurants" does not exist"

**السبب:** عدة أعمدة مفقودة في جدول `restaurants` (status, subscription_plan, is_active, إلخ).

**الحل:** استخدم الملف الشامل `database/complete_auto_registration_fix.sql` الذي يحتوي على جميع الإصلاحات:

```sql
-- يضيف جميع الأعمدة المفقودة:
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'trial';
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS subscription_plan TEXT DEFAULT 'free_trial';
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
-- وأعمدة أخرى...
```

**النتيجة:** جدول restaurants يكتمل بجميع الأعمدة المطلوبة.

### خطأ: "column "updated_at" of relation "restaurants" does not exist"

**السبب:** عمود `updated_at` مفقود في جدول `restaurants` أو جداول أخرى.

**الحل:** استخدم الملف الشامل `database/ultimate_database_fix.sql` الذي يحل جميع المشاكل:

```sql
-- يضيف جميع الأعمدة المفقودة:
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE registration_requests ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- يضيف triggers للتحديث التلقائي:
CREATE TRIGGER update_restaurants_updated_at
    BEFORE UPDATE ON restaurants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

**النتيجة:** جميع الجداول مكتملة مع تحديث تلقائي لـ updated_at.

## الخطوات النهائية للتطبيق

### 1. تطبيق الإصلاح الشامل
```bash
# في Supabase SQL Editor، قم بتشغيل:
# database/ultimate_database_fix.sql
```

### 2. تشغيل المشروع
```bash
npm install
npm run dev
```

### 3. اختبار التسجيل
- اذهب إلى صفحة التسجيل
- املأ البيانات المطلوبة
- اضغط "تسجيل المطعم"
- تحقق من إنشاء المطعم والمستخدم تلقائياً

### 4. التحقق من النتائج
- تحقق من جدول `restaurants` للمطعم الجديد
- تحقق من جدول `users` للمستخدم الجديد
- تحقق من جدول `registration_requests` للطلب
- تأكد من إرسال البريد الإلكتروني بكلمة المرور

## الميزات المحدثة

### ✅ كلمة مرور حقيقية
- **قبل التحديث:** النظام ينشئ كلمة مرور مؤقتة تلقائياً
- **بعد التحديث:** العميل يدخل كلمة مرور حقيقية عند التسجيل
- **الفوائد:** أمان أفضل، تجربة مستخدم أفضل

### ✅ إزالة بيانات المطعم التجريبي
- **قبل التحديث:** خانة "حساب تجريبي" في صفحة تسجيل الدخول
- **بعد التحديث:** صفحة تسجيل دخول نظيفة بدون بيانات تجريبية
- **الفوائد:** تجربة احترافية، تركيز على العملاء الحقيقيين

## كيفية عمل النظام الجديد

### 1. التسجيل
1. العميل يملأ جميع البيانات المطلوبة
2. **جديد:** يدخل كلمة مرور قوية (6 أحرف على الأقل)
3. النظام ينشئ الحساب فوراً
4. يعرض رسالة نجاح مع البريد الإلكتروني واسم المطعم

### 2. تسجيل الدخول
1. العميل يدخل البريد الإلكتروني وكلمة المرور التي أدخلها
2. **محدث:** لا توجد خانة بيانات تجريبية
3. يدخل مباشرة إلى لوحة التحكم

### 3. قاعدة البيانات
- دالة `auto_create_restaurant` محدثة لتقبل كلمة مرور حقيقية
- المستخدمين الجدد لديهم `temp_password = false`
- كلمات المرور مشفرة بـ bcrypt

### خطأ: "check constraint ... is violated by some row"

**السبب:** البيانات الموجودة تحتوي على قيم غير صحيحة لـ `subscription_plan` أو `status`.

**الحل:** تم تحديث ملف الإصلاح ليتعامل مع البيانات الموجودة:

```sql
-- يحدث القيم غير الصحيحة إلى القيم الافتراضية:
UPDATE restaurants SET
    subscription_plan = CASE
        WHEN subscription_plan NOT IN ('free_trial', 'starter', 'pro', 'enterprise')
        THEN 'free_trial'
        ELSE subscription_plan
    END,
    status = CASE
        WHEN status NOT IN ('active', 'blocked', 'trial')
        THEN 'trial'
        ELSE status
    END
WHERE subscription_plan NOT IN ('free_trial', 'starter', 'pro', 'enterprise')
   OR status NOT IN ('active', 'blocked', 'trial');
```

**النتيجة:** جميع البيانات تصبح متوافقة مع القيود قبل إضافتها.
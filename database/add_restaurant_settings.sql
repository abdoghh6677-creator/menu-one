-- إضافة حقول جديدة لإعدادات المطعم
-- شغّل هذا في Supabase SQL Editor

-- إضافة حقول معلومات المطعم
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS website TEXT;

-- إضافة حقول الصور
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS cover_url TEXT;

-- إضافة حقل ساعات العمل (JSON)
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS business_hours JSONB DEFAULT '{
  "monday": {"open": "09:00", "close": "22:00", "closed": false},
  "tuesday": {"open": "09:00", "close": "22:00", "closed": false},
  "wednesday": {"open": "09:00", "close": "22:00", "closed": false},
  "thursday": {"open": "09:00", "close": "22:00", "closed": false},
  "friday": {"open": "09:00", "close": "22:00", "closed": false},
  "saturday": {"open": "09:00", "close": "22:00", "closed": false},
  "sunday": {"open": "09:00", "close": "22:00", "closed": false}
}'::jsonb;

-- إنشاء bucket للصور إذا لم يكن موجوداً
INSERT INTO storage.buckets (id, name, public)
VALUES ('restaurant-images', 'restaurant-images', true)
ON CONFLICT (id) DO NOTHING;

-- حذف الـ policies القديمة إذا كانت موجودة
DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;
DROP POLICY IF EXISTS "Public Access" ON storage.objects;

-- إعطاء صلاحيات الوصول للصور
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'restaurant-images');
CREATE POLICY "Allow image uploads" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'restaurant-images');
CREATE POLICY "Allow image updates" ON storage.objects FOR UPDATE USING (bucket_id = 'restaurant-images');
CREATE POLICY "Allow image deletes" ON storage.objects FOR DELETE USING (bucket_id = 'restaurant-images');

-- إعادة تحميل الـ schema
NOTIFY pgrst, 'reload schema';

DO $$ BEGIN
  RAISE NOTICE '✅ تم إضافة حقول الإعدادات الجديدة بنجاح!';
END $$;
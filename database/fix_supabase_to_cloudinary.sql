-- Fix Supabase URLs to Cloudinary URLs in menu_items
UPDATE menu_items
SET image_url = 'https://res.cloudinary.com/dpjxle26o/image/upload/' || split_part(image_url, '/', -1)
WHERE image_url LIKE 'https://ujxwbcsxeoprekzzkyuz.supabase.co/storage/v1/object/public/%';

-- Fix Supabase URLs to Cloudinary URLs in promotions
UPDATE promotions
SET image_url = 'https://res.cloudinary.com/dpjxle26o/image/upload/' || split_part(image_url, '/', -1)
WHERE image_url LIKE 'https://ujxwbcsxeoprekzzkyuz.supabase.co/storage/v1/object/public/%';
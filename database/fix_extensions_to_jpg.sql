-- Fix Supabase URLs to Cloudinary URLs with correct extension (.jpg)
UPDATE menu_items
SET image_url = 'https://res.cloudinary.com/dpjxle26o/image/upload/' || regexp_replace(split_part(image_url, '/', -1), '\.[^.]+$', '.jpg')
WHERE image_url LIKE 'https://ujxwbcsxeoprekzzkyuz.supabase.co/storage/v1/object/public/%';

-- Fix Supabase URLs to Cloudinary URLs with correct extension (.jpg) for promotions
UPDATE promotions
SET image_url = 'https://res.cloudinary.com/dpjxle26o/image/upload/' || regexp_replace(split_part(image_url, '/', -1), '\.[^.]+$', '.jpg')
WHERE image_url LIKE 'https://ujxwbcsxeoprekzzkyuz.supabase.co/storage/v1/object/public/%';
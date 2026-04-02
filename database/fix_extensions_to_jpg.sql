-- Fix Supabase URLs to Cloudinary URLs with correct extension (.jpg)
UPDATE menu_items
SET image_url = 'https://res.cloudinary.com/dpjxle26o/image/upload/' || regexp_replace(split_part(image_url, '/', -1), '\.[^.]+$', '.jpg')
WHERE image_url LIKE 'https://ujxwbcsxeoprekzzkyuz.supabase.co/storage/v1/object/public/%';

-- Fix Supabase URLs to Cloudinary URLs with correct extension (.jpg) for promotions
UPDATE promotions
SET image_url = 'https://res.cloudinary.com/dpjxle26o/image/upload/' || regexp_replace(split_part(image_url, '/', -1), '\.[^.]+$', '.jpg')
WHERE image_url LIKE 'https://ujxwbcsxeoprekzzkyuz.supabase.co/storage/v1/object/public/%';

-- Fix filename records to Cloudinary URLs with .jpg extension
UPDATE menu_items
SET image_url = 'https://res.cloudinary.com/dpjxle26o/image/upload/' || regexp_replace(image_url, '\.[^.]+$', '.jpg')
WHERE image_url IS NOT NULL
AND image_url NOT LIKE 'http%';

-- Fix filename records to Cloudinary URLs with .jpg extension for promotions
UPDATE promotions
SET image_url = 'https://res.cloudinary.com/dpjxle26o/image/upload/' || regexp_replace(image_url, '\.[^.]+$', '.jpg')
WHERE image_url IS NOT NULL
AND image_url NOT LIKE 'http%';

-- Fix existing Cloudinary URLs to have .jpg extension
UPDATE menu_items
SET image_url = regexp_replace(image_url, '\.[^.]+$', '.jpg')
WHERE image_url LIKE 'https://res.cloudinary.com/dpjxle26o/image/upload/%'
AND image_url NOT LIKE '%.jpg';

-- Fix existing Cloudinary URLs to have .jpg extension for promotions
UPDATE promotions
SET image_url = regexp_replace(image_url, '\.[^.]+$', '.jpg')
WHERE image_url LIKE 'https://res.cloudinary.com/dpjxle26o/image/upload/%'
AND image_url NOT LIKE '%.jpg';
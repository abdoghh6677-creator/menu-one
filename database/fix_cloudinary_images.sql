-- Fix old database records for Cloudinary images
-- Update menu_items table
UPDATE menu_items
SET image_url = 'https://res.cloudinary.com/dpjxle26o/image/upload/' || image_url
WHERE image_url IS NOT NULL
AND image_url NOT LIKE 'http%';

-- Update promotions table
UPDATE promotions
SET image_url = 'https://res.cloudinary.com/dpjxle26o/image/upload/' || image_url
WHERE image_url IS NOT NULL
AND image_url NOT LIKE 'http%';
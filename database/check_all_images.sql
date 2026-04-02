-- Check all image_url values in menu_items
SELECT id, name, image_url
FROM menu_items
WHERE image_url IS NOT NULL AND image_url != ''
ORDER BY created_at DESC
LIMIT 10;

-- Check all image_url values in promotions
SELECT id, title, image_url
FROM promotions
WHERE image_url IS NOT NULL AND image_url != ''
ORDER BY created_at DESC
LIMIT 10;
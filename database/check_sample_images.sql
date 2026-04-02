-- Check sample image_url values from menu_items
SELECT id, name, image_url
FROM menu_items
WHERE image_url IS NOT NULL
LIMIT 5;

-- Check sample image_url values from promotions
SELECT id, title, image_url
FROM promotions
WHERE image_url IS NOT NULL
LIMIT 5;
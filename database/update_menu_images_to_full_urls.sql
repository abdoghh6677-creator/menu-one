-- Update existing menu_items to have full Cloudflare URLs
-- Replace YOUR_CLOUDFLARE_BASE_URL with your actual Cloudflare CDN URL

UPDATE menu_items
SET image_url = 'https://pub-xxxxxxxxxxxxxxxx.r2.dev/' || image_url
WHERE image_url IS NOT NULL
  AND image_url NOT LIKE 'http%';
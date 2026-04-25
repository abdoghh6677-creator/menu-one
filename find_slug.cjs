const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

// Load .env
const envPath = path.resolve(__dirname, '.env');
const envConfig = dotenv.parse(fs.readFileSync(envPath));

const supabase = createClient(envConfig.VITE_SUPABASE_URL, envConfig.VITE_SUPABASE_ANON_KEY);

async function findSlug() {
  const { data, error } = await supabase
    .from('restaurants')
    .select('slug')
    .eq('id', '92df0652-dbc4-465b-8f72-b8bfbb7de3ba')
    .single();

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Slug:', data.slug);
  }
}

findSlug();

import { createClient } from '@supabase/supabase-js';

const VITE_SUPABASE_URL = "https://ujxwbcsxeoprekzzkyuz.supabase.co";
const VITE_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVqeHdiY3N4ZW9wcmVrenpreXV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0NDU2OTAsImV4cCI6MjA4OTAyMTY5MH0.Ons3xF7n6fkmg3k6pCdfnksDK99jzfahMxzXSHragd8";

const supabase = createClient(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY);

async function findSlug() {
  const { data, error } = await supabase
    .from('restaurants')
    .select('slug, name')
    .eq('id', '92df0652-dbc4-465b-8f72-b8bfbb7de3ba')
    .single();

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Slug:', data.slug);
    console.log('Name:', data.name);
  }
}

findSlug();

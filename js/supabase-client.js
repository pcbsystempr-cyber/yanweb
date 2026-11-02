// Supabase client initialization
// Load config from window.SUPABASE_CONFIG (set by config.js)
const config = window.SUPABASE_CONFIG || {
  url: '',
  anonKey: ''
};

const supabase = window.supabase.createClient(config.url, config.anonKey);

export default supabase;
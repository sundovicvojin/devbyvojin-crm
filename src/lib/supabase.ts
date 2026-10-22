import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  throw new Error('Nedostaju VITE_SUPABASE_URL i VITE_SUPABASE_ANON_KEY u .env')
}

export const supabase = createClient<Database>(url, anonKey)

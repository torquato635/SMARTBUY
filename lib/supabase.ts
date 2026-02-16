
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bgfgiagqtzerohqvdihh.supabase.co';
const supabaseAnonKey = 'sb_publishable_OJdr6dQ-G8hQCL-as70wtA_MsaXI34Z';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || import.meta.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

console.log("Supabase URL:", supabaseUrl ? "Configurado" : "Não configurado");

if (!supabaseUrl || !supabaseKey) {
  console.warn("Supabase não configurado. Verifique o arquivo .env");
}

export const supabase = createClient(supabaseUrl || "", supabaseKey || "");
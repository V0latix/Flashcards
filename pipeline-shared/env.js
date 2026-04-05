import dotenv from "dotenv";
dotenv.config();
dotenv.config({ path: ".env.local", override: false });
if ((!process.env.SUPABASE_URL || process.env.SUPABASE_URL.trim() === "") && process.env.VITE_SUPABASE_URL) {
  process.env.SUPABASE_URL = process.env.VITE_SUPABASE_URL;
}

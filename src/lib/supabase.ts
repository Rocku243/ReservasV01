import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://rubatasuzgpwcxtrywty.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ1YmF0YXN1emdwd2N4dHJ5d3R5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc1ODYzNzAsImV4cCI6MjA5MzE2MjM3MH0.2AQGOX9munDI4CidvW9p0XXtUtHaKQzGNMbXSRkKqxo";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storage: localStorage,
  },
});

export type Conector = {
  id: number;
  numero: number;
  tipo_conector: string | null;
  ubicacion: string | null;
  estado: string | null;
};

export type Perfil = {
  id: string;
  nombre: string;
  celular: string;
  placa: string;
  tipo_cargador: "Tipo 1" | "Tipo 2";
};

export type Reserva = {
  id: number;
  conector_id: number;
  usuario_email: string;
  usuario_nombre: string;
  fecha: string;
  bloque: "mañana" | "tarde";
  estado: "activa" | "cancelada";
  created_at?: string;
};

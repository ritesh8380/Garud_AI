import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    "Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Copy .env.example to .env and fill in your project values."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export async function listConversations() {
  const { data, error } = await supabase
    .from("conversations")
    .select("*")
    .order("last_message_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function createConversation(title, mode) {
  const { data, error } = await supabase
    .from("conversations")
    .insert({ title, mode })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function toggleConversationStar(id, starred) {
  const { error } = await supabase.from("conversations").update({ starred }).eq("id", id);
  if (error) throw error;
}

export async function deleteConversation(id) {
  const { error } = await supabase.from("conversations").delete().eq("id", id);
  if (error) throw error;
}

export async function listMessages(conversationId) {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data;
}

export async function saveMessage(conversationId, type, text, files = []) {
  const { error } = await supabase
    .from("messages")
    .insert({ conversation_id: conversationId, type, text, files });
  if (error) throw error;
}
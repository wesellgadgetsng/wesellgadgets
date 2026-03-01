// supabase-config.js
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

export const SUPABASE_URL  = 'https://fezmwnerxgwghtatvway.supabase.co';
export const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlem13bmVyeGd3Z2h0YXR2d2F5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxOTAzMzYsImV4cCI6MjA4Nzc2NjMzNn0.nlM6mJAZ3c39fwE54uicXj-PC3abs6PS21MjBcOqujI';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  });
  
  /** Returns the current user's profile row (includes role) */
  export async function getMyProfile() {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return null;
  
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
  
    if (error) return null;
  
    return data;
  }

  export async function getMyRole() {
    const profile = await getMyProfile();
    return profile?.role ?? null;
  }
  
  export async function isSuperAdmin() {
    const role = await getMyRole();
    return role === 'super_admin';
  }
import { supabase } from "./supabase";

export async function signInWithEmail(email: string) {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
    },
  });
  return { error };
}

export async function verifyOtp(email: string, token: string) {
  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: "email",
  });
  return { data, error };
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  return { error };
}

export async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  return { session: data.session, error };
}

export async function getProfile() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { profile: null, error: new Error("Not authenticated") };

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return { profile: data, error };
}

export async function updateProfile(updates: {
  display_name?: string;
  avatar_url?: string;
}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: new Error("Not authenticated") };

  const { data, error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", user.id)
    .select()
    .single();

  return { profile: data, error };
}

export async function createCouple(name?: string) {
  const { data, error } = await supabase.rpc("create_couple", {
    couple_name: name ?? "Our Finances",
  });
  return { coupleId: data, error };
}

export async function joinCouple(inviteCode: string) {
  const { data, error } = await supabase.rpc("join_couple", {
    code: inviteCode,
  });
  return { coupleId: data, error };
}

export async function getInviteCode() {
  const { data, error } = await supabase
    .from("couples")
    .select("invite_code")
    .single();
  return { inviteCode: data?.invite_code, error };
}

export async function getPartnerProfile() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { partner: null, error: new Error("Not authenticated") };

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .neq("id", user.id)
    .single();

  return { partner: data, error };
}

"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";

export interface AuthActionState {
  error: string;
}

const EMAIL_RE = /^\S+@\S+\.\S+$/;
const AUTH_ATTEMPT_LIMIT = 10;
const AUTH_ATTEMPT_WINDOW_MS = 60_000;

async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0].trim() || h.get("x-real-ip") || "unknown";
}

export async function signInAction(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");

  if (!email || !EMAIL_RE.test(email)) return { error: "Enter a valid email address." };
  if (!password) return { error: "Enter your password." };

  const ip = await clientIp();
  if (!rateLimit(`signin:${ip}:${email}`, AUTH_ATTEMPT_LIMIT, AUTH_ATTEMPT_WINDOW_MS)) {
    return { error: "Too many attempts. Wait a minute and try again." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message };

  redirect("/dashboard");
}

export async function signUpAction(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");
  const confirm = String(formData.get("confirm") || "");

  if (!name) return { error: "Enter your name." };
  if (!email || !EMAIL_RE.test(email)) return { error: "Enter a valid email address." };
  if (password.length < 8) return { error: "Password must be at least 8 characters." };
  if (password !== confirm) return { error: "Passwords do not match." };

  const ip = await clientIp();
  if (!rateLimit(`signup:${ip}`, AUTH_ATTEMPT_LIMIT, AUTH_ATTEMPT_WINDOW_MS)) {
    return { error: "Too many attempts. Wait a minute and try again." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name } },
  });
  if (error) return { error: error.message };
  if (!data.session) {
    return { error: "Check your inbox to confirm your account, then log in." };
  }

  redirect("/dashboard");
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

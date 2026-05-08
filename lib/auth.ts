"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { trackEvent } from "@/lib/activity-tracker";

const STORAGE_KEY = "rova_current_user_id";

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  role: "admin" | "mentor" | "student" | "super_admin";
  mentor_id: string | null;
  avatar_url: string | null;
  classification: string | null;
  risk_tag: string | null;
  discord_handle: string | null;
  last_active_date: string;
  created_at: string;
}

export function signIn(userId: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, userId);
}

export async function signOut() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
  await supabase.auth.signOut();
}

export function getStoredUserId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(STORAGE_KEY);
}

/**
 * Sign in with Google via Supabase OAuth
 */
export async function signInWithGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: typeof window !== "undefined"
        ? `${window.location.origin}/auth/callback`
        : undefined,
    },
  });
  if (error) throw error;
}

/**
 * Sign in with email (lookup from profiles table — for existing mock users)
 */
export async function signInWithEmail(email: string) {
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("email", email.trim().toLowerCase())
    .single();

  if (!profile) return null;

  signIn(profile.id);
  trackEvent(profile.id, "login");
  return profile as Profile;
}

/**
 * After Google OAuth callback, ensure a profile exists in our profiles table.
 * If new user → create profile with role "student".
 * Returns the profile.
 */
export async function ensureProfile(): Promise<{ profile: Profile; isNewUser: boolean } | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Check if profile already exists
  const { data: existing } = await supabase
    .from("profiles")
    .select("*")
    .eq("email", user.email)
    .single();

  if (existing) {
    signIn(existing.id);
    trackEvent(existing.id, "login");
    // User cũ (LMS hoặc comay) — đảm bảo có apps_access cho comay.
    // Nếu chưa có row → insert pending (admin duyệt sau).
    // Nếu đã có row → giữ nguyên status.
    const { data: existingAccess } = await supabase
      .from("apps_access")
      .select("status")
      .eq("user_id", existing.id)
      .eq("app", "comay")
      .maybeSingle();
    if (!existingAccess) {
      await supabase.from("apps_access").insert({
        user_id: existing.id,
        app: "comay",
        status: "pending",
      });
    }
    return { profile: existing as Profile, isNewUser: false };
  }

  // Create new profile for Google user
  const givenName = user.user_metadata?.given_name || "";
  const familyName = user.user_metadata?.family_name || "";
  const fullName = familyName && givenName
    ? `${familyName} ${givenName}`
    : user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split("@")[0] || "Học viên";

  const { data: newProfile, error: insertError } = await supabase
    .from("profiles")
    .insert({
      full_name: fullName,
      email: user.email!,
      avatar_url: user.user_metadata?.avatar_url || null,
      role: "student",
      classification: "newbie",
      risk_tag: "normal",
      source: "comay",
    })
    .select()
    .single();

  if (insertError) {
    console.error("ensureProfile insert error:", insertError);
    // Profile may already exist with different casing — retry lookup
    const { data: retryProfile } = await supabase
      .from("profiles")
      .select("*")
      .ilike("email", user.email!)
      .single();
    if (retryProfile) {
      signIn(retryProfile.id);
      return { profile: retryProfile as Profile, isNewUser: false };
    }
    return null;
  }

  if (newProfile) {
    signIn(newProfile.id);
    trackEvent(newProfile.id, "login", undefined, { isNewUser: true });
    // User mới — insert apps_access với status='pending', admin duyệt sau
    await supabase.from("apps_access").insert({
      user_id: newProfile.id,
      app: "comay",
      status: "pending",
    });
    return { profile: newProfile as Profile, isNewUser: true };
  }

  return null;
}

/**
 * Hook to get the currently logged-in user from Supabase.
 * Checks: Supabase Auth session → localStorage. Returns null nếu chưa đăng nhập.
 * `_fallbackRole` arg giữ lại để tương thích call sites hiện có; không còn auto-login dev account.
 */
export function useCurrentUser(_fallbackRole: string | null = null): Profile | null {
  const [user, setUser] = useState<Profile | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      // 1. Check Supabase Auth session
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser?.email && !cancelled) {
        const { data } = await supabase
          .from("profiles")
          .select("*")
          .eq("email", authUser.email)
          .single();
        if (!cancelled && data) {
          localStorage.setItem(STORAGE_KEY, data.id);
          setUser(data as Profile);
          return;
        }
      }

      // 2. Try stored ID from localStorage (email login flow)
      const storedId = getStoredUserId();
      if (storedId) {
        const { data } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", storedId)
          .single();
        if (!cancelled && data) {
          setUser(data as Profile);
          return;
        }
        // Stored ID không hợp lệ — clear để tránh stuck
        localStorage.removeItem(STORAGE_KEY);
      }

      if (!cancelled) setUser(null);
    }

    load();

    // Listen for auth state changes (login/logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      load();
    });

    // Listen for profile-updated event (vd: avatar đổi từ ProfileEditor)
    const onProfileUpdate = () => load();
    if (typeof window !== "undefined") {
      window.addEventListener("rova:profile-updated", onProfileUpdate);
    }

    return () => {
      cancelled = true;
      subscription.unsubscribe();
      if (typeof window !== "undefined") {
        window.removeEventListener("rova:profile-updated", onProfileUpdate);
      }
    };
  }, []);

  return user;
}

"use server";

// Server actions cho MT5 monitoring integration.
// Chạy server-side để bảo vệ SUPABASE_SERVICE_ROLE_KEY + ENCRYPTION_KEY khỏi client.

import { createClient } from "@supabase/supabase-js";
import { encryptMt5Password } from "./mt5-crypto";

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Thiếu NEXT_PUBLIC_SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY trong .env.local");
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export interface Mt5LinkInput {
  userId: string;
  machineId: string;
  login: string;
  password: string;
  server: string;
}

export interface Mt5LinkResult {
  success: boolean;
  mt5AccountId?: string;
  error?: string;
}

/**
 * Link 1 MT5 account vào 1 cỗ máy.
 *
 * Flow:
 *   1. Chờ comay_machines row tồn tại (race với cloudPush fire-and-forget).
 *   2. Encrypt password bằng AES-256-GCM (key từ ENCRYPTION_KEY env).
 *   3. INSERT mt5_accounts.
 *   4. INSERT mt5_machine_links (rollback mt5_accounts nếu fail).
 *
 * KHÔNG tạo comay_machines row — caller phải tạo trước qua addMachine() / cloudPush.
 */
export async function linkMt5ToMachine(input: Mt5LinkInput): Promise<Mt5LinkResult> {
  const sb = serviceClient();

  // Step 1: chờ machine row được cloudPush.machine() đẩy lên (fire-and-forget có thể chậm)
  let machineFound = false;
  for (let attempt = 0; attempt < 6; attempt++) {
    const res = await sb
      .from("comay_machines")
      .select("id")
      .eq("id", input.machineId)
      .eq("user_id", input.userId)
      .maybeSingle();
    if (res.data) {
      machineFound = true;
      break;
    }
    // 6 lần × 400ms = chờ tối đa ~2.4s
    await new Promise((r) => setTimeout(r, 400));
  }
  if (!machineFound) {
    return {
      success: false,
      error: "Cỗ máy chưa sync lên Supabase sau 2.4s. Refresh trang rồi thử link MT5 lại.",
    };
  }

  // Step 2: encrypt
  let encryptedPassword: string;
  try {
    encryptedPassword = await encryptMt5Password(input.password);
  } catch (e) {
    return { success: false, error: `Lỗi mã hoá password: ${(e as Error).message}` };
  }

  // Step 3: insert mt5_accounts
  const accountRes = await sb
    .from("mt5_accounts")
    .insert({
      user_id: input.userId,
      login: input.login.trim(),
      server: input.server.trim(),
      encrypted_password: encryptedPassword,
      broker_name: input.server.trim().split("-")[0] || null,
      status: "pending",
    })
    .select("id")
    .single();

  if (accountRes.error) {
    // UNIQUE (login, server) violation → user đã link cùng account trước đó
    if (accountRes.error.code === "23505") {
      return {
        success: false,
        error: `Account MT5 ${input.login}@${input.server} đã được link trước đó.`,
      };
    }
    return { success: false, error: `Insert mt5_accounts: ${accountRes.error.message}` };
  }
  const mt5AccountId = accountRes.data.id as string;

  // Step 4: insert link, rollback mt5_accounts nếu fail
  const linkRes = await sb.from("mt5_machine_links").insert({
    mt5_account_id: mt5AccountId,
    machine_id: input.machineId,
    is_primary: true,
  });
  if (linkRes.error) {
    await sb.from("mt5_accounts").delete().eq("id", mt5AccountId);
    return { success: false, error: `Insert mt5_machine_links: ${linkRes.error.message}` };
  }

  return { success: true, mt5AccountId };
}

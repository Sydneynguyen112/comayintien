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

export interface StandaloneMt5Input {
  login: string;
  password: string;
  server: string;
  nickname?: string;
}

/**
 * Link 1 MT5 account vào 1 cỗ máy (admin-only flow).
 *
 * Flow:
 *   1. Verify comay_machines row tồn tại + thuộc user_id (1 query, không retry).
 *   2. Encrypt password bằng AES-256-GCM (key từ ENCRYPTION_KEY env).
 *   3. INSERT mt5_accounts.
 *   4. INSERT mt5_machine_links (rollback mt5_accounts nếu fail).
 *
 * Error messages trả về chi tiết để admin debug được ngay tại UI.
 */
/**
 * Tạo MT5 account standalone — không link với user/machine nào.
 * Dùng cho admin test sync hoặc khi muốn xem MT5 data raw trước.
 *
 * Yêu cầu DB: chạy supabase-mt5-standalone.sql để bỏ FK + NOT NULL trên user_id.
 */
export async function createStandaloneMt5Account(
  input: StandaloneMt5Input,
): Promise<Mt5LinkResult> {
  const sb = serviceClient();

  // Encrypt password
  let encryptedPassword: string;
  try {
    encryptedPassword = await encryptMt5Password(input.password);
  } catch (e) {
    return { success: false, error: `Lỗi mã hoá password: ${(e as Error).message}` };
  }

  const accountRes = await sb
    .from("mt5_accounts")
    .insert({
      login: input.login.trim(),
      server: input.server.trim(),
      encrypted_password: encryptedPassword,
      broker_name: input.server.trim().split("-")[0] || null,
      nickname: input.nickname?.trim() || null,
      status: "pending",
    })
    .select("id")
    .single();

  if (accountRes.error) {
    const code = accountRes.error.code;
    if (code === "23505") {
      return {
        success: false,
        error: `Account MT5 ${input.login}@${input.server} đã tồn tại (UNIQUE constraint).`,
      };
    }
    if (code === "23502") {
      return {
        success: false,
        error: `Cột NOT NULL bị thiếu — có thể bạn chưa chạy supabase-mt5-standalone.sql để bỏ NOT NULL trên user_id. Raw: ${accountRes.error.message}`,
      };
    }
    return {
      success: false,
      error: `Insert mt5_accounts fail [code=${code}]: ${accountRes.error.message}${accountRes.error.hint ? ` (hint: ${accountRes.error.hint})` : ""}`,
    };
  }

  return { success: true, mt5AccountId: accountRes.data.id as string };
}

/**
 * Xoá MT5 account và toàn bộ data liên quan (trades, transactions, links).
 * Foreign key CASCADE đã set sẵn ở schema.
 */
export async function deleteMt5Account(mt5AccountId: string): Promise<{ success: boolean; error?: string }> {
  const sb = serviceClient();
  const res = await sb.from("mt5_accounts").delete().eq("id", mt5AccountId);
  if (res.error) return { success: false, error: res.error.message };
  return { success: true };
}

export async function linkMt5ToMachine(input: Mt5LinkInput): Promise<Mt5LinkResult> {
  const sb = serviceClient();

  // Step 1: verify machine — không filter user_id để debug được lý do sai
  const machineRes = await sb
    .from("comay_machines")
    .select("id, user_id, name")
    .eq("id", input.machineId)
    .maybeSingle();

  if (machineRes.error) {
    return { success: false, error: `Query comay_machines lỗi: ${machineRes.error.message}` };
  }
  if (!machineRes.data) {
    return {
      success: false,
      error: `Không tìm thấy cỗ máy có id="${input.machineId}" trong DB. Có thể máy chưa sync lên Supabase (kiểm tra Table Editor → comay_machines).`,
    };
  }
  if (machineRes.data.user_id !== input.userId) {
    return {
      success: false,
      error: `Cỗ máy "${machineRes.data.name}" thuộc user ${machineRes.data.user_id} nhưng UI đang pass user ${input.userId}. Báo dev kiểm tra.`,
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
  // Dùng machine.user_id (đã verify exists trong comay_machines) thay vì input.userId —
  // tránh edge case khi FK của mt5_accounts.user_id ref khác table (auth.users vs profiles).
  const accountRes = await sb
    .from("mt5_accounts")
    .insert({
      user_id: machineRes.data.user_id,
      login: input.login.trim(),
      server: input.server.trim(),
      encrypted_password: encryptedPassword,
      broker_name: input.server.trim().split("-")[0] || null,
      status: "pending",
    })
    .select("id")
    .single();

  if (accountRes.error) {
    // 23505 = UNIQUE violation. 23503 = FK violation. 22P02 = invalid input syntax (vd UUID vs TEXT).
    const code = accountRes.error.code;
    if (code === "23505") {
      return {
        success: false,
        error: `Account MT5 ${input.login}@${input.server} đã được link trước đó (UNIQUE constraint).`,
      };
    }
    return {
      success: false,
      error: `Insert mt5_accounts fail [code=${code}]: ${accountRes.error.message}${accountRes.error.hint ? ` (hint: ${accountRes.error.hint})` : ""}`,
    };
  }
  const mt5AccountId = accountRes.data.id as string;

  // Step 4: insert link
  const linkRes = await sb.from("mt5_machine_links").insert({
    mt5_account_id: mt5AccountId,
    machine_id: input.machineId,
    is_primary: true,
  });
  if (linkRes.error) {
    // Rollback mt5_accounts để không có row mồ côi
    await sb.from("mt5_accounts").delete().eq("id", mt5AccountId);
    const code = linkRes.error.code;
    // 22P02: machine_id column type mismatch (UUID vs TEXT — bug schema cũ)
    if (code === "22P02") {
      return {
        success: false,
        error:
          `Insert mt5_machine_links fail: cột machine_id đang là UUID, cần đổi sang TEXT. ` +
          `Chạy supabase-mt5-fix-machine-id-type.sql trong Supabase SQL Editor. ` +
          `(raw: ${linkRes.error.message})`,
      };
    }
    return {
      success: false,
      error: `Insert mt5_machine_links fail [code=${code}]: ${linkRes.error.message}${linkRes.error.hint ? ` (hint: ${linkRes.error.hint})` : ""}`,
    };
  }

  return { success: true, mt5AccountId };
}

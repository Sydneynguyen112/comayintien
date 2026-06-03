"use server";

// Server actions cho MT5 monitoring integration.
// Chạy server-side để bảo vệ SUPABASE_SERVICE_ROLE_KEY + ENCRYPTION_KEY khỏi client.

import { createClient } from "@supabase/supabase-js";
import { decryptMt5Password, encryptMt5Password } from "./mt5-crypto";

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
      // Account login@server đã tồn tại. Nếu nó KHÔNG còn gắn cỗ máy đang mở
      // (vd máy cũ đã đóng/ngắt) → TÁI SỬ DỤNG account cũ (giữ nguyên lịch sử
      // lệnh đã sync) + gắn sang máy mới. Nếu đang gắn 1 máy mở khác → báo lỗi.
      return await reclaimMt5Account(sb, machineRes.data.user_id, input, encryptedPassword);
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

/**
 * Cập nhật credentials của 1 MT5 account đã tồn tại (khách nhập sai → sửa lại).
 * Verify ownership qua mt5_machine_links → comay_machines.user_id phải khớp userId.
 * Reset status='pending', clear last_error/last_synced_at để daemon retry lại từ đầu.
 */
export interface Mt5UpdateInput {
  mt5AccountId: string;
  userId: string;
  login: string;
  password: string;
  server: string;
}

export async function updateMt5Credentials(input: Mt5UpdateInput): Promise<Mt5LinkResult> {
  const sb = serviceClient();

  // Verify account đang link tới 1 cỗ máy thuộc user này
  const linkRes = await sb
    .from("mt5_machine_links")
    .select("machine_id")
    .eq("mt5_account_id", input.mt5AccountId)
    .maybeSingle();
  if (linkRes.error) return { success: false, error: `Query link fail: ${linkRes.error.message}` };
  if (!linkRes.data) return { success: false, error: "MT5 account chưa được liên kết với cỗ máy nào." };

  const machineRes = await sb
    .from("comay_machines")
    .select("user_id")
    .eq("id", linkRes.data.machine_id)
    .maybeSingle();
  if (machineRes.error) return { success: false, error: `Query machine fail: ${machineRes.error.message}` };
  if (!machineRes.data) return { success: false, error: "Cỗ máy không tồn tại." };
  if (machineRes.data.user_id !== input.userId) {
    return { success: false, error: "Bạn không có quyền cập nhật MT5 này." };
  }

  // Encrypt password mới
  let encryptedPassword: string;
  try {
    encryptedPassword = await encryptMt5Password(input.password);
  } catch (e) {
    return { success: false, error: `Lỗi mã hoá password: ${(e as Error).message}` };
  }

  // Update + reset status để daemon retry
  const res = await sb
    .from("mt5_accounts")
    .update({
      login: input.login.trim(),
      server: input.server.trim(),
      encrypted_password: encryptedPassword,
      broker_name: input.server.trim().split("-")[0] || null,
      status: "pending",
      last_error: null,
      last_synced_at: null,
    })
    .eq("id", input.mt5AccountId);
  if (res.error) {
    const code = res.error.code;
    if (code === "23505") {
      return { success: false, error: `Account ${input.login}@${input.server} đã được dùng cho cỗ máy khác.` };
    }
    return { success: false, error: `Update fail [code=${code}]: ${res.error.message}` };
  }
  return { success: true, mt5AccountId: input.mt5AccountId };
}

/**
 * Admin: lấy password đã giải mã của 1 MT5 account để login thủ công trên MT5.
 * Server-side ONLY (cần ENCRYPTION_KEY). UI gate phải đảm bảo chỉ admin gọi được.
 */
export async function getMt5DecryptedPassword(accountId: string): Promise<{
  success: boolean;
  password?: string;
  error?: string;
}> {
  const sb = serviceClient();
  const res = await sb
    .from("mt5_accounts")
    .select("encrypted_password")
    .eq("id", accountId)
    .maybeSingle();
  if (res.error) return { success: false, error: `Query fail: ${res.error.message}` };
  if (!res.data) return { success: false, error: "Không tìm thấy MT5 account." };
  const cipher = res.data.encrypted_password as string;
  if (!cipher || cipher === "NOT_USED_FOR_EA") {
    return { success: false, error: "Account này không lưu password (vd account tạo cho EA flow)." };
  }
  try {
    const plain = await decryptMt5Password(cipher);
    return { success: true, password: plain };
  } catch (e) {
    return { success: false, error: `Decrypt fail: ${(e as Error).message}` };
  }
}

/**
 * TÁI SỬ DỤNG 1 MT5 account đã tồn tại (login@server UNIQUE) cho cỗ máy mới.
 * Gọi khi linkMt5ToMachine gặp 23505. Quy ước: 1 MT5 ↔ 1 cỗ máy đang mở.
 *   - Nếu account còn gắn 1 cỗ máy ĐANG MỞ → từ chối (đang dùng chỗ khác).
 *   - Nếu chỉ gắn máy đã đóng / mồ côi → gỡ link cũ, cập nhật creds + chủ sở hữu,
 *     reset status='pending' để daemon sync lại, rồi gắn sang máy mới.
 * Lịch sử lệnh (mt5_trades/mt5_transactions) được GIỮ NGUYÊN.
 */
async function reclaimMt5Account(
  sb: ReturnType<typeof serviceClient>,
  userId: string,
  input: Mt5LinkInput,
  encryptedPassword: string,
): Promise<Mt5LinkResult> {
  const login = input.login.trim();
  const server = input.server.trim();

  const accRes = await sb
    .from("mt5_accounts")
    .select("id")
    .eq("login", login)
    .eq("server", server)
    .maybeSingle();
  if (accRes.error || !accRes.data) {
    return {
      success: false,
      error: `Account ${login}@${server} đã tồn tại nhưng không đọc lại được để tái sử dụng${accRes.error ? `: ${accRes.error.message}` : ""}.`,
    };
  }
  const accId = accRes.data.id as string;

  // Account còn gắn cỗ máy ĐANG MỞ không?
  const linkRes = await sb
    .from("mt5_machine_links")
    .select("machine_id")
    .eq("mt5_account_id", accId);
  const linkedIds = (linkRes.data ?? []).map((l) => (l as { machine_id: string }).machine_id);
  if (linkedIds.length > 0) {
    const mRes = await sb.from("comay_machines").select("id, status").in("id", linkedIds);
    const hasOpen = (mRes.data ?? []).some((m) => (m as { status: string }).status !== "closed");
    if (hasOpen) {
      return {
        success: false,
        error: `Account ${login}@${server} đang được dùng cho một cỗ máy khác đang mở. Hãy đóng hoặc ngắt MT5 ở cỗ máy đó trước.`,
      };
    }
    // Chỉ gắn với máy đã đóng / mồ côi → gỡ link cũ để tái sử dụng.
    await sb.from("mt5_machine_links").delete().eq("mt5_account_id", accId);
  }

  const upd = await sb
    .from("mt5_accounts")
    .update({
      user_id: userId,
      encrypted_password: encryptedPassword,
      server,
      broker_name: server.split("-")[0] || null,
      status: "pending",
      last_error: null,
      last_synced_at: null,
    })
    .eq("id", accId);
  if (upd.error) {
    return { success: false, error: `Cập nhật account (reclaim) fail: ${upd.error.message}` };
  }

  const linkIns = await sb.from("mt5_machine_links").insert({
    mt5_account_id: accId,
    machine_id: input.machineId,
    is_primary: true,
  });
  if (linkIns.error) {
    const code = linkIns.error.code;
    if (code === "22P02") {
      return {
        success: false,
        error:
          "Insert mt5_machine_links fail: cột machine_id cần kiểu TEXT. Chạy supabase-mt5-fix-machine-id-type.sql.",
      };
    }
    return { success: false, error: `Gắn link (reclaim) fail [code=${code}]: ${linkIns.error.message}` };
  }
  return { success: true, mt5AccountId: accId };
}

/**
 * Ngắt MT5 khỏi 1 cỗ máy (khi ĐÓNG hẳn hoặc XOÁ máy) — GỠ LINK, GIỮ account +
 * lịch sử lệnh. Login@server được giải phóng để add sang cỗ máy khác
 * (linkMt5ToMachine sẽ reclaim account cũ). No-op nếu máy chưa link MT5.
 */
export async function unlinkMt5FromMachine(
  machineId: string,
): Promise<{ success: boolean; error?: string }> {
  const sb = serviceClient();
  const res = await sb.from("mt5_machine_links").delete().eq("machine_id", machineId);
  if (res.error) return { success: false, error: res.error.message };
  return { success: true };
}

/**
 * Chuyển MT5 từ cỗ máy cũ sang cỗ máy mới (dùng cho scale/reset — máy mới tiếp
 * nối). Re-point mt5_machine_links.machine_id. Máy mới PHẢI đã có trên
 * comay_machines (gọi pushMachineNow trước để thoả FK). No-op nếu máy cũ chưa link.
 */
export async function moveMt5ToMachine(
  fromMachineId: string,
  toMachineId: string,
): Promise<{ success: boolean; moved: boolean; error?: string }> {
  const sb = serviceClient();
  const linkRes = await sb
    .from("mt5_machine_links")
    .select("mt5_account_id")
    .eq("machine_id", fromMachineId)
    .maybeSingle();
  if (linkRes.error) return { success: false, moved: false, error: linkRes.error.message };
  if (!linkRes.data) return { success: true, moved: false };

  const upd = await sb
    .from("mt5_machine_links")
    .update({ machine_id: toMachineId })
    .eq("machine_id", fromMachineId);
  if (upd.error) {
    if (upd.error.code === "23505") {
      return { success: false, moved: false, error: "Cỗ máy mới đã có MT5 link sẵn." };
    }
    return { success: false, moved: false, error: upd.error.message };
  }
  return { success: true, moved: true };
}

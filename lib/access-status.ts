import { supabase } from "@/lib/supabase";

export type AccessStatus = "pending" | "approved" | "locked" | "none";

/**
 * Trả về trạng thái truy cập của user cho 1 app cụ thể.
 * - "approved": có quyền vào app
 * - "pending": đăng ký xong, đợi admin duyệt
 * - "locked": admin đã khoá
 * - "none": chưa từng có quyền (hoặc row đã bị xoá)
 */
export async function getAccessStatus(
  userId: string,
  app: "comay" | "lms" | "admin",
): Promise<AccessStatus> {
  const { data } = await supabase
    .from("apps_access")
    .select("status")
    .eq("user_id", userId)
    .eq("app", app)
    .maybeSingle();
  if (!data) return "none";
  return (data.status as AccessStatus) ?? "pending";
}

/**
 * Touch last_seen_at để track tần suất quay lại web (dùng cho CRM dashboard).
 */
export async function touchLastSeen(userId: string, app: "comay" | "lms" | "admin") {
  await supabase
    .from("apps_access")
    .update({ last_seen_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("app", app);
}

import type { IncomingMessage } from "http";
import { supabaseAnon, supabaseAdmin } from "./supabase";

export type UserRole = "customer" | "driver" | "operations_staff" | "admin";

export type AuthContext = {
  profile: {
    id: string;
    auth_user_id: string;
    full_name: string;
    email: string;
    phone: string | null;
    role: UserRole;
  };
  accessToken: string;
};

export function getBearerToken(req: IncomingMessage): string | null {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return null;
  }

  return header.slice(7).trim();
}

export async function requireAuth(req: IncomingMessage): Promise<AuthContext> {
  const accessToken = getBearerToken(req);
  if (!accessToken) {
    throw new Error("Unauthorized");
  }

  const { data: authData, error: authError } = await supabaseAnon.auth.getUser(accessToken);
  if (authError || !authData.user) {
    throw new Error("Unauthorized");
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("users")
    .select("id, auth_user_id, full_name, email, phone, role")
    .eq("auth_user_id", authData.user.id)
    .maybeSingle();

  if (profileError || !profile) {
    throw new Error("Unauthorized");
  }

  return { profile, accessToken };
}

export function requireRole(context: AuthContext, allowedRoles: UserRole[]) {
  if (!allowedRoles.includes(context.profile.role)) {
    throw new Error("Forbidden");
  }
}

import type { IncomingMessage, ServerResponse } from "http";
import { z } from "zod";
import { requireAuth, requireRole, type AuthContext } from "../src/lib/auth";
import { checkRateLimit } from "../src/lib/rate-limit";
import { getPathSegments, getQuery, json, parseBody, sanitizeText, setCorsHeaders } from "../src/lib/http";
import { supabaseAdmin, supabaseAnon } from "../src/lib/supabase";

const registerSchema = z.object({
  fullName: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  phone: z.string().min(8).max(20).optional(),
  role: z.enum(["customer", "driver", "operations_staff", "admin"]),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const refreshSchema = z.object({
  refresh_token: z.string().min(10),
});

const forgotPasswordSchema = z.object({
  email: z.string().email(),
  redirect_to: z.string().url().optional(),
});

const riderOtpRequestSchema = z.object({
  phone: z.string().min(10).max(20),
});

const riderOtpVerifySchema = z.object({
  phone: z.string().min(10).max(20),
  token: z.string().min(4).max(10),
});

const riderPasswordLoginSchema = z.object({
  phone: z.string().min(10).max(20),
  password: z.string().min(8),
});

const customerOtpRequestSchema = z.object({
  phone: z.string().min(10).max(20),
});

const customerOtpVerifySchema = z.object({
  phone: z.string().min(10).max(20),
  token: z.string().min(4).max(10),
});

const customerPasswordLoginSchema = z.object({
  phone: z.string().min(10).max(20),
  password: z.string().min(8),
});

const customerRegisterSchema = z.object({
  fullName: z.string().min(2),
  phone: z.string().min(10).max(20),
  password: z.string().min(8),
});

const customerOrderSchema = z.object({
  pickupAddress: z.string().min(5).optional(),
  dropAddress: z.string().min(5).optional(),
  pickupLat: z.number().optional(),
  pickupLng: z.number().optional(),
  dropLat: z.number().optional(),
  dropLng: z.number().optional(),
  parcelCategory: z.string().optional(),
  parcelWeight: z.number().nonnegative().optional(),
  vehicleType: z.string().optional(),
  deliveryType: z.string().optional(),
  isFragile: z.boolean().optional(),
});

const riderLocationSchema = z.object({
  trip_id: z.string().uuid(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

const bookingSchema = z.object({
  branch_id: z.string().uuid(),
  sender_name: z.string().min(2),
  sender_phone: z.string().min(8),
  receiver_name: z.string().min(2),
  receiver_phone: z.string().min(8),
  pickup_address: z.string().min(5),
  pickup_lat: z.number(),
  pickup_lng: z.number(),
  drop_address: z.string().min(5),
  drop_lat: z.number(),
  drop_lng: z.number(),
  parcel_weight_kg: z.number().nonnegative().optional(),
  parcel_notes: z.string().optional(),
  cod_required: z.boolean().default(false),
  cod_amount: z.number().nonnegative().optional(),
  vehicle_type: z.enum(["bike", "auto", "car"]),
});

function getClientIp(req: IncomingMessage): string {
  const fromForwarded = req.headers["x-forwarded-for"];
  if (typeof fromForwarded === "string") {
    return fromForwarded.split(",")[0]?.trim() ?? "unknown";
  }

  return req.socket.remoteAddress ?? "unknown";
}

function normalizePhone(phone: string): string {
  const trimmed = sanitizeText(phone).replace(/\s+/g, "");
  const digits = trimmed.replace(/\D/g, "");

  if (trimmed.startsWith("+")) {
    return `+${digits}`;
  }

  if (digits.length === 10) {
    return `+91${digits}`;
  }

  return digits.startsWith("91") ? `+${digits}` : `+${digits}`;
}

function mapOtpProviderError(message: string): string {
  const normalized = message.toLowerCase();

  if (normalized.includes("unsupported phone provider")) {
    return "SMS provider is not configured. In Supabase Auth, enable Phone login and configure Twilio credentials (Account SID, Auth Token, Verify Service SID).";
  }

  if (normalized.includes("sms provider is not configured") || normalized.includes("provider is not enabled")) {
    return "SMS OTP is disabled in Supabase Auth settings. Enable Phone provider and attach Twilio Verify.";
  }

  if (normalized.includes("invalid phone number")) {
    return "Invalid phone number format. Use E.164 format, for example +919876543210.";
  }

  return message;
}

function customerEmailFromPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return `${digits}@vinayaka.customer.local`;
}

async function generateTrackingId(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `VT-${year}-`;

  const { count, error } = await supabaseAdmin
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .ilike("tracking_id", `${prefix}%`);

  if (error) {
    throw new Error(error.message);
  }

  const next = ((count ?? 0) + 1).toString().padStart(6, "0");
  return `${prefix}${next}`;
}

async function auditLog(context: AuthContext | undefined, action: string, resource: string, resourceId?: string) {
  await supabaseAdmin.from("audit_logs").insert({
    actor_user_id: context?.profile.id ?? null,
    action,
    resource,
    resource_id: resourceId ?? null,
  });
}

async function handleAuthRegister(req: IncomingMessage, res: ServerResponse) {
  const parsed = registerSchema.safeParse(await parseBody(req));
  if (!parsed.success) {
    json(res, 400, { error: "Invalid registration payload", details: parsed.error.flatten() });
    return;
  }

  const payload = parsed.data;
  const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email: payload.email,
    password: payload.password,
    email_confirm: true,
    user_metadata: {
      full_name: payload.fullName,
      role: payload.role,
      phone: payload.phone ?? null,
    },
  });

  if (createError || !created.user) {
    json(res, 400, { error: createError?.message ?? "Unable to create auth user" });
    return;
  }

  const { error: profileError } = await supabaseAdmin.from("users").insert({
    auth_user_id: created.user.id,
    full_name: payload.fullName,
    email: payload.email.toLowerCase(),
    phone: payload.phone ?? null,
    role: payload.role,
  });

  if (profileError) {
    await supabaseAdmin.auth.admin.deleteUser(created.user.id);
    json(res, 400, { error: profileError.message });
    return;
  }

  json(res, 201, {
    ok: true,
    user: {
      id: created.user.id,
      email: payload.email.toLowerCase(),
      fullName: payload.fullName,
      role: payload.role,
    },
  });
}

async function handleAuthLogin(req: IncomingMessage, res: ServerResponse) {
  const parsed = loginSchema.safeParse(await parseBody(req));
  if (!parsed.success) {
    json(res, 400, { error: "Invalid login payload", details: parsed.error.flatten() });
    return;
  }

  const payload = parsed.data;
  const { data: signInData, error: signInError } = await supabaseAnon.auth.signInWithPassword({
    email: payload.email,
    password: payload.password,
  });

  if (signInError || !signInData.user || !signInData.session) {
    json(res, 401, { error: signInError?.message ?? "Invalid credentials" });
    return;
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("users")
    .select("id, auth_user_id, full_name, email, phone, role")
    .eq("auth_user_id", signInData.user.id)
    .maybeSingle();

  if (profileError || !profile) {
    json(res, 401, { error: "Profile not found" });
    return;
  }

  json(res, 200, {
    access_token: signInData.session.access_token,
    refresh_token: signInData.session.refresh_token,
    expires_in: signInData.session.expires_in,
    user: profile,
  });
}

async function handleAuthRefresh(req: IncomingMessage, res: ServerResponse) {
  const parsed = refreshSchema.safeParse(await parseBody(req));
  if (!parsed.success) {
    json(res, 400, { error: "Invalid refresh payload", details: parsed.error.flatten() });
    return;
  }

  const { data, error } = await supabaseAnon.auth.refreshSession({
    refresh_token: parsed.data.refresh_token,
  });

  if (error || !data.session || !data.user) {
    json(res, 401, { error: error?.message ?? "Unable to refresh session" });
    return;
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("users")
    .select("id, auth_user_id, full_name, email, phone, role")
    .eq("auth_user_id", data.user.id)
    .maybeSingle();

  if (profileError || !profile) {
    json(res, 401, { error: "Profile not found" });
    return;
  }

  json(res, 200, {
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    expires_in: data.session.expires_in,
    user: profile,
  });
}

async function handleAuthForgotPassword(req: IncomingMessage, res: ServerResponse) {
  const parsed = forgotPasswordSchema.safeParse(await parseBody(req));
  if (!parsed.success) {
    json(res, 400, { error: "Invalid forgot-password payload", details: parsed.error.flatten() });
    return;
  }

  const payload = parsed.data;
  const { error } = await supabaseAnon.auth.resetPasswordForEmail(payload.email, {
    redirectTo: payload.redirect_to,
  });

  if (error) {
    json(res, 400, { error: error.message });
    return;
  }

  json(res, 200, { ok: true, message: "Password reset link sent if account exists" });
}

async function handleRiderRequestOtp(req: IncomingMessage, res: ServerResponse) {
  const parsed = riderOtpRequestSchema.safeParse(await parseBody(req));
  if (!parsed.success) {
    json(res, 400, { error: "Invalid OTP request payload", details: parsed.error.flatten() });
    return;
  }

  const phone = normalizePhone(parsed.data.phone);
  const { error } = await supabaseAnon.auth.signInWithOtp({ phone });

  if (error) {
    json(res, 400, { error: mapOtpProviderError(error.message) });
    return;
  }

  json(res, 200, { ok: true, message: "OTP sent" });
}

async function handleRiderVerifyOtp(req: IncomingMessage, res: ServerResponse) {
  const parsed = riderOtpVerifySchema.safeParse(await parseBody(req));
  if (!parsed.success) {
    json(res, 400, { error: "Invalid OTP verify payload", details: parsed.error.flatten() });
    return;
  }

  const payload = parsed.data;
  const { data, error } = await supabaseAnon.auth.verifyOtp({
    phone: normalizePhone(payload.phone),
    token: sanitizeText(payload.token),
    type: "sms",
  });

  if (error || !data.session || !data.user) {
    json(res, 401, { error: mapOtpProviderError(error?.message ?? "Invalid OTP") });
    return;
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("users")
    .select("id, auth_user_id, full_name, email, phone, role")
    .eq("auth_user_id", data.user.id)
    .maybeSingle();

  if (profileError || !profile) {
    json(res, 401, { error: "Profile not found" });
    return;
  }

  if (profile.role !== "driver") {
    json(res, 403, { error: "Only rider accounts can use OTP login" });
    return;
  }

  json(res, 200, {
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    expires_in: data.session.expires_in,
    user: profile,
  });
}

async function handleRiderPasswordLogin(req: IncomingMessage, res: ServerResponse) {
  const parsed = riderPasswordLoginSchema.safeParse(await parseBody(req));
  if (!parsed.success) {
    json(res, 400, { error: "Invalid rider password login payload", details: parsed.error.flatten() });
    return;
  }

  const phone = sanitizeText(parsed.data.phone);
  const password = parsed.data.password;

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("users")
    .select("id, auth_user_id, full_name, email, phone, role")
    .eq("phone", phone)
    .eq("role", "driver")
    .maybeSingle();

  if (profileError || !profile) {
    json(res, 401, { error: "Driver account not found for this mobile number" });
    return;
  }

  const { data: signInData, error: signInError } = await supabaseAnon.auth.signInWithPassword({
    email: profile.email,
    password,
  });

  if (signInError || !signInData.session || !signInData.user) {
    json(res, 401, { error: signInError?.message ?? "Invalid mobile number or password" });
    return;
  }

  json(res, 200, {
    access_token: signInData.session.access_token,
    refresh_token: signInData.session.refresh_token,
    expires_in: signInData.session.expires_in,
    user: profile,
  });
}

async function handleCustomerRequestOtp(req: IncomingMessage, res: ServerResponse) {
  const parsed = customerOtpRequestSchema.safeParse(await parseBody(req));
  if (!parsed.success) {
    json(res, 400, { error: "Invalid OTP request payload", details: parsed.error.flatten() });
    return;
  }

  const phone = normalizePhone(parsed.data.phone);
  const { error } = await supabaseAnon.auth.signInWithOtp({ phone });

  if (error) {
    json(res, 400, { error: mapOtpProviderError(error.message) });
    return;
  }

  json(res, 200, { ok: true, message: "OTP sent" });
}

async function handleCustomerVerifyOtp(req: IncomingMessage, res: ServerResponse) {
  const parsed = customerOtpVerifySchema.safeParse(await parseBody(req));
  if (!parsed.success) {
    json(res, 400, { error: "Invalid OTP verify payload", details: parsed.error.flatten() });
    return;
  }

  const payload = parsed.data;
  const { data, error } = await supabaseAnon.auth.verifyOtp({
    phone: normalizePhone(payload.phone),
    token: sanitizeText(payload.token),
    type: "sms",
  });

  if (error || !data.session || !data.user) {
    json(res, 401, { error: mapOtpProviderError(error?.message ?? "Invalid OTP") });
    return;
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("users")
    .select("id, auth_user_id, full_name, email, phone, role")
    .eq("auth_user_id", data.user.id)
    .maybeSingle();

  if (profileError || !profile) {
    json(res, 401, { error: "Profile not found" });
    return;
  }

  if (profile.role !== "customer") {
    json(res, 403, { error: "Only customer accounts can use customer OTP login" });
    return;
  }

  json(res, 200, {
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    expires_in: data.session.expires_in,
    user: profile,
  });
}

async function handleCustomerPasswordLogin(req: IncomingMessage, res: ServerResponse) {
  const parsed = customerPasswordLoginSchema.safeParse(await parseBody(req));
  if (!parsed.success) {
    json(res, 400, { error: "Invalid customer password login payload", details: parsed.error.flatten() });
    return;
  }

  const phone = normalizePhone(parsed.data.phone);
  const password = parsed.data.password;

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("users")
    .select("id, auth_user_id, full_name, email, phone, role")
    .eq("phone", phone)
    .eq("role", "customer")
    .maybeSingle();

  if (profileError || !profile) {
    json(res, 401, { error: "Customer account not found for this mobile number" });
    return;
  }

  const { data: signInData, error: signInError } = await supabaseAnon.auth.signInWithPassword({
    email: profile.email,
    password,
  });

  if (signInError || !signInData.session || !signInData.user) {
    json(res, 401, { error: signInError?.message ?? "Invalid mobile number or password" });
    return;
  }

  json(res, 200, {
    access_token: signInData.session.access_token,
    refresh_token: signInData.session.refresh_token,
    expires_in: signInData.session.expires_in,
    user: profile,
  });
}

async function handleCustomerRegister(req: IncomingMessage, res: ServerResponse) {
  const parsed = customerRegisterSchema.safeParse(await parseBody(req));
  if (!parsed.success) {
    json(res, 400, { error: "Invalid customer registration payload", details: parsed.error.flatten() });
    return;
  }

  const fullName = sanitizeText(parsed.data.fullName);
  const phone = normalizePhone(parsed.data.phone);
  const password = parsed.data.password;
  const email = customerEmailFromPhone(phone);

  const { data: existingPhone } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("phone", phone)
    .eq("role", "customer")
    .maybeSingle();

  if (existingPhone) {
    json(res, 409, { error: "A customer account with this mobile number already exists" });
    return;
  }

  const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    phone,
    phone_confirm: true,
    user_metadata: {
      full_name: fullName,
      role: "customer",
      phone,
    },
  });

  if (createError || !created.user) {
    json(res, 400, { error: createError?.message ?? "Unable to create customer user" });
    return;
  }

  const { error: profileError } = await supabaseAdmin.from("users").insert({
    auth_user_id: created.user.id,
    full_name: fullName,
    email,
    phone,
    role: "customer",
  });

  if (profileError) {
    await supabaseAdmin.auth.admin.deleteUser(created.user.id);
    json(res, 400, { error: profileError.message });
    return;
  }

  json(res, 201, { ok: true, message: "Customer account created" });
}

async function handleAuthMe(res: ServerResponse, context: AuthContext | undefined) {
  if (!context) {
    json(res, 401, { error: "Unauthorized" });
    return;
  }

  json(res, 200, { user: context.profile });
}

async function handleAuthLogout(res: ServerResponse, context: AuthContext | undefined) {
  if (!context) {
    json(res, 401, { error: "Unauthorized" });
    return;
  }

  // Supabase server-side client is stateless in this API model.
  // Client clears tokens locally on manual logout.
  json(res, 200, { ok: true });
}

async function handleAdminResetUserPassword(res: ServerResponse, context: AuthContext, userId: string) {
  requireRole(context, ["admin"]);

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("users")
    .select("id, auth_user_id, full_name, email, role")
    .eq("id", userId)
    .maybeSingle();

  if (profileError || !profile) {
    json(res, 404, { error: "User not found" });
    return;
  }

  const temporaryPassword = `Temp@${Date.now()}`;
  const { error: resetError } = await supabaseAdmin.auth.admin.updateUserById(profile.auth_user_id, {
    password: temporaryPassword,
  });

  if (resetError) {
    json(res, 400, { error: resetError.message });
    return;
  }

  await auditLog(context, "reset_password", "users", userId);
  json(res, 200, {
    ok: true,
    user: {
      id: profile.id,
      full_name: profile.full_name,
      email: profile.email,
      role: profile.role,
    },
    temporary_password: temporaryPassword,
  });
}

async function listTable(res: ServerResponse, table: string, orderBy = "created_at") {
  const { data, error } = await supabaseAdmin.from(table).select("*").order(orderBy, { ascending: false });
  if (error) {
    json(res, 400, { error: error.message });
    return;
  }

  json(res, 200, data ?? []);
}

async function createTableRow(req: IncomingMessage, res: ServerResponse, table: string, context: AuthContext, sanitizeFields: string[] = []) {
  const body = await parseBody(req);
  for (const field of sanitizeFields) {
    if (field in body) {
      body[field] = sanitizeText(body[field]);
    }
  }

  const { data, error } = await supabaseAdmin.from(table).insert(body).select("*").single();
  if (error) {
    json(res, 400, { error: error.message });
    return;
  }

  await auditLog(context, "create", table, data.id);
  json(res, 201, data);
}

async function patchTableRow(req: IncomingMessage, res: ServerResponse, table: string, id: string, context: AuthContext, sanitizeFields: string[] = []) {
  const body = await parseBody(req);
  for (const field of sanitizeFields) {
    if (field in body) {
      body[field] = sanitizeText(body[field]);
    }
  }

  const { data, error } = await supabaseAdmin.from(table).update(body).eq("id", id).select("*").single();
  if (error) {
    json(res, 400, { error: error.message });
    return;
  }

  await auditLog(context, "update", table, id);
  json(res, 200, data);
}

async function deleteTableRow(res: ServerResponse, table: string, id: string, context: AuthContext) {
  const { error } = await supabaseAdmin.from(table).delete().eq("id", id);
  if (error) {
    json(res, 400, { error: error.message });
    return;
  }

  await auditLog(context, "delete", table, id);
  json(res, 200, { ok: true });
}

async function handleBookings(req: IncomingMessage, res: ServerResponse, segments: string[], context: AuthContext) {
  if (req.method === "GET" && segments.length === 1) {
    const status = getQuery(req, "status");
    const page = Number(getQuery(req, "page") ?? "1");
    const limit = Number(getQuery(req, "limit") ?? "20");
    const from = Math.max(0, (page - 1) * limit);
    const to = from + Math.max(1, Math.min(100, limit)) - 1;

    let query = supabaseAdmin
      .from("bookings")
      .select("*, trips(*), delivery_proofs(*), payments(*)", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to);

    if (status) {
      query = query.eq("status", status);
    }

    if (context.profile.role === "customer") {
      query = query.eq("customer_user_id", context.profile.id);
    }

    const { data, error, count } = await query;
    if (error) {
      json(res, 400, { error: error.message });
      return;
    }

    json(res, 200, {
      items: data ?? [],
      total: count ?? 0,
      page,
      limit,
    });
    return;
  }

  if (req.method === "POST" && segments.length === 1) {
    const parsed = bookingSchema.safeParse(await parseBody(req));
    if (!parsed.success) {
      json(res, 400, { error: "Invalid booking payload", details: parsed.error.flatten() });
      return;
    }

    const payload = parsed.data;
    const estimated_arrival_at = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    let created: any | null = null;
    let createError: any = null;

    // Retry ID generation to avoid race-condition collisions under concurrent inserts.
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const tracking_id = await generateTrackingId();
      const result = await supabaseAdmin
        .from("bookings")
        .insert({
          tracking_id,
          customer_user_id: context.profile.id,
          branch_id: payload.branch_id,
          sender_name: sanitizeText(payload.sender_name),
          sender_phone: sanitizeText(payload.sender_phone),
          receiver_name: sanitizeText(payload.receiver_name),
          receiver_phone: sanitizeText(payload.receiver_phone),
          pickup_address: sanitizeText(payload.pickup_address),
          pickup_lat: payload.pickup_lat,
          pickup_lng: payload.pickup_lng,
          drop_address: sanitizeText(payload.drop_address),
          drop_lat: payload.drop_lat,
          drop_lng: payload.drop_lng,
          vehicle_type: payload.vehicle_type,
          parcel_weight_kg: payload.parcel_weight_kg ?? null,
          parcel_notes: sanitizeText(payload.parcel_notes ?? ""),
          cod_required: payload.cod_required,
          cod_amount: payload.cod_amount ?? null,
          status: "booked",
          estimated_arrival_at,
        })
        .select("*")
        .single();

      created = result.data;
      createError = result.error;

      const duplicateId =
        createError?.code === "23505" ||
        String(createError?.message ?? "").toLowerCase().includes("duplicate");

      if (!duplicateId) {
        break;
      }
    }

    if (createError || !created) {
      json(res, 400, { error: createError?.message ?? "Unable to create booking" });
      return;
    }

    await supabaseAdmin.from("tracking_events").insert({
      booking_id: created.id,
      status: "booked",
      message: "Booking created",
      location_label: created.pickup_address,
    });

    await auditLog(context, "create", "bookings", created.id);
    json(res, 201, created);
    return;
  }

  if (segments.length >= 2) {
    const bookingId = segments[1];
    if (!bookingId) {
      json(res, 400, { error: "Booking id is required" });
      return;
    }

    if (req.method === "PATCH") {
      const body = await parseBody(req);
      const updates: Record<string, unknown> = {};
      const allowed = [
        "sender_name",
        "sender_phone",
        "receiver_name",
        "receiver_phone",
        "pickup_address",
        "pickup_lat",
        "pickup_lng",
        "drop_address",
        "drop_lat",
        "drop_lng",
        "status",
        "branch_id",
        "vehicle_type",
        "estimated_arrival_at",
      ];

      for (const key of allowed) {
        if (key in body) {
          updates[key] = typeof body[key] === "string" ? sanitizeText(body[key]) : body[key];
        }
      }

      const { data: updated, error: updateError } = await supabaseAdmin
        .from("bookings")
        .update(updates)
        .eq("id", bookingId)
        .select("*")
        .single();

      if (updateError || !updated) {
        json(res, 400, { error: updateError?.message ?? "Unable to update booking" });
        return;
      }

      if (typeof updates.status === "string") {
        await supabaseAdmin.from("tracking_events").insert({
          booking_id: bookingId,
          status: updates.status,
          message: `Status updated to ${updates.status}`,
          location_label: updated.drop_address,
        });
      }

      await auditLog(context, "update", "bookings", bookingId);
      json(res, 200, updated);
      return;
    }

    if (req.method === "DELETE") {
      await deleteTableRow(res, "bookings", bookingId, context);
      return;
    }
  }

  json(res, 405, { error: "Method not allowed" });
}

async function handleTracking(req: IncomingMessage, res: ServerResponse, segments: string[]) {
  if (req.method !== "GET" || segments.length !== 2) {
    json(res, 405, { error: "Method not allowed" });
    return;
  }

  const trackingId = sanitizeText(segments[1]);
  const { data: booking, error: bookingError } = await supabaseAdmin
    .from("bookings")
    .select("*, trips(*, drivers(*, users(*)), vehicles(*)), delivery_proofs(*), payments(*)")
    .eq("tracking_id", trackingId)
    .maybeSingle();

  if (bookingError) {
    json(res, 400, { error: bookingError.message });
    return;
  }

  if (!booking) {
    json(res, 404, { error: "Tracking id not found" });
    return;
  }

  const { data: events, error: eventsError } = await supabaseAdmin
    .from("tracking_events")
    .select("*")
    .eq("booking_id", booking.id)
    .order("event_time", { ascending: true });

  if (eventsError) {
    json(res, 400, { error: eventsError.message });
    return;
  }

  json(res, 200, {
    booking,
    timeline: events ?? [],
  });
}

async function handleCustomerEndpoints(req: IncomingMessage, res: ServerResponse, segments: string[], context: AuthContext) {
  requireRole(context, ["customer"]);

  if (req.method === "GET" && segments.length === 2 && segments[1] === "profile") {
    const { count: ordersCount } = await supabaseAdmin
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("customer_user_id", context.profile.id);

    json(res, 200, {
      data: {
        user: context.profile,
        loyaltyPoints: (ordersCount ?? 0) * 10,
      },
    });
    return;
  }

  if (req.method === "GET" && segments.length === 2 && segments[1] === "orders") {
    const { data, error } = await supabaseAdmin
      .from("bookings")
      .select("*, trips(*, drivers(*, users(*)), vehicles(*)), tracking_events(*)")
      .eq("customer_user_id", context.profile.id)
      .order("created_at", { ascending: false });

    if (error) {
      json(res, 400, { error: error.message });
      return;
    }

    const mapped = (data ?? []).map((item: any) => ({
      id: item.id,
      orderNumber: item.tracking_id,
      status: (item.status ?? "booked").toUpperCase(),
      finalPrice: Number(item.cod_amount ?? 0),
      createdAt: item.created_at,
      pickupAddress: { fullAddress: item.pickup_address },
      dropAddress: { fullAddress: item.drop_address },
      trackingLogs: (item.tracking_events ?? []).map((evt: any) => ({
        id: evt.id,
        status: (evt.status ?? "booked").toUpperCase(),
        createdAt: evt.event_time,
        message: evt.message,
      })),
      rider: item.trips?.[0]?.drivers?.users
        ? {
            user: {
              fullName: item.trips[0].drivers.users.full_name,
              phoneNumber: item.trips[0].drivers.users.phone,
            },
            vehicle: {
              vehicleNumber: item.trips?.[0]?.vehicles?.registration_number,
            },
          }
        : null,
    }));

    json(res, 200, { data: mapped });
    return;
  }

  if (req.method === "GET" && segments.length === 2 && segments[1] === "wallet") {
    const { data, error } = await supabaseAdmin
      .from("payments")
      .select("id, amount, method, status, paid_at")
      .eq("status", "captured")
      .order("paid_at", { ascending: false })
      .limit(25);

    if (error) {
      json(res, 400, { error: error.message });
      return;
    }

    const transactions = (data ?? []).map((payment: any) => ({
      id: payment.id,
      amount: Number(payment.amount ?? 0),
      type: "DEBIT",
      createdAt: payment.paid_at,
      description: payment.method ?? "Payment",
    }));

    json(res, 200, {
      data: {
        balance: 0,
        transactions,
      },
    });
    return;
  }

  if (req.method === "GET" && segments.length === 2 && segments[1] === "addresses") {
    const { data, error } = await supabaseAdmin
      .from("bookings")
      .select("pickup_address, pickup_lat, pickup_lng, drop_address, drop_lat, drop_lng")
      .eq("customer_user_id", context.profile.id)
      .order("created_at", { ascending: false })
      .limit(30);

    if (error) {
      json(res, 400, { error: error.message });
      return;
    }

    const map = new Map<string, any>();
    for (const row of data ?? []) {
      if (row.pickup_address) {
        map.set(`pickup:${row.pickup_address}`, {
          id: `p-${Buffer.from(row.pickup_address).toString("base64").slice(0, 12)}`,
          fullAddress: row.pickup_address,
          latitude: Number(row.pickup_lat ?? 14.4426),
          longitude: Number(row.pickup_lng ?? 79.9865),
        });
      }
      if (row.drop_address) {
        map.set(`drop:${row.drop_address}`, {
          id: `d-${Buffer.from(row.drop_address).toString("base64").slice(0, 12)}`,
          fullAddress: row.drop_address,
          latitude: Number(row.drop_lat ?? 14.4426),
          longitude: Number(row.drop_lng ?? 79.9865),
        });
      }
    }

    const addresses = Array.from(map.values());
    if (addresses.length === 0) {
      addresses.push(
        { id: "default-pickup", fullAddress: "Podalakur Main Road, Nellore", latitude: 14.4426, longitude: 79.9865 },
        { id: "default-drop", fullAddress: "Nellore Bus Stand, Nellore", latitude: 14.4472, longitude: 79.9860 }
      );
    }

    json(res, 200, { data: addresses });
    return;
  }

  json(res, 404, { error: "Customer endpoint not found" });
}

async function handleOrders(req: IncomingMessage, res: ServerResponse, segments: string[], context: AuthContext) {
  requireRole(context, ["customer", "admin", "operations_staff"]);

  if (req.method === "POST" && segments.length === 1) {
    const parsed = customerOrderSchema.safeParse(await parseBody(req));
    if (!parsed.success) {
      json(res, 400, { error: "Invalid order payload", details: parsed.error.flatten() });
      return;
    }

    const payload = parsed.data;
    const { data: branch } = await supabaseAdmin.from("branches").select("id").limit(1).maybeSingle();
    if (!branch?.id) {
      json(res, 400, { error: "No branch configured" });
      return;
    }

    const pickupAddress = sanitizeText(payload.pickupAddress ?? "Pickup Address");
    const dropAddress = sanitizeText(payload.dropAddress ?? "Drop Address");
    const pickupLat = Number(payload.pickupLat ?? 14.4426);
    const pickupLng = Number(payload.pickupLng ?? 79.9865);
    const dropLat = Number(payload.dropLat ?? 14.4472);
    const dropLng = Number(payload.dropLng ?? 79.9860);

    let created: any | null = null;
    let createError: any = null;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const tracking_id = await generateTrackingId();
      const result = await supabaseAdmin
        .from("bookings")
        .insert({
          tracking_id,
          customer_user_id: context.profile.id,
          branch_id: branch.id,
          sender_name: context.profile.full_name ?? "Customer",
          sender_phone: context.profile.phone ?? "",
          receiver_name: context.profile.full_name ?? "Receiver",
          receiver_phone: context.profile.phone ?? "",
          pickup_address: pickupAddress,
          pickup_lat: pickupLat,
          pickup_lng: pickupLng,
          drop_address: dropAddress,
          drop_lat: dropLat,
          drop_lng: dropLng,
          vehicle_type: String(payload.vehicleType ?? "bike").toLowerCase(),
          parcel_weight_kg: payload.parcelWeight ?? null,
          parcel_notes: sanitizeText(payload.parcelCategory ?? "General parcel"),
          cod_required: false,
          cod_amount: null,
          status: "booked",
          estimated_arrival_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        })
        .select("*")
        .single();

      created = result.data;
      createError = result.error;
      const duplicateId =
        createError?.code === "23505" ||
        String(createError?.message ?? "").toLowerCase().includes("duplicate");
      if (!duplicateId) break;
    }

    if (createError || !created) {
      json(res, 400, { error: createError?.message ?? "Unable to create order" });
      return;
    }

    await supabaseAdmin.from("tracking_events").insert({
      booking_id: created.id,
      status: "booked",
      message: "Order created",
      location_label: created.pickup_address,
    });

    json(res, 201, {
      data: {
        id: created.id,
        orderNumber: created.tracking_id,
      },
    });
    return;
  }

  if (req.method === "GET" && segments.length === 2) {
    const orderId = sanitizeText(segments[1]);
    const byId = /^[0-9a-fA-F-]{8,}$/.test(orderId);
    const query = supabaseAdmin
      .from("bookings")
      .select("*, trips(*, drivers(*, users(*)), vehicles(*)), tracking_events(*)")
      .eq("customer_user_id", context.profile.id)
      .order("created_at", { ascending: false })
      .limit(1);

    const { data, error } = byId ? await query.eq("id", orderId).maybeSingle() : await query.eq("tracking_id", orderId).maybeSingle();

    if (error) {
      json(res, 400, { error: error.message });
      return;
    }
    if (!data) {
      json(res, 404, { error: "Order not found" });
      return;
    }

    json(res, 200, {
      data: {
        id: data.id,
        orderNumber: data.tracking_id,
        status: (data.status ?? "booked").toUpperCase(),
        finalPrice: Number(data.cod_amount ?? 0),
        createdAt: data.created_at,
        pickupAddress: { fullAddress: data.pickup_address },
        dropAddress: { fullAddress: data.drop_address },
        trackingLogs: (data.tracking_events ?? []).map((evt: any) => ({
          id: evt.id,
          status: (evt.status ?? "booked").toUpperCase(),
          createdAt: evt.event_time,
          message: evt.message,
        })),
        rider: data.trips?.[0]?.drivers?.users
          ? {
              user: {
                fullName: data.trips[0].drivers.users.full_name,
                phoneNumber: data.trips[0].drivers.users.phone,
              },
              vehicle: {
                vehicleNumber: data.trips?.[0]?.vehicles?.registration_number,
              },
            }
          : null,
      },
    });
    return;
  }

  if (req.method === "GET" && segments.length === 4 && segments[1] === "public" && segments[3] === "track") {
    const trackingId = sanitizeText(segments[2]);
    const { data: booking, error } = await supabaseAdmin
      .from("bookings")
      .select("*, trips(*, drivers(*, users(*)), vehicles(*))")
      .eq("tracking_id", trackingId)
      .maybeSingle();

    if (error) {
      json(res, 400, { error: error.message });
      return;
    }
    if (!booking) {
      json(res, 404, { error: "Order not found" });
      return;
    }

    const { data: timeline } = await supabaseAdmin
      .from("tracking_events")
      .select("*")
      .eq("booking_id", booking.id)
      .order("event_time", { ascending: true });

    json(res, 200, {
      data: {
        orderNumber: booking.tracking_id,
        status: (booking.status ?? "booked").toUpperCase(),
        estimatedDeliveryTime: booking.estimated_arrival_at,
        rider: booking.trips?.[0]?.drivers?.users
          ? {
              name: booking.trips[0].drivers.users.full_name,
              phoneNumber: booking.trips[0].drivers.users.phone,
            }
          : null,
        timeline: (timeline ?? []).map((evt: any) => ({
          id: evt.id,
          status: (evt.status ?? "booked").toUpperCase(),
          timestamp: evt.event_time,
          message: evt.message,
        })),
      },
    });
    return;
  }

  json(res, 405, { error: "Method not allowed" });
}

async function handlePublicOrderTrack(res: ServerResponse, segments: string[]) {
  if (segments.length !== 4 || segments[1] !== "public" || segments[3] !== "track") {
    json(res, 404, { error: "Endpoint not found" });
    return;
  }

  const trackingId = sanitizeText(segments[2]);
  const { data: booking, error } = await supabaseAdmin
    .from("bookings")
    .select("*, trips(*, drivers(*, users(*)), vehicles(*))")
    .eq("tracking_id", trackingId)
    .maybeSingle();

  if (error) {
    json(res, 400, { error: error.message });
    return;
  }
  if (!booking) {
    json(res, 404, { error: "Order not found" });
    return;
  }

  const { data: timeline } = await supabaseAdmin
    .from("tracking_events")
    .select("*")
    .eq("booking_id", booking.id)
    .order("event_time", { ascending: true });

  json(res, 200, {
    data: {
      orderNumber: booking.tracking_id,
      status: (booking.status ?? "booked").toUpperCase(),
      estimatedDeliveryTime: booking.estimated_arrival_at,
      rider: booking.trips?.[0]?.drivers?.users
        ? {
            name: booking.trips[0].drivers.users.full_name,
            phoneNumber: booking.trips[0].drivers.users.phone,
          }
        : null,
      timeline: (timeline ?? []).map((evt: any) => ({
        id: evt.id,
        status: (evt.status ?? "booked").toUpperCase(),
        timestamp: evt.event_time,
        message: evt.message,
      })),
    },
  });
}

async function handleAnalytics(res: ServerResponse, context: AuthContext) {
  requireRole(context, ["admin"]);

  const tables = [
    "users",
    "drivers",
    "vehicles",
    "branches",
    "bookings",
    "trips",
    "pricing_rules",
    "complaints",
    "payments",
  ];

  const counts: Record<string, number> = {};
  for (const table of tables) {
    const { count } = await supabaseAdmin.from(table).select("id", { count: "exact", head: true });
    counts[table] = count ?? 0;
  }

  json(res, 200, counts);
}

async function handleRiderActions(req: IncomingMessage, res: ServerResponse, segments: string[], context: AuthContext) {
  requireRole(context, ["driver"]);

  if (segments.length === 2 && segments[1] === "location" && req.method === "POST") {
    const parsed = riderLocationSchema.safeParse(await parseBody(req));
    if (!parsed.success) {
      json(res, 400, { error: "Invalid rider location payload", details: parsed.error.flatten() });
      return;
    }

    const payload = parsed.data;

    const { data: driver, error: driverError } = await supabaseAdmin
      .from("drivers")
      .select("id")
      .eq("user_id", context.profile.id)
      .maybeSingle();

    if (driverError || !driver) {
      json(res, 400, { error: "Driver profile not found" });
      return;
    }

    const { data: trip, error: tripError } = await supabaseAdmin
      .from("trips")
      .select("id, booking_id, driver_id, status")
      .eq("id", payload.trip_id)
      .maybeSingle();

    if (tripError || !trip) {
      json(res, 404, { error: "Trip not found" });
      return;
    }

    if (trip.driver_id !== driver.id) {
      json(res, 403, { error: "Trip is not assigned to this rider" });
      return;
    }

    const { error: updateDriverError } = await supabaseAdmin
      .from("drivers")
      .update({
        current_lat: payload.latitude,
        current_lng: payload.longitude,
        status: "online",
      })
      .eq("id", driver.id);

    if (updateDriverError) {
      json(res, 400, { error: updateDriverError.message });
      return;
    }

    const trackableStatuses = ["assigned", "accepted", "started", "pickup_complete", "in_transit"];
    if (trackableStatuses.includes(String(trip.status ?? "").toLowerCase())) {
      await supabaseAdmin.from("tracking_events").insert({
        booking_id: trip.booking_id,
        status: trip.status,
        message: "Rider location updated",
        latitude: payload.latitude,
        longitude: payload.longitude,
        location_label: "Live location",
      });
    }

    json(res, 200, { ok: true });
    return;
  }

  if (segments.length === 2 && segments[1] === "trips" && req.method === "GET") {
    const { data: driver, error: driverError } = await supabaseAdmin
      .from("drivers")
      .select("id")
      .eq("user_id", context.profile.id)
      .maybeSingle();

    if (driverError || !driver) {
      json(res, 400, { error: "Driver profile not found" });
      return;
    }

    const { data: trips, error: tripsError } = await supabaseAdmin
      .from("trips")
      .select("*, bookings(*), vehicles(*)")
      .eq("driver_id", driver.id)
      .order("created_at", { ascending: false });

    if (tripsError) {
      json(res, 400, { error: tripsError.message });
      return;
    }

    json(res, 200, trips ?? []);
    return;
  }

  if (segments.length === 4 && segments[1] === "trips" && segments[3] === "action" && req.method === "POST") {
    const tripId = sanitizeText(segments[2]);
    const body = await parseBody(req);
    const action = sanitizeText(body.action);
    const allowed = ["accept", "reject", "start", "pickup_complete", "in_transit", "delivered"];

    if (!allowed.includes(action)) {
      json(res, 400, { error: "Invalid action" });
      return;
    }

    const statusMap: Record<string, string> = {
      accept: "accepted",
      reject: "rejected",
      start: "started",
      pickup_complete: "pickup_complete",
      in_transit: "in_transit",
      delivered: "delivered",
    };

    const mappedStatus = statusMap[action];

    const { data: trip, error: tripError } = await supabaseAdmin
      .from("trips")
      .update({ status: mappedStatus })
      .eq("id", tripId)
      .select("*")
      .single();

    if (tripError || !trip) {
      json(res, 400, { error: tripError?.message ?? "Unable to update trip" });
      return;
    }

    await supabaseAdmin.from("bookings").update({ status: mappedStatus }).eq("id", trip.booking_id);

    await supabaseAdmin.from("tracking_events").insert({
      booking_id: trip.booking_id,
      status: mappedStatus,
      message: `Driver action: ${action}`,
      location_label: action === "pickup_complete" ? "Pickup point" : "In transit",
    });

    await auditLog(context, "update", "trips", trip.id);
    json(res, 200, trip);
    return;
  }

  if (segments.length === 2 && segments[1] === "proofs" && req.method === "POST") {
    const body = await parseBody(req);
    const bookingId = sanitizeText(body.booking_id);
    const tripId = sanitizeText(body.trip_id ?? "");

    if (!bookingId) {
      json(res, 400, { error: "booking_id is required" });
      return;
    }

    const { data, error } = await supabaseAdmin
      .from("delivery_proofs")
      .insert({
        booking_id: bookingId,
        trip_id: tripId || null,
        photo_url: sanitizeText(body.photo_url ?? ""),
        signature_url: sanitizeText(body.signature_url ?? ""),
        note: sanitizeText(body.note ?? ""),
      })
      .select("*")
      .single();

    if (error || !data) {
      json(res, 400, { error: error?.message ?? "Unable to upload delivery proof" });
      return;
    }

    await auditLog(context, "create", "delivery_proofs", data.id);
    json(res, 201, data);
    return;
  }

  json(res, 405, { error: "Method not allowed" });
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  setCorsHeaders(req, res);

  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }

  const pathSegments = getPathSegments(req);
  const [resource] = pathSegments;
  const method = req.method ?? "GET";
  const ip = getClientIp(req);
  const limitKey = `${ip}:${resource}:${method}`;
  const limit = resource === "auth" ? 30 : 120;
  const windowMs = 60_000;

  if (!checkRateLimit(limitKey, limit, windowMs)) {
    json(res, 429, { error: "Too many requests" });
    return;
  }

  try {
    if (!resource || resource === "health") {
      json(res, 200, {
        status: "ok",
        service: "vinayaka-transport-api",
        timestamp: new Date().toISOString(),
      });
      return;
    }

    if (resource === "auth") {
      const action = pathSegments[1] ?? "";
      if (method === "POST" && action === "register") {
        await handleAuthRegister(req, res);
        return;
      }
      if (method === "POST" && action === "login") {
        await handleAuthLogin(req, res);
        return;
      }
      if (method === "POST" && action === "refresh") {
        await handleAuthRefresh(req, res);
        return;
      }
      if (method === "POST" && action === "forgot-password") {
        await handleAuthForgotPassword(req, res);
        return;
      }
      if (method === "POST" && action === "rider-request-otp") {
        await handleRiderRequestOtp(req, res);
        return;
      }
      if (method === "POST" && action === "rider-verify-otp") {
        await handleRiderVerifyOtp(req, res);
        return;
      }
      if (method === "POST" && action === "rider-password-login") {
        await handleRiderPasswordLogin(req, res);
        return;
      }
      if (method === "POST" && action === "customer-request-otp") {
        await handleCustomerRequestOtp(req, res);
        return;
      }
      if (method === "POST" && action === "customer-verify-otp") {
        await handleCustomerVerifyOtp(req, res);
        return;
      }
      if (method === "POST" && action === "customer-password-login") {
        await handleCustomerPasswordLogin(req, res);
        return;
      }
      if (method === "POST" && action === "customer-register") {
        await handleCustomerRegister(req, res);
        return;
      }
      if (method === "POST" && action === "logout") {
        const context = await requireAuth(req);
        await handleAuthLogout(res, context);
        return;
      }
      if (method === "GET" && action === "me") {
        const context = await requireAuth(req);
        await handleAuthMe(res, context);
        return;
      }

      json(res, 404, { error: "Auth endpoint not found" });
      return;
    }

    if (resource === "tracking") {
      await handleTracking(req, res, pathSegments);
      return;
    }

    if (resource === "orders" && method === "GET" && pathSegments[1] === "public" && pathSegments[3] === "track") {
      await handlePublicOrderTrack(res, pathSegments);
      return;
    }

    const context = await requireAuth(req);

    if (resource === "analytics" && method === "GET" && pathSegments[1] === "dashboard") {
      await handleAnalytics(res, context);
      return;
    }

    if (resource === "riders") {
      await handleRiderActions(req, res, pathSegments, context);
      return;
    }

    if (resource === "customers") {
      await handleCustomerEndpoints(req, res, pathSegments, context);
      return;
    }

    if (resource === "orders") {
      await handleOrders(req, res, pathSegments, context);
      return;
    }

    if (resource === "bookings") {
      await handleBookings(req, res, pathSegments, context);
      return;
    }

    const adminResources = [
      "users",
      "drivers",
      "vehicles",
      "branches",
      "trips",
      "tracking_events",
      "payments",
      "pricing_rules",
      "delivery_proofs",
      "complaints",
      "notifications",
      "audit_logs",
      "inventory_items",
      "vehicle_compliance",
      "driver_attendance",
    ];

    if (!adminResources.includes(resource)) {
      json(res, 404, { error: "Endpoint not found" });
      return;
    }

    requireRole(context, ["admin", "operations_staff"]);
    const id = pathSegments[1];

    if (resource === "users" && method === "POST" && id && pathSegments[2] === "reset-password") {
      await handleAdminResetUserPassword(res, context, id);
      return;
    }

    if (method === "GET" && !id) {
      await listTable(res, resource);
      return;
    }

    if (method === "POST" && !id) {
      await createTableRow(req, res, resource, context, ["full_name", "name", "city", "message"]);
      return;
    }

    if (method === "PATCH" && id) {
      await patchTableRow(req, res, resource, id, context, ["full_name", "name", "city", "message"]);
      return;
    }

    if (method === "DELETE" && id) {
      await deleteTableRow(res, resource, id, context);
      return;
    }

    json(res, 405, { error: "Method not allowed" });
  } catch (error: any) {
    if (error?.message === "Unauthorized") {
      json(res, 401, { error: "Unauthorized" });
      return;
    }

    if (error?.message === "Forbidden") {
      json(res, 403, { error: "Forbidden" });
      return;
    }

    json(res, 500, { error: error?.message ?? "Internal server error" });
  }
}

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

function randomTrackingId(): string {
  return `VT${Date.now().toString().slice(-8)}${Math.floor(Math.random() * 9000 + 1000)}`;
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

  const { error } = await supabaseAnon.auth.signOut();
  if (error) {
    json(res, 400, { error: error.message });
    return;
  }

  json(res, 200, { ok: true });
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
    const tracking_id = randomTrackingId();
    const estimated_arrival_at = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    const { data: created, error: createError } = await supabaseAdmin
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
  setCorsHeaders(res);

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

    const context = await requireAuth(req);

    if (resource === "analytics" && method === "GET" && pathSegments[1] === "dashboard") {
      await handleAnalytics(res, context);
      return;
    }

    if (resource === "riders") {
      await handleRiderActions(req, res, pathSegments, context);
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
    ];

    if (!adminResources.includes(resource)) {
      json(res, 404, { error: "Endpoint not found" });
      return;
    }

    requireRole(context, ["admin", "operations_staff"]);
    const id = pathSegments[1];

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

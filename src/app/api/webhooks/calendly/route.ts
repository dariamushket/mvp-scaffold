import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  // Verify HMAC-SHA256 signature if signing key is configured
  const signingKey = process.env.CALENDLY_WEBHOOK_SIGNING_KEY;
  if (signingKey) {
    const signature = req.headers.get("Calendly-Webhook-Signature");
    if (!signature) {
      return NextResponse.json({ error: "Missing signature" }, { status: 401 });
    }
    const expected = createHmac("sha256", signingKey)
      .update(rawBody)
      .digest("hex");
    const actual = signature.replace(/^sha256=/, "");
    try {
      const match = timingSafeEqual(
        Buffer.from(expected, "hex"),
        Buffer.from(actual, "hex")
      );
      if (!match) {
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
      }
    } catch {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const event = payload.event as string | undefined;
  const data = payload.payload as Record<string, unknown> | undefined;

  if (event === "invitee.created") {
    const tracking = data?.tracking as Record<string, unknown> | undefined;
    const sessionId = tracking?.utm_content as string | undefined;

    if (!sessionId) {
      // Untracked booking — ignore
      return NextResponse.json({ ok: true });
    }

    const scheduledEvent = data?.scheduled_event as Record<string, unknown> | undefined;
    const startTime = scheduledEvent?.start_time as string | undefined;
    const endTime = scheduledEvent?.end_time as string | undefined;
    const locationObj = scheduledEvent?.location as Record<string, unknown> | undefined;
    const locationText = (locationObj?.location ?? locationObj?.join_url ?? null) as string | null;
    const joinUrl = locationObj?.join_url as string | null | undefined;
    const calendlyEventUri = scheduledEvent?.uri as string | undefined;
    const inviteeUri = data?.uri as string | undefined;

    const { error } = await createAdminClient()
      .from("sessions")
      .update({
        status: "booked",
        booked_start_at: startTime ?? null,
        booked_end_at: endTime ?? null,
        location: locationText,
        meeting_url: joinUrl ?? null,
        calendly_event_uri: calendlyEventUri ?? null,
        calendly_invitee_uri: inviteeUri ?? null,
      })
      .eq("id", sessionId);

    if (error) {
      console.error("Calendly webhook: failed to update session", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  } else if (event === "invitee.canceled") {
    const tracking = data?.tracking as Record<string, unknown> | undefined;
    const sessionId = tracking?.utm_content as string | undefined;

    if (!sessionId) {
      return NextResponse.json({ ok: true });
    }

    const { error } = await createAdminClient()
      .from("sessions")
      .update({ status: "canceled" })
      .eq("id", sessionId);

    if (error) {
      console.error("Calendly webhook: failed to cancel session", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}

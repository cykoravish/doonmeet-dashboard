// Sends browser push notifications via the Web Push protocol.
// Mirrors src/lib/push.ts in the main doonmeet app.
// ============================================================
import webpush from "web-push";
import { PushSubscription } from "@/models/PushSubscription";

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY ?? "";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY ?? "";

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails("mailto:ravish@doonmeet.in", VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

// Sends the same payload to every subscription passed in (already fetched
// by the caller — the broadcast route fetches all subscriptions once
// rather than doing a per-user query like the main app's sendPushToUser).
// Returns how many sends actually succeeded. Dead subscriptions
// (404/410 from the push service) are cleaned up as they're found.
export async function sendPushToSubscriptions(
  subs: { _id: unknown; endpoint: string; keys: { p256dh: string; auth: string } }[],
  payload: PushPayload
): Promise<number> {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return 0;

  const body = JSON.stringify(payload);
  let successCount = 0;

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification({ endpoint: sub.endpoint, keys: sub.keys }, body);
        successCount++;
      } catch (err) {
        const statusCode = (err as { statusCode?: number })?.statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await PushSubscription.deleteOne({ _id: sub._id }).catch(() => {});
        } else {
          console.error(`[push] Broadcast send failed for subscription ${sub._id}:`, err);
        }
      }
    })
  );

  return successCount;
}

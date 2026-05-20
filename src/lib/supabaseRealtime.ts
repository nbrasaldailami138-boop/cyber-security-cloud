import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

const supabase = createClient(supabaseUrl, supabaseKey);

export function getSupabase() {
  if (!supabase) {
    throw new Error("Supabase client not initialized");
  }
  return supabase;
}

// ==================== نظام Broadcast عبر WebSocket ====================

const channels: Record<string, { channel: any; ready: boolean; queue: any[] }> = {};

function getOrCreateChannel(channelName: string) {
  if (!channels[channelName]) {
    const entry = { channel: null, ready: false, queue: [] as any[] };

    const channel = supabase.channel(channelName, {
      config: { broadcast: { self: true } },
    });

    channel.subscribe((status: string) => {
      if (status === "SUBSCRIBED") {
        entry.ready = true;
        // إرسال كل الرسائل المنتظرة
        for (const msg of entry.queue) {
          channel
            .send({
              type: "broadcast",
              event: msg.event,
              payload: msg.payload,
            })
            .catch(() => {});
        }
        entry.queue = [];
      }
    });

    entry.channel = channel;
    channels[channelName] = entry;
  }

  return channels[channelName];
}

export function broadcastEvent(
  channelName: string,
  eventName: string,
  data: any,
): void {
  try {
    const entry = getOrCreateChannel(channelName);

    if (entry.ready) {
      // WebSocket جاهز - إرسال فوري
      entry.channel
        .send({
          type: "broadcast",
          event: eventName,
          payload: data,
        })
        .catch(() => {});
    } else {
      // القناة لم تشترك بعد - تخزين مؤقت
      entry.queue.push({ event: eventName, payload: data });
    }
  } catch {
    // Silent fail
  }
}

const supabaseRealtime = {
  getSupabase,
  broadcastEvent,
};

export default supabaseRealtime;

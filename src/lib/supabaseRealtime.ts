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

const channels: Record<string, { channel: any; ready: boolean; queue: any[] }> =
  {};

function getOrCreateChannel(channelName: string) {
  if (!channels[channelName]) {
    const entry: { channel: any; ready: boolean; queue: any[] } = { channel: null, ready: false, queue: [] };

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

// ==================== نظام Presence ====================

export function trackPresence(userId: string): void {
  try {
    const channel = supabase.channel(`presence-online`, {
      config: { presence: { key: userId } },
    });

    channel.subscribe(async (status: string) => {
      if (status === "SUBSCRIBED") {
        await channel.track({
          userId,
          online_at: new Date().toISOString(),
        });
      }
    });
  } catch {
    // Silent fail
  }
}

export function getOnlineUsers(
  callback: (users: string[]) => void,
): () => void {
  try {
    const channel = supabase.channel(`presence-online`, {
      config: { presence: { key: "listener" } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const onlineUsers = Object.keys(state);
        callback(onlineUsers);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel).catch(() => {});
    };
  } catch {
    return () => {};
  }
}

export function isUserOnline(userId: string): boolean {
  try {
    const channel = supabase.channel(`presence-online`, {
      config: { presence: { key: "check" } },
    });
    const state = channel.presenceState();
    return Object.keys(state).includes(userId);
  } catch {
    return false;
  }
}

const supabaseRealtime = {
  getSupabase,
  broadcastEvent,
  trackPresence,
  getOnlineUsers,
  isUserOnline,
};

export default supabaseRealtime;

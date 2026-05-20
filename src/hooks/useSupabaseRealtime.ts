"use client";

import { useEffect, useRef, useCallback } from "react";
import { getSupabase } from "@/lib/supabaseRealtime";

type EventHandler = (data: any) => void;

interface EventConfig {
  event: string;
  handler: EventHandler;
}

type EventsArg = EventConfig[] | string;

function normalizeEvents(events: EventsArg, handler?: EventHandler): EventConfig[] {
  if (typeof events === "string") {
    // التوقيع القديم: (channelName, eventName, handler)
    if (handler) {
      return [{ event: events, handler }];
    }
    return [];
  }
  // التوقيع الجديد: (channelName, EventConfig[])
  return events;
}

export function useSupabaseRealtime(
  channelName: string,
  events: EventsArg,
  handler?: EventHandler,
) {
  const normalizedEvents = normalizeEvents(events, handler);
  const handlersRef = useRef<EventConfig[]>(normalizedEvents);

  useEffect(() => {
    handlersRef.current = normalizedEvents;
  }, [normalizedEvents]);

  const subscribe = useCallback(() => {
    try {
      const supabase = getSupabase();
      const channel = supabase.channel(channelName);

      // ربط جميع الأحداث على نفس القناة
      for (const { event } of normalizedEvents) {
        channel.on("broadcast", { event }, (payload: any) => {
          const currentHandlers = handlersRef.current;
          const config = currentHandlers.find((e) => e.event === event);
          if (config) {
            config.handler(payload.payload);
          }
        });
      }

      channel.subscribe((status: string) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          setTimeout(() => subscribe(), 2000);
        }
      });

      return channel;
    } catch {
      return null;
    }
  }, [channelName, normalizedEvents]);

  useEffect(() => {
    const channel = subscribe();
    return () => {
      if (channel) {
        const supabase = getSupabase();
        supabase.removeChannel(channel).catch(() => {});
      }
    };
  }, [subscribe]);

  // دالة مساعدة للإرسال (اختياري)
  const sendBroadcast = useCallback(
    (event: string, data: any) => {
      // الإرسال يتم عبر broadcastEvent من supabaseRealtime مباشرة
    },
    [],
  );

  return { sendBroadcast };
}

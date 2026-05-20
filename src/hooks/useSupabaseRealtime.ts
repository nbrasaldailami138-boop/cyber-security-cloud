"use client";

import { useEffect, useRef, useCallback } from "react";
import { getSupabase } from "@/lib/supabaseRealtime";

type EventHandler = (data: any) => void;

export function useSupabaseRealtime(
  channelName: string,
  eventName: string,
  handler: EventHandler,
) {
  const handlerRef = useRef<EventHandler>(handler);

  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  const subscribe = useCallback(() => {
    try {
      const supabase = getSupabase();

      const channel = supabase
        .channel(channelName)
        .on("broadcast", { event: eventName }, (payload: any) => {
          handlerRef.current(payload.payload);
        })
        .subscribe((status: string) => {
          if (status === "SUBSCRIBED") {
            // Successfully subscribed
          } else if (status === "CHANNEL_ERROR") {
            // Channel error
          }
        });

      return () => {
        supabase.removeChannel(channel).catch(() => {});
      };
    } catch {
      return () => {};
    }
  }, [channelName, eventName]);

  useEffect(() => {
    const cleanup = subscribe();
    return () => {
      cleanup?.();
    };
  }, [subscribe]);
}

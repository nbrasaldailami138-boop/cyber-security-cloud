import { useEffect, useRef, useCallback } from "react";

type EventHandler = (data: any) => void;

export function usePusher(
  channelName: string,
  eventName: string,
  handler: EventHandler,
) {
  const handlerRef = useRef<EventHandler>(handler);

  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  const subscribe = useCallback(async () => {
    try {
      const PusherClient = (await import("pusher-js")).default;
      const key = process.env.NEXT_PUBLIC_PUSHER_KEY || "";
      const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER || "eu";
      console.log(
        `🔌 Pusher connecting: key=${key.slice(0, 5)}... cluster=${cluster} channel=${channelName}`,
      );
      const pusher = new PusherClient(key, {
        cluster,
      });
      pusher.connection.bind("connected", () => {
        console.log(`🟢 Pusher connected to channel: ${channelName}`);
      });
      pusher.connection.bind("error", (err: any) => {
        console.error(`🔴 Pusher connection error:`, err);
      });
      const channel = pusher.subscribe(channelName);
      channel.bind(eventName, (data: any) => {
        console.log(`📥 Pusher [${channelName}] [${eventName}]:`, data);
        handlerRef.current(data);
      });
      channel.bind("pusher:subscription_succeeded", () => {
        console.log(`✅ Pusher subscribed to: ${channelName}`);
      });
      return () => {
        channel.unbind(eventName);
        pusher.unsubscribe(channelName);
        pusher.disconnect();
      };
    } catch {
      // silent
    }
  }, [channelName, eventName]);

  useEffect(() => {
    const cleanupPromise = subscribe();
    return () => {
      cleanupPromise.then((cleanup) => cleanup?.());
    };
  }, [subscribe]);
}

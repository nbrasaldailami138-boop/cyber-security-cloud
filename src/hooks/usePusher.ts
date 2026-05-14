import { useEffect, useRef, useCallback } from "react";

type EventHandler = (data: any) => void;

export function usePusher(channelName: string, eventName: string, handler: EventHandler) {
  const handlerRef = useRef<EventHandler>(handler);

  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  const subscribe = useCallback(async () => {
    try {
      const PusherClient = (await import("pusher-js")).default;
      const pusher = new PusherClient(process.env.NEXT_PUBLIC_PUSHER_KEY || "", {
        cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || "eu",
      });
      const channel = pusher.subscribe(channelName);
      channel.bind(eventName, (data: any) => handlerRef.current(data));
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

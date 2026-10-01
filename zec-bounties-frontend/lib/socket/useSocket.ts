"use client";

import { useEffect, useRef } from "react";
import { socketClient } from "./socketClient";

export type SocketHandlers = Record<string, (payload: any) => void>;

/**
 * Opens the socket while a user is logged in, closes it on logout/unmount.
 * Call this ONCE (today in BountyProvider; later in the Auth/Socket provider).
 */
export function useSocketConnection(userId: string | undefined) {
  useEffect(() => {
    if (!userId) return;
    socketClient.connect();
    return () => socketClient.disconnect();
  }, [userId]);
}

/**
 * Subscribe to a set of events by type. Handlers are read through a ref that
 * is refreshed every render, so they always see the latest state/functions
 * (no stale closures) without resubscribing.
 *
 *   useSocketEvents({
 *     category_created: (p) => setCategories((prev) => [...prev, p]),
 *   });
 */
export function useSocketEvents(handlers: SocketHandlers) {
  const ref = useRef(handlers);
  ref.current = handlers;

  useEffect(
    () =>
      socketClient.subscribe((msg) => {
        const current = ref.current;
        // hasOwn guard: a type like "constructor" must not hit Object.prototype
        if (Object.prototype.hasOwnProperty.call(current, msg.type)) {
          current[msg.type](msg.payload);
        }
      }),
    [],
  );
}

/** Single-event convenience wrapper. */
export function useSocketEvent(type: string, handler: (payload: any) => void) {
  useSocketEvents({ [type]: handler });
}

"use client";

import { useEffect, useRef, type RefObject } from "react";

export function useClickOutside<T extends HTMLElement>(
  ref: RefObject<T | null>,
  onClose: () => void,
  enabled = true
): void {
  const cb = useRef(onClose);
  cb.current = onClose;

  useEffect(() => {
    if (!enabled) return;
    function onPointerDown(ev: MouseEvent | TouchEvent): void {
      const el = ref.current;
      if (!el || !(ev.target instanceof Node)) return;
      if (!el.contains(ev.target)) {
        cb.current();
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
    };
  }, [ref, enabled]);
}

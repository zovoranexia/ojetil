"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";

/**
 * Minimal disclosure for top-bar menus: closes on outside click, Escape (focus
 * returns to the trigger) and route change by the caller. No portal, so it stays
 * inside the header's stacking context.
 */
export function usePopover<T extends HTMLElement = HTMLButtonElement>() {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<T>(null);
  const id = useId();

  const close = useCallback((restoreFocus = false) => {
    setOpen(false);
    if (restoreFocus) triggerRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close(true);
      }
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close]);

  return {
    open,
    setOpen,
    close,
    rootRef,
    triggerRef,
    menuId: `${id}-menu`,
    triggerProps: {
      "aria-expanded": open,
      "aria-controls": `${id}-menu`,
      "aria-haspopup": "menu" as const,
      onClick: () => setOpen((v) => !v),
    },
  };
}

/** Arrow-key movement between [role^=menuitem] elements inside a menu. */
export function onMenuKeyDown(e: React.KeyboardEvent<HTMLElement>) {
  if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key)) return;
  const items = Array.from(e.currentTarget.querySelectorAll<HTMLElement>('[role^="menuitem"]'));
  if (!items.length) return;
  e.preventDefault();
  const i = items.indexOf(document.activeElement as HTMLElement);
  const next =
    e.key === "Home" ? 0 : e.key === "End" ? items.length - 1 : e.key === "ArrowDown" ? (i + 1) % items.length : (i - 1 + items.length) % items.length;
  items[next]?.focus();
}

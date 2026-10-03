"use client";

import { Toaster as Sonner, toast as sonner, type ToasterProps } from "sonner";

import { IconAlert, IconCheck, IconClose } from "@/components/primitives/icon/icons";
import { cn } from "@/lib/utils";

/*
 * Toasts — reference nova.css §13 (.toast-region, .toast) and nova.js
 * NOVA.toast. Sonner owns the queue, stacking, swipe-to-dismiss and the polite
 * live region; every toast is rendered with toast.custom() so the markup is
 * the reference .toast: icon, message, dismiss button.
 */

function Toaster(props: ToasterProps) {
  return (
    <Sonner
      position="bottom-center"
      duration={4800}
      gap={8}
      offset={24}
      mobileOffset={16}
      className="print:hidden"
      toastOptions={{ className: "w-toast" }}
      {...props}
    />
  );
}

type ToastKind = "success" | "error";

/* .toast svg is 18px for every icon in it — the dismiss glyph included
   (the reference's width="16" attribute loses to that rule) — and takes the
   kind colour from .toast--success / .toast--error svg. */
const KIND: Record<ToastKind, string> = {
  success: "[&_svg]:text-success",
  error: "[&_svg]:text-error",
};

/** NOVA.toast(message, kind) — raise a toast. */
function notify(message: string, kind: ToastKind = "success", opts: { dismissLabel?: string } = {}) {
  const Icon = kind === "error" ? IconAlert : IconCheck;
  return sonner.custom((id) => (
    <div
      className={cn(
        "flex animate-toast-in items-start gap-3 rounded-xl bg-ink px-4 py-3 text-caption text-on-ink shadow-overlay",
        "[&_svg]:size-4.5 [&_svg]:flex-none",
        KIND[kind],
      )}
    >
      <Icon />
      <span>{message}</span>
      {/* background:none, border:0 — the browser's button padding stays, as in the reference */}
      <button
        type="button"
        aria-label={opts.dismissLabel ?? "Dismiss"}
        onClick={() => sonner.dismiss(id)}
        className="ms-auto cursor-pointer border-0 bg-transparent text-inherit opacity-70 hover:opacity-100"
      >
        <IconClose />
      </button>
    </div>
  ));
}

export { Toaster, notify };

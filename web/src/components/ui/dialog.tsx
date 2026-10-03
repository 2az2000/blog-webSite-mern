"use client";

import * as React from "react";
import { Dialog as DialogPrimitive } from "radix-ui";

import { IconButton } from "@/components/ui/button";
import { IconClose } from "@/components/primitives/icon/icons";
import { cn } from "@/lib/utils";

/*
 * Modal — reference nova.css §13 (.modal-backdrop > .modal) on Radix Dialog.
 * Radix provides what nova.js did by hand: focus trap, Escape to close, focus
 * returned to the opener, scroll lock, aria-modal and labelling.
 * The content sits INSIDE the overlay (Radix's scrollable-overlay pattern), so
 * the DOM is the reference's backdrop > modal and the backdrop centres it.
 * A modal never carries primary-flow navigation.
 */

function Dialog(props: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />;
}

function DialogTrigger(props: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
}

function DialogPortal(props: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />;
}

function DialogClose(props: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
}

/** .modal-backdrop */
function DialogOverlay({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={cn(
        "fixed inset-0 z-160 grid place-items-center overflow-y-auto bg-overlay p-6",
        "data-[state=closed]:animate-fade-out data-[state=open]:animate-fade-in",
        className,
      )}
      {...props}
    />
  );
}

/** .modal */
function DialogContent({
  className,
  children,
  showCloseButton = false,
  closeLabel = "Close",
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  /** The reference modal closes from its footer; the corner button is opt-in. */
  showCloseButton?: boolean;
  closeLabel?: string;
}) {
  return (
    <DialogPortal>
      <DialogOverlay>
        <DialogPrimitive.Content
          data-slot="dialog-content"
          className={cn(
            "relative grid w-modal gap-4 rounded-xl border border-border bg-surface-2 p-8 shadow-overlay",
            "data-[state=closed]:animate-modal-out data-[state=open]:animate-modal-in",
            className,
          )}
          {...props}
        >
          {children}
          {showCloseButton && (
            <DialogPrimitive.Close asChild>
              <IconButton className="absolute end-3 top-3" aria-label={closeLabel}>
                <IconClose />
              </IconButton>
            </DialogPrimitive.Close>
          )}
        </DialogPrimitive.Content>
      </DialogOverlay>
    </DialogPortal>
  );
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="dialog-header" className={cn("grid content-start gap-4", className)} {...props} />;
}

/** The reference footer: .row.row--end.mt-24 */
function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn("mt-6 flex flex-wrap items-center justify-end gap-4", className)}
      {...props}
    />
  );
}

/** h2.t-h3 */
function DialogTitle({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn("text-h3 leading-h3 tracking-h3", className)}
      {...props}
    />
  );
}

/** p.t-body-sm */
function DialogDescription({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn("text-body-sm leading-160 text-fg-soft", className)}
      {...props}
    />
  );
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
};

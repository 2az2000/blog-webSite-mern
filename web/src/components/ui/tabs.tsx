"use client";

import * as React from "react";
import { Tabs as TabsPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";

/*
 * Tabs — reference nova.css §13 (.tabs, .tabs button) on Radix Tabs. Triggers
 * render as <button role="tab" aria-selected>, the reference markup.
 * Arrow keys follow the document direction.
 */

function Tabs(props: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return <TabsPrimitive.Root data-slot="tabs" {...props} />;
}

function TabsList({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.List>) {
  return <TabsPrimitive.List data-slot="tabs-list" className={cn("flex gap-6 border-b border-border", className)} {...props} />;
}

function TabsTrigger({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "-mb-px min-h-11 cursor-pointer border-0 border-b-2 border-transparent bg-transparent px-0 py-3",
        "text-label font-550 text-meta transition-[color,border-color] duration-180 ease-in-out hover:text-fg",
        "aria-selected:border-fg aria-selected:font-650 aria-selected:text-fg",
        className,
      )}
      {...props}
    />
  );
}

function TabsContent({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return <TabsPrimitive.Content data-slot="tabs-content" className={cn("outline-none", className)} {...props} />;
}

export { Tabs, TabsList, TabsTrigger, TabsContent };

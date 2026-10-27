import type { Metadata } from "next";

import { AdminShell } from "@/components/admin/admin-shell";

/* The back office is for staff: nothing under /admin belongs in a search index. */
export const metadata: Metadata = {
  title: "Back office",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return <AdminShell>{children}</AdminShell>;
}

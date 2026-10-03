import { z } from "zod";

import type { Dictionary } from "@/i18n/dictionaries";

/*
 * Field rules from the reference validator (nova.js initForms), with its
 * exact messages. Build schemas from these so every form fails the same way.
 */

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const fields = (t: Dictionary) => ({
  required: (label: string) => z.string().trim().min(1, t.form.requiredError(label)),
  email: (label: string) => z.string().trim().min(1, t.form.requiredError(label)).regex(EMAIL, t.form.emailError),
  password: (label: string) => z.string().min(1, t.form.requiredError(label)).min(8, t.form.passwordError),
});

/** Simulated network latency for mock submissions (reference: 900ms). */
export const mockSubmit = (ms = 900) => new Promise((r) => setTimeout(r, ms));

import { api } from "@/lib/api";
import type { DispatchPrefs } from "@/lib/reader-api";
import type { Device, Me } from "@/types/admin";

/** The account endpoints (`/api/v1/auth/*`). Sessions are httpOnly cookies the browser manages. */
export const auth = {
  me: () => api<{ user: Me }>("/auth/me").then((r) => r.data.user),
  signIn: (email: string, password: string) =>
    api<{ user: Me }>("/auth/login", { method: "POST", body: { email, password } }).then((r) => r.data.user),
  signOut: () => api<void>("/auth/logout", { method: "POST" }),
  register: (name: string, email: string, password: string) =>
    api<{ next: string }>("/auth/register", { method: "POST", body: { name, email, password } }).then((r) => r.data),
  verifyEmail: (email: string, code: string) => api<unknown>("/auth/verify-email", { method: "POST", body: { email, code } }),
  resendCode: (email: string) => api<unknown>("/auth/verify-email/resend", { method: "POST", body: { email } }),
  forgotPassword: (email: string) => api<unknown>("/auth/forgot-password", { method: "POST", body: { email } }),
  resetPassword: (token: string, password: string) =>
    api<unknown>("/auth/reset-password", { method: "POST", body: { token, password } }),
};

/** Account settings — everything here acts on the signed-in person's own account. */
export const account = {
  rename: (name: string) => api<{ user: Me }>("/auth/me/profile", { method: "PATCH", body: { name } }).then((r) => r.data.user),
  changePassword: (currentPassword: string, password: string) =>
    api<{ ok: true }>("/auth/me/change-password", { method: "POST", body: { currentPassword, password } }),
  devices: () => api<Device[]>("/auth/me/sessions").then((r) => r.data),
  signOutDevice: (id: string) => api<void>(`/auth/me/sessions/${encodeURIComponent(id)}`, { method: "DELETE" }),
  signOutOthers: () => api<{ signedOut: number }>("/auth/me/sessions/sign-out-others", { method: "POST" }).then((r) => r.data.signedOut),
  /** The whole record, as the API sends it; the screen turns it into a file. */
  exportData: () => api<unknown>("/auth/me/export").then((r) => r.data),
  remove: (password: string) => api<void>("/auth/me", { method: "DELETE", body: { password } }),
  dispatch: () => api<DispatchPrefs | null>("/newsletter/mine").then((r) => r.data),
  saveDispatch: (body: { subscribed: boolean; topics?: string[]; frequency?: DispatchPrefs["frequency"] }) =>
    api<DispatchPrefs | null>("/newsletter/mine", { method: "PUT", body }).then((r) => r.data),
};

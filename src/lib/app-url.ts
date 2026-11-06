import "server-only";
import { headers } from "next/headers";
import { env } from "@/lib/env";
import { isPrivateUrl } from "@/lib/url-host";

export { isPrivateUrl };

/**
 * The public address of the LMS, used for every link that leaves the site (emails such as
 * "Your application is approved → Open my dashboard", and Stripe's return pages).
 *
 * Why this exists: links used to be built from APP_URL alone, which defaults to
 * http://localhost:3000. On a server where APP_URL was missing, or still pointed at the private
 * address the app was first set up on, the approval email linked to a page the student could not
 * reach ("page not found"). Now:
 *   1. APP_URL is used when it is set to a public address (the normal, recommended setup);
 *   2. otherwise the address the current request came in on is used (the domain the admin is using
 *      when they press Approve, or the domain Stripe called for the webhook);
 *   3. only if neither is available does it fall back to APP_URL / localhost.
 * Trailing slashes are removed so links never contain "//dashboard".
 */
export async function appBaseUrl(): Promise<string> {
  const configured = configuredAppUrl();
  if (configured && !isPrivateUrl(configured)) return configured;
  const fromRequest = await requestOrigin();
  if (fromRequest && !isPrivateUrl(fromRequest)) return fromRequest;
  return configured ?? fromRequest ?? trimSlash(env().APP_URL);
}

/** Absolute link to a path on the LMS, e.g. appLink("/dashboard"). */
export async function appLink(path: string): Promise<string> {
  return `${await appBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`;
}

/** APP_URL as set in the environment, or null when it was left out (the schema's default doesn't count). */
export function configuredAppUrl(): string | null {
  const raw = process.env.APP_URL?.trim().replace(/^(["'])(.*)\1$/, "$2");
  if (!raw) return null;
  try {
    const u = new URL(raw);
    return trimSlash(`${u.origin}${u.pathname}`);
  } catch {
    return null;
  }
}

/**
 * Why email links may not work, in plain words for the admin home page, or null when they're fine.
 * Shown only in production: in development localhost is expected.
 */
export function appUrlProblem(): string | null {
  if (env().NODE_ENV !== "production") return null;
  const configured = configuredAppUrl();
  if (!configured) return "APP_URL is not set on the server. Links in emails (such as the approval email) use the address of whoever triggered them, which can be wrong. Set APP_URL to the LMS's public address, e.g. https://lms.brighthorizoninstitute.com.";
  if (isPrivateUrl(configured)) return `APP_URL is set to ${configured}, which students can't open from outside your network. Links in emails will use the site's public address instead when one is available; set APP_URL to the public address to be sure.`;
  return null;
}

async function requestOrigin(): Promise<string | null> {
  try {
    const h = await headers();
    const host = first(h.get("x-forwarded-host")) ?? h.get("host");
    if (!host || !/^[a-z0-9.\-:[\]]+$/i.test(host)) return null;
    const proto = first(h.get("x-forwarded-proto")) ?? (isPrivateUrl(`http://${host}`) ? "http" : "https");
    if (proto !== "http" && proto !== "https") return null;
    return `${proto}://${host}`;
  } catch {
    // Not inside a request (scripts, tests).
    return null;
  }
}

const first = (v: string | null) => v?.split(",")[0]?.trim() || null;
const trimSlash = (s: string) => s.replace(/\/+$/, "");

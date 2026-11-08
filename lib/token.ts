/**
 * Isomorphic base64url encode/decode of the wish payload.
 * Works in the browser (btoa/atob) and on the server / edge (Buffer or atob).
 * The payload is kept tiny so the whole wish fits in a shareable URL — the
 * same trick the original app used with /w/QW1hbg ("Aman"), extended to carry
 * festival, recipient, sender and message.
 */

export interface WishData {
  f: string; // festival id
  t: string; // to (recipient) — may be empty
  s?: string; // sender
  m?: string; // custom message
}

function toBase64Url(str: string): string {
  let b64: string;
  if (typeof btoa === "function") {
    b64 = btoa(unescape(encodeURIComponent(str)));
  } else {
    b64 = Buffer.from(str, "utf-8").toString("base64");
  }
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(token: string): string {
  const b64 = token.replace(/-/g, "+").replace(/_/g, "/");
  if (typeof atob === "function") {
    return decodeURIComponent(escape(atob(b64)));
  }
  return Buffer.from(b64, "base64").toString("utf-8");
}

export function encodeWish(data: WishData): string {
  const clean: WishData = { f: data.f, t: data.t };
  if (data.s) clean.s = data.s;
  if (data.m) clean.m = data.m;
  return toBase64Url(JSON.stringify(clean));
}

export function decodeWish(token: string): WishData | null {
  try {
    const obj = JSON.parse(fromBase64Url(token));
    if (!obj || typeof obj.f !== "string") return null;
    const t = typeof obj.t === "string" ? obj.t.trim() : "";
    return {
      f: String(obj.f),
      t: t.toLowerCase() === "friend" ? "" : t.slice(0, 60), // old links used "friend" as a filler
      s: obj.s ? String(obj.s).slice(0, 60) : undefined,
      m: obj.m ? String(obj.m).slice(0, 300) : undefined,
    };
  } catch {
    return null;
  }
}

"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { encodeWish } from "@/lib/token";
import type { Festival } from "@/lib/festivals";

export default function CreateForm({ festival }: { festival: Festival }) {
  const [to, setTo] = useState("");
  const [from, setFrom] = useState("");
  const [msg, setMsg] = useState("");
  const [copied, setCopied] = useState(false);

  const token = useMemo(
    () =>
      encodeWish({
        f: festival.id,
        t: to.trim(),
        s: from.trim() || undefined,
        m: msg.trim() || undefined,
      }),
    [festival.id, to, from, msg]
  );

  // read the origin after mount — reading it during render makes the server
  // and client HTML differ (hydration mismatch)
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);
  const link = `${origin}/w/${token}`;

  const accent = festival.theme.accent;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {}
  };

  const waText = encodeURIComponent(
    `I made you a ${festival.name} wish 🎁 Tap to open: ${link}`
  );

  return (
    <main
      className="min-h-dvh px-5 max-w-md mx-auto"
      style={{ paddingTop: "calc(env(safe-area-inset-top) + 24px)", paddingBottom: "calc(env(safe-area-inset-bottom) + 28px)" }}
    >
      <Link href="/" className="text-sm" style={{ color: "#9aa4b8" }}>
        ← Choose another festival
      </Link>

      <h1 className="mt-4 text-2xl font-extrabold">
        {festival.emoji} {festival.name} wish
      </h1>
      <p className="mt-2 text-sm leading-relaxed" style={{ color: "#9aa4b8" }}>
        {festival.wish}
      </p>

      <div className="mt-6 space-y-4">
        <Field label="Who is it for?">
          <input
            value={to}
            onChange={(e) => setTo(e.target.value)}
            maxLength={40}
            placeholder="Their name"
            className="field-input"
          />
        </Field>
        <Field label="Your name">
          <input
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            maxLength={40}
            placeholder="Your name"
            className="field-input"
          />
        </Field>
        <Field label="Add a personal note (optional)">
          <textarea
            value={msg}
            onChange={(e) => setMsg(e.target.value)}
            maxLength={200}
            placeholder="A short line from the heart…"
            className="field-input min-h-[88px] resize-none"
          />
        </Field>
      </div>

      <div className="mt-6 space-y-3">
        <Link
          href={`/w/${token}`}
          className="block text-center rounded-2xl py-4 font-bold text-lg"
          style={{ background: accent, color: "#1a1206" }}
        >
          Preview the wish ✨
        </Link>

        <div className="rounded-2xl p-4" style={{ background: "#0e1526", border: "1px solid rgba(255,255,255,.1)" }}>
          <p className="text-xs mb-2" style={{ color: "#9aa4b8" }}>
            Share link
          </p>
          <div className="flex gap-2">
            <div className="field-input flex-1 min-w-0 truncate select-all" style={{ fontSize: 13 }}>
              {link}
            </div>
            <button
              onClick={copy}
              className="px-4 rounded-xl font-semibold text-sm"
              style={{ background: accent, color: "#1a1206" }}
            >
              {copied ? "✓" : "Copy"}
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-3">
            <a
              href={`https://wa.me/?text=${waText}`}
              target="_blank"
              rel="noreferrer"
              className="text-center rounded-xl py-3 text-sm font-semibold border"
              style={{ borderColor: "rgba(255,255,255,.12)" }}
            >
              💬 WhatsApp
            </a>
            <a
              href={`/w/${token}`}
              className="text-center rounded-xl py-3 text-sm font-semibold border"
              style={{ borderColor: "rgba(255,255,255,.12)" }}
            >
              👁 Open
            </a>
          </div>
        </div>
      </div>

      <style>{`
        .field-input{
          width:100%; background:#0e1526; border:1px solid rgba(255,255,255,.12);
          color:#f6f1e7; border-radius:14px; padding:13px 15px; font-size:16px; outline:none;
        }
        .field-input:focus{ border-color:${accent}; }
      `}</style>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[13px] mb-1.5" style={{ color: "#9aa4b8" }}>
        {label}
      </span>
      {children}
    </label>
  );
}

import Link from "next/link";
import { FESTIVALS } from "@/lib/festivals";

export default function HomePage() {
  return (
    <main
      className="min-h-dvh px-5 max-w-md mx-auto"
      style={{ paddingTop: "calc(env(safe-area-inset-top) + 36px)", paddingBottom: "calc(env(safe-area-inset-bottom) + 28px)" }}
    >
      <div className="text-sm tracking-[3px] uppercase font-bold" style={{ color: "#f5a623" }}>
        ✦ Festive
      </div>
      <h1 className="mt-2 text-3xl font-extrabold leading-tight">
        Send a wish that feels like a gift
      </h1>
      <p className="mt-3 text-[15px] leading-relaxed" style={{ color: "#9aa4b8" }}>
        Pick a festival, add a name and your message, and share a personalized 3D
        animated wish. One tap for them to open — with lights, sound and fireworks.
      </p>

      {FESTIVALS.length === 1 ? (
        // single festival: one big, inviting call to action
        <Link
          href={`/create/${FESTIVALS[0].id}`}
          className="mt-8 flex items-center gap-4 rounded-3xl p-5 border transition active:scale-[0.99] hover:-translate-y-0.5"
          style={{
            background: "linear-gradient(135deg, #1a1226, #0e1526)",
            borderColor: "rgba(255,179,71,.35)",
            boxShadow: "0 0 40px rgba(255,179,71,.12)",
          }}
        >
          <span className="text-5xl">{FESTIVALS[0].emoji}</span>
          <span className="flex-1">
            <span className="block text-lg font-bold">Create your {FESTIVALS[0].name} wish</span>
            <span className="block text-sm mt-0.5" style={{ color: "#9aa4b8" }}>
              {FESTIVALS[0].tag} · takes 20 seconds
            </span>
          </span>
          <span className="text-2xl" style={{ color: "#ffb347" }}>→</span>
        </Link>
      ) : (
        <div className="mt-7 grid grid-cols-2 gap-3">
          {FESTIVALS.map((f) => (
            <Link
              key={f.id}
              href={`/create/${f.id}`}
              className="rounded-2xl p-5 text-center border transition hover:-translate-y-1"
              style={{ background: "#0e1526", borderColor: "rgba(255,255,255,.1)" }}
            >
              <span className="block text-4xl mb-2">{f.emoji}</span>
              <span className="block font-semibold">{f.name}</span>
              <span className="block text-xs mt-1" style={{ color: "#9aa4b8" }}>
                {f.tag}
              </span>
            </Link>
          ))}
        </div>
      )}

      <p className="mt-10 text-center text-xs" style={{ color: "#6b7280" }}>
        made with ✦ Festive
      </p>
    </main>
  );
}

import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-dvh grid place-items-center px-6 text-center">
      <div>
        <div className="text-5xl mb-4">🪔</div>
        <h1 className="text-xl font-bold">This wish could not be opened</h1>
        <p className="mt-2 text-sm" style={{ color: "#9aa4b8" }}>
          The link may be broken or incomplete.
        </p>
        <Link
          href="/"
          className="inline-block mt-6 rounded-full px-6 py-3 font-semibold"
          style={{ background: "#f5a623", color: "#1a1206" }}
        >
          Create your own wish
        </Link>
      </div>
    </main>
  );
}

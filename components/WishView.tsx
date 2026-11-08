"use client";

import dynamic from "next/dynamic";
import type { Festival } from "@/lib/festivals";
import type { WishData } from "@/lib/token";

// Load the 3D experience on the client only — the scene builds canvas textures
// with `document`, which doesn't exist during server rendering.
const WishClient = dynamic(() => import("./WishClient"), {
  ssr: false,
  loading: () => <Splash />,
});

function Splash() {
  return (
    <div className="fixed inset-0 grid place-items-center" style={{ background: "#070b14" }}>
      <div className="text-center">
        <div className="text-5xl mb-4 animate-pulse-soft">🪔</div>
        <div className="text-lg font-semibold" style={{ color: "#f6f1e7" }}>
          Festive
        </div>
        <div className="text-xs tracking-[4px] uppercase mt-1" style={{ color: "#9aa4b8" }}>
          presents
        </div>
        <div className="mt-5 w-32 h-1 mx-auto rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,.1)" }}>
          <div className="h-full w-1/3 animate-pulse-soft" style={{ background: "#f5a623" }} />
        </div>
      </div>
    </div>
  );
}

export default function WishView({ festival, data }: { festival: Festival; data: WishData }) {
  return <WishClient festival={festival} data={data} />;
}

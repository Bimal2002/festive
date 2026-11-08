/**
 * FESTIVAL TEMPLATE REGISTRY  (3D engine)
 * ---------------------------------------------------------------------------
 * Focused on Diwali. The engine stays template-driven: append another object
 * to FESTIVALS and it appears in the picker, create flow, 3D scene and share
 * image with its own colours and text.
 */

export type ActKey = "ignite" | "reveal" | "interact" | "finale";

export interface Festival {
  id: string;
  name: string;
  emoji: string;
  tag: string;
  greeting: string; // headline in the sparkler finale
  greetingAlt: string; // headline for the share image (ASCII-safe)
  wish: string;
  acts: ActKey[];
  hints: { ignite: string; interact: string };
  theme: {
    skyTop: string;
    skyBottom: string;
    ground: string;
    accent: string; // warm flame / UI colour
    accent2: string;
    text: string;
  };
  scene: {
    diyaCount: number;
    fairyLightColors: string[];
    lanternColor: string;
    fireworkColors: string[];
    rangoliPalette: string[];
    igniteObject: "diya" | "colorPot" | "lamp";
  };
}

export const FESTIVALS: Festival[] = [
  {
    id: "diwali",
    name: "Diwali",
    emoji: "🪔",
    tag: "Festival of Lights",
    greeting: "Happy Diwali",
    greetingAlt: "Happy Diwali",
    wish: "May the light of a thousand diyas fill your home with joy, prosperity and peace. Happy Diwali to you and your family!",
    acts: ["ignite", "reveal", "interact", "finale"],
    hints: {
      ignite: "Tap the diya to light it",
      interact: "Tap to release a sky lantern",
    },
    theme: {
      skyTop: "#03050d",
      skyBottom: "#1b1030",
      ground: "#a8957f",
      accent: "#ffb347",
      accent2: "#ff6b6b",
      text: "#f6f1e7",
    },
    scene: {
      diyaCount: 30,
      fairyLightColors: ["#ffd27a", "#ffb347", "#ff8a5b", "#ffe9b0", "#9ad0ff", "#ff9ad0"],
      lanternColor: "#ffb24d",
      fireworkColors: ["#ff3355", "#ffd166", "#3fd0ff", "#7cff6b", "#c77dff", "#ff8a3d", "#ffffff"],
      rangoliPalette: ["#ff3d6e", "#ffb347", "#3fc5ff", "#5bd68a", "#c77dff"],
      igniteObject: "diya",
    },
  },
];

export const FESTIVAL_MAP: Record<string, Festival> = Object.fromEntries(
  FESTIVALS.map((f) => [f.id, f])
);

export function getFestival(id: string | undefined | null): Festival {
  return (id && FESTIVAL_MAP[id]) || FESTIVALS[0];
}

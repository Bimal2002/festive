import type { Metadata, Viewport } from "next";
import "./globals.css";

// Absolute base for share-preview (Open Graph) image URLs.
// On Vercel this resolves to your production domain automatically;
// set NEXT_PUBLIC_SITE_URL if you add a custom domain.
const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL && `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`) ||
  (process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`) ||
  "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Festive — send a wish that feels like a gift",
  description:
    "Create a personalized, animated 3D festival wish with sound. Diwali, Holi, Navratri and more. Add a name and share in one tap.",
};

export const viewport: Viewport = {
  themeColor: "#070b14",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover", // draw under the notch; we pad with safe-area insets
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}

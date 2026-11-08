import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { getFestival } from "@/lib/festivals";
import { decodeWish } from "@/lib/token";
import WishView from "@/components/WishView";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ token: string }> };

export async function generateViewport({ params }: Props): Promise<Viewport> {
  const { token } = await params;
  const data = decodeWish(token);
  const f = getFestival(data?.f);
  return {
    themeColor: f.theme.skyTop,
    width: "device-width",
    initialScale: 1,
    maximumScale: 1, // the wish is a full-screen interactive scene
    viewportFit: "cover",
  };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  const data = decodeWish(token);
  if (!data) return { title: "Festive" };
  const f = getFestival(data.f);
  const title = `${data.s || "Someone"} sent you a ${f.name} gift`;
  const description = `Tap to open your ${f.name} gift — best with the sound on.`;
  return {
    title,
    description,
    robots: { index: false, follow: false },
    openGraph: {
      title,
      description,
      images: [{ url: `/api/og/${token}`, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`/api/og/${token}`],
    },
  };
}

export default async function WishPage({ params }: Props) {
  const { token } = await params;
  const data = decodeWish(token);
  if (!data) notFound();
  const festival = getFestival(data.f);
  return <WishView festival={festival} data={data} />;
}

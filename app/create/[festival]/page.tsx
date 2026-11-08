import { notFound } from "next/navigation";
import { FESTIVAL_MAP, FESTIVALS } from "@/lib/festivals";
import CreateForm from "@/components/CreateForm";

export function generateStaticParams() {
  return FESTIVALS.map((f) => ({ festival: f.id }));
}

export default async function CreatePage({ params }: { params: Promise<{ festival: string }> }) {
  const { festival: id } = await params;
  const festival = FESTIVAL_MAP[id];
  if (!festival) notFound();
  return <CreateForm festival={festival} />;
}

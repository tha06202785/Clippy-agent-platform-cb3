"use client";
export const dynamic = "force-dynamic";
import { useParams } from "next/navigation";
export default function PropertyRoomPage() {
  const params = useParams();
  const id = params?.id as string;
  return <div className="p-6"><h1 className="text-2xl font-bold">Property Room</h1><p>Property ID: {id}</p></div>;
}

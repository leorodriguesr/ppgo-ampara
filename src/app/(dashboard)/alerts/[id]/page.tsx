"use client";

import { useParams } from "next/navigation";

import { AlertDetailView } from "@/components/alerts/alert-detail";

export default function AlertDetailPage() {
  const params = useParams<{ id: string }>();
  return <AlertDetailView alertId={params.id} />;
}

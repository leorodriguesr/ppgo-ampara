import type { Metadata } from "next";

import { OperationsBoard } from "@/components/operations/operations-board";

export const metadata: Metadata = {
  title: "Ampara - Acompanhamento Geral",
};

export default function DashboardHomePage() {
  return <OperationsBoard />;
}

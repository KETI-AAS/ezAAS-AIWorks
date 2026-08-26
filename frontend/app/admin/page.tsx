import type { Metadata } from "next"

import { AdminDashboard } from "@/components/admin/admin-dashboard"

export const metadata: Metadata = {
  title: "Admin — AI Capability Registry",
  description: "AI Capability Registry 관리자 대시보드 및 AAS 관리.",
}

export default function AdminPage() {
  return <AdminDashboard />
}

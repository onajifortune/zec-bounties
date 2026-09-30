// app/admin/teams/layout.tsx
"use client";

import type { ReactNode } from "react";
import { AdminNavbar } from "@/components/layout/admin/navbar";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { useRoleGuard } from "@/hooks/use-role-guard";

export default function AdminTeamsLayout({
  children,
}: {
  children: ReactNode;
}) {
  useRoleGuard("ADMIN");

  return (
    <ProtectedRoute requireAdmin>
      <main className="min-h-screen bg-background text-foreground">
        <AdminNavbar isAdmin />
        {children}
      </main>
    </ProtectedRoute>
  );
}

"use client";
import { Suspense } from "react";
import { AppShell } from "@/ui/AppShell";
import { DiffScreen } from "@/ui/screens/DiffScreen";

export default function Page() {
  return (
    <AppShell active="history">
      <Suspense fallback={<p className="eyebrow">Loading…</p>}>
        <DiffScreen />
      </Suspense>
    </AppShell>
  );
}

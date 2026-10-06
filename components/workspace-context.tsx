"use client";
import { createContext, useContext } from "react";
import type { SessionView } from "@/lib/view-types";
type Workspace = { user: SessionView; refresh: () => Promise<void> };
export const WorkspaceContext = createContext<Workspace | null>(null);
export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) throw new Error("Workspace provider is required.");
  return context;
}

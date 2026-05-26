"use client";

import type { ReactNode } from "react";
import { PlayerProvider, usePlayer } from "./PlayerContext";
import { StickyPlayer } from "./StickyPlayer";

export function PlayerShell({ children }: { children: ReactNode }) {
  return (
    <PlayerProvider>
      {children}
      <PlayerSpacer />
      <StickyPlayer />
    </PlayerProvider>
  );
}

// Pushes page content up so the sticky player doesn't cover the last items.
function PlayerSpacer() {
  const { current } = usePlayer();
  if (!current) return null;
  return <div aria-hidden="true" className="h-24" />;
}

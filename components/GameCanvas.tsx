"use client";

import { useEffect, useRef } from "react";
import type Phaser from "phaser";
import { GameHud } from "@/components/GameHud";

export default function GameCanvas() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    if (!containerRef.current || gameRef.current) return;

    let cancelled = false;
    (async () => {
      const { createGame } = await import("@/game/main");
      if (cancelled || !containerRef.current) return;
      gameRef.current = createGame(containerRef.current);
    })();

    return () => {
      cancelled = true;
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, []);

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-ink">
      <div ref={containerRef} className="absolute inset-0" />
      <GameHud />
    </main>
  );
}

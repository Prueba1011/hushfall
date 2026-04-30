"use client";

import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Sparkles,
  Skull,
  Feather,
  Wind,
  Footprints,
  MousePointer2,
} from "lucide-react";
import Link from "next/link";

type World = "living" | "broken";

type MemoryProgress = {
  collected: number;
  total: number;
};

type EndingDetail = {
  kicker: string;
  title: string;
  body: string;
  epilogue?: string;
  prompt: string;
  releasedCount: number;
};

export function GameHud() {
  const [world, setWorld] = useState<World>("living");
  const [levelTitle, setLevelTitle] = useState("The Stilled Kitchen");
  const [objective, setObjective] = useState<string>(
    "Find the lost ones. They remember where their souls fell."
  );
  const [memoryProgress, setMemoryProgress] = useState<MemoryProgress>({
    collected: 0,
    total: 3,
  });
  const [ending, setEnding] = useState<EndingDetail | null>(null);
  const [showExitHint, setShowExitHint] = useState(false);

  useEffect(() => {
    function onChange(e: Event) {
      const detail = (e as CustomEvent<World>).detail;
      setWorld(detail);
    }
    function onMemories(e: Event) {
      const detail = (e as CustomEvent<MemoryProgress | number>).detail;
      if (typeof detail === "number") {
        setMemoryProgress({
          collected: Math.max(0, detail),
          total: 3,
        });
        return;
      }
      if (!detail || typeof detail.collected !== "number" || typeof detail.total !== "number") {
        return;
      }
      setMemoryProgress({
        collected: Math.max(0, detail.collected),
        total: Math.max(1, detail.total),
      });
    }
    function onLevelTitle(e: Event) {
      const detail = (e as CustomEvent<string>).detail;
      if (!detail) return;
      setLevelTitle(detail);
    }
    function onObjective(e: Event) {
      const detail = (e as CustomEvent<string>).detail;
      if (!detail) return;
      setObjective(detail);
    }
    function onEnding(e: Event) {
      const detail = (e as CustomEvent<EndingDetail | null>).detail;
      setEnding(detail ?? null);
    }
    window.addEventListener("hushfall:world", onChange as EventListener);
    window.addEventListener("hushfall:memories", onMemories as EventListener);
    window.addEventListener("hushfall:level-title", onLevelTitle as EventListener);
    window.addEventListener("hushfall:objective", onObjective as EventListener);
    window.addEventListener("hushfall:ending", onEnding as EventListener);
    return () => {
      window.removeEventListener("hushfall:world", onChange as EventListener);
      window.removeEventListener(
        "hushfall:memories",
        onMemories as EventListener
      );
      window.removeEventListener(
        "hushfall:level-title",
        onLevelTitle as EventListener
      );
      window.removeEventListener(
        "hushfall:objective",
        onObjective as EventListener
      );
      window.removeEventListener(
        "hushfall:ending",
        onEnding as EventListener
      );
    };
  }, []);

  const isLiving = world === "living";
  const accent = isLiving ? "text-ember" : "text-glass";
  const accentBorder = isLiving ? "border-ember/40" : "border-glass/40";
  const accentDot = isLiving ? "hf-dot-ember" : "hf-dot-glass";
  const memories = memoryProgress.collected;
  const memoryTotal = memoryProgress.total;
  const won = ending !== null;
  const exitReady = memories >= memoryTotal && !won;

  useEffect(() => {
    if (!exitReady) {
      setShowExitHint(false);
      return;
    }

    setShowExitHint(true);
    const timeout = window.setTimeout(() => {
      setShowExitHint(false);
    }, 4800);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [exitReady, world]);

  return (
    <>
      <div className="vignette pointer-events-none absolute inset-0 z-10" />
      <div className="hf-scanlines pointer-events-none absolute inset-0 z-10" />

      <Link
        href="/"
        className="hf-leave group absolute left-6 top-6 z-20 inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.4em] text-bone/55 transition hover:text-bone"
      >
        <span className="hf-leave-rule" aria-hidden />
        <ArrowLeft
          className="h-3 w-3 transition-transform group-hover:-translate-x-0.5"
          strokeWidth={1.5}
        />
        <span>Leave</span>
      </Link>

      <div className="absolute left-1/2 top-6 z-20 flex -translate-x-1/2 flex-col items-center gap-2.5">
        <div
          className={`hf-badge flex items-center gap-2.5 px-5 py-1.5 text-[10px] uppercase tracking-[0.5em] ${accent} ${accentBorder}`}
        >
          {isLiving ? (
            <Sparkles className="h-3 w-3" strokeWidth={1.5} />
          ) : (
            <Skull className="h-3 w-3" strokeWidth={1.5} />
          )}
          <span>{isLiving ? "Living" : "Broken"}</span>
          <span className="hf-badge-sep" aria-hidden />
          <span className="text-bone/45">World</span>
        </div>

        <div
          className="hf-memory"
          aria-label={`${memories} of ${memoryTotal} memories returned`}
        >
          <Feather className="h-3 w-3 text-bone/45" strokeWidth={1.5} />
          <span className="text-[9px] uppercase tracking-[0.45em] text-bone/45">
            Memories
          </span>
          <span className="hf-memory-dots">
            {Array.from({ length: memoryTotal }, (_, i) => (
              <span
                key={i}
                className={`hf-memory-dot ${
                  i < memories ? `hf-memory-on ${accentDot}` : ""
                }`}
              />
            ))}
          </span>
          <span className="text-[9px] tabular-nums text-bone/55">
            {memories}/{memoryTotal}
          </span>
        </div>

        {!won ? (
          <div
            key={objective}
            className="hf-objective flex w-[min(92vw,44rem)] items-center justify-center gap-3 px-7 py-3 text-bone/90"
          >
            <span className="hf-objective-rule" aria-hidden />
            <span className="font-body text-center italic leading-snug text-[15px]">
              {objective}
            </span>
            <span className="hf-objective-rule" aria-hidden />
          </div>
        ) : null}

        {showExitHint ? (
          <div className="hf-exit-banner w-[min(92vw,30rem)] px-4 py-3 text-center text-bone/90">
            <p className="hf-exit-kicker">Exit unlocked</p>
            <p className="hf-exit-copy">
              {isLiving
                ? "The gold EXIT mirror is open. Stand before it and press E to leave."
                : "Follow the gold EXIT mirror, cross once, then leave from Living."}
            </p>
          </div>
        ) : null}
      </div>

      {won ? (
        <div className="hf-victory absolute inset-0 z-30 flex items-center justify-center px-6">
          <div className="hf-victory-card text-center text-bone/95">
            <p className="hf-victory-kicker">{ending?.kicker ?? "Memory restored"}</p>
            <h2 className="hf-victory-title">{ending?.title ?? `${levelTitle} remembered`}</h2>
            <p className="hf-victory-copy">{ending?.body ?? objective}</p>
            <p className="mt-4 text-[10px] uppercase tracking-[0.42em] text-bone/45">
              {ending ? `${ending.releasedCount} souls returned` : `${memoryTotal} souls returned`}
            </p>
            {ending?.epilogue ? (
              <p className="mt-4 max-w-[28rem] text-pretty font-body text-[14px] italic leading-relaxed text-bone/72">
                {ending.epilogue}
              </p>
            ) : null}
            <p className="hf-victory-prompt">{ending?.prompt ?? "Press R to return"}</p>
          </div>
        </div>
      ) : null}

      <div className="absolute bottom-6 left-1/2 z-20 -translate-x-1/2">
        <div className="hf-keys">
          <div className="hf-keys-group">
            <Footprints className="h-3 w-3 text-bone/45" strokeWidth={1.5} />
            <span className="kbd">W</span>
            <span className="kbd">A</span>
            <span className="kbd">S</span>
            <span className="kbd">D</span>
            <span className="hf-keys-label">Move</span>
          </div>
          <span className="hf-keys-sep" aria-hidden />
          <div className="hf-keys-group">
            <Wind className="h-3 w-3 text-bone/45" strokeWidth={1.5} />
            <span className="kbd">Shift</span>
            <span className="hf-keys-label">Quiet</span>
          </div>
          <span className="hf-keys-sep" aria-hidden />
          <div className="hf-keys-group">
            <MousePointer2 className="h-3 w-3 text-bone/45" strokeWidth={1.5} />
            <span className="kbd">E</span>
            <span className="hf-keys-label">Cross</span>
          </div>
        </div>
      </div>
    </>
  );
}

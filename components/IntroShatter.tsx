"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowRight } from "lucide-react";

type Phase = "living" | "breaking" | "broken";

// Nine shards tiling the viewport. Each carries its outward flight vector.
const SHARDS = [
  { clip: "polygon(0% 0%, 34% 0%, 38% 36%, 0% 30%)",         tx: -28, ty: -22, rot: -22 },
  { clip: "polygon(34% 0%, 68% 0%, 64% 28%, 38% 36%)",       tx: 0,   ty: -32, rot: 6   },
  { clip: "polygon(68% 0%, 100% 0%, 100% 32%, 64% 28%)",     tx: 28,  ty: -22, rot: 22  },
  { clip: "polygon(0% 30%, 38% 36%, 30% 62%, 0% 68%)",       tx: -34, ty: 0,   rot: -14 },
  { clip: "polygon(38% 36%, 64% 28%, 72% 70%, 30% 62%)",     tx: 4,   ty: 6,   rot: 10  },
  { clip: "polygon(64% 28%, 100% 32%, 100% 64%, 72% 70%)",   tx: 34,  ty: -2,  rot: 18  },
  { clip: "polygon(0% 68%, 30% 62%, 35% 100%, 0% 100%)",     tx: -28, ty: 30,  rot: -28 },
  { clip: "polygon(30% 62%, 72% 70%, 70% 100%, 35% 100%)",   tx: 0,   ty: 36,  rot: 8   },
  { clip: "polygon(72% 70%, 100% 64%, 100% 100%, 70% 100%)", tx: 30,  ty: 32,  rot: 22  },
];

const LIVING_HOLD_MS = 1800;
const SHATTER_MS = 1700;
const LANDING_SHATTER_AUDIO = "/audio/generated/sfx/landing-shatter.mp3";
const LANDING_MUSIC_AUDIO = "/audio/generated/music/intro-lament.mp3";

const LANDING_VOLUME_BY_PHASE: Record<Phase, number> = {
  living: 0.12,
  breaking: 0.2,
  broken: 0.28,
};
const LANDING_SHATTER_VOLUME = 0.96;
const LANDING_SHATTER_DUCK_VOLUME = 0.04;

export function IntroShatter() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("living");
  const timers = useRef<number[]>([]);
  const phaseRef = useRef<Phase>("living");
  const musicRef = useRef<HTMLAudioElement | null>(null);
  const shatterRef = useRef<HTMLAudioElement | null>(null);
  const fadeFrameRef = useRef<number | null>(null);
  const shatterPlayedRef = useRef(false);

  useEffect(() => {
    timers.current.push(
      window.setTimeout(() => setPhase("breaking"), LIVING_HOLD_MS),
      window.setTimeout(() => setPhase("broken"), LIVING_HOLD_MS + SHATTER_MS),
    );
    return () => {
      timers.current.forEach(window.clearTimeout);
      timers.current = [];
    };
  }, []);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    const music = new Audio(LANDING_MUSIC_AUDIO);
    music.loop = true;
    music.preload = "auto";
    music.volume = 0;

    const shatter = new Audio(LANDING_SHATTER_AUDIO);
    shatter.preload = "auto";
    shatter.volume = LANDING_SHATTER_VOLUME;

    musicRef.current = music;
    shatterRef.current = shatter;

    const fadeMusicTo = (target: number, duration = 900) => {
      const audio = musicRef.current;
      if (!audio) return;

      if (fadeFrameRef.current !== null) {
        cancelAnimationFrame(fadeFrameRef.current);
      }

      const startVolume = audio.volume;
      const startedAt = performance.now();

      const tick = (now: number) => {
        const progress = Math.min((now - startedAt) / duration, 1);
        audio.volume = startVolume + (target - startVolume) * progress;
        if (progress < 1) {
          fadeFrameRef.current = requestAnimationFrame(tick);
        } else {
          fadeFrameRef.current = null;
        }
      };

      fadeFrameRef.current = requestAnimationFrame(tick);
    };

    const ensureLandingMusic = async () => {
      const audio = musicRef.current;
      if (!audio) return false;

      try {
        if (audio.paused) {
          await audio.play();
        }
        fadeMusicTo(LANDING_VOLUME_BY_PHASE[phaseRef.current]);
        return true;
      } catch {
        return false;
      }
    };

    const playShatter = async () => {
      const audio = shatterRef.current;
      if (!audio || shatterPlayedRef.current) return;

      try {
        fadeMusicTo(LANDING_SHATTER_DUCK_VOLUME, 120);
        audio.currentTime = 0;
        await audio.play();
        shatterPlayedRef.current = true;
        timers.current.push(
          window.setTimeout(() => {
            fadeMusicTo(LANDING_VOLUME_BY_PHASE[phaseRef.current], 680);
          }, 260)
        );
      } catch {
        // The first gesture retry will try again if autoplay was blocked.
      }
    };

    const unlockLandingAudio = () => {
      void ensureLandingMusic().then(() => {
        if (phaseRef.current !== "living") {
          void playShatter();
        }
      });
    };

    void ensureLandingMusic();
    window.addEventListener("pointerdown", unlockLandingAudio);
    window.addEventListener("keydown", unlockLandingAudio);

    return () => {
      window.removeEventListener("pointerdown", unlockLandingAudio);
      window.removeEventListener("keydown", unlockLandingAudio);

      if (fadeFrameRef.current !== null) {
        cancelAnimationFrame(fadeFrameRef.current);
      }

      music.pause();
      music.currentTime = 0;
      shatter.pause();
      shatter.currentTime = 0;
      musicRef.current = null;
      shatterRef.current = null;
    };
  }, []);

  useEffect(() => {
    const music = musicRef.current;
    if (!music) return;

    const targetVolume = LANDING_VOLUME_BY_PHASE[phase];
    const startedAt = performance.now();
    const startVolume = music.volume;

    if (fadeFrameRef.current !== null) {
      cancelAnimationFrame(fadeFrameRef.current);
    }

    const tick = (now: number) => {
      const progress = Math.min((now - startedAt) / 900, 1);
      music.volume = startVolume + (targetVolume - startVolume) * progress;
      if (progress < 1) {
        fadeFrameRef.current = requestAnimationFrame(tick);
      } else {
        fadeFrameRef.current = null;
      }
    };

    fadeFrameRef.current = requestAnimationFrame(tick);

    if (phase === "breaking" && !shatterPlayedRef.current) {
      const shatter = shatterRef.current;
      if (shatter) {
        void (async () => {
          try {
            shatter.currentTime = 0;
            await shatter.play();
            shatterPlayedRef.current = true;
          } catch {
            // If autoplay is blocked, the landing unlock handler will retry on first gesture.
          }
        })();
      }
    }
  }, [phase]);

  // Title haunt SFX cue: fires at the peak of each glitch, synced with the CSS keyframes.
  // Listen with: window.addEventListener('hushfall:title-haunt', ...)
  useEffect(() => {
    if (phase !== "broken") return;
    const HAUNT_PERIOD = 7000;
    const HAUNT_OFFSET = 500 + HAUNT_PERIOD * 0.69;
    const fire = () => window.dispatchEvent(new CustomEvent("hushfall:title-haunt"));
    const first = window.setTimeout(() => {
      fire();
      const id = window.setInterval(fire, HAUNT_PERIOD);
      timers.current.push(id);
    }, HAUNT_OFFSET);
    timers.current.push(first);
  }, [phase]);

  function enter() {
    musicRef.current?.pause();
    if (musicRef.current) {
      musicRef.current.currentTime = 0;
    }
    router.push("/play");
  }

  const livingVisible = phase !== "broken";

  return (
    <div className="absolute inset-0 overflow-hidden bg-ink">
      {/* BROKEN layer underneath — revealed when shards fly off */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,#1c1226_0%,#07060d_70%)]" />
        <img
          src="/img/intro-broken.png"
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-ink/85" />
      </div>

      {/* LIVING shards on top until they shatter outward */}
      {livingVisible && (
        <div
          className={`absolute inset-0 ${phase === "breaking" ? "intro-shake" : ""}`}
        >
          {SHARDS.map((s, i) => (
            <div
              key={i}
              className={`shard ${phase === "breaking" ? "shard-fly" : ""}`}
              style={
                {
                  clipPath: s.clip,
                  ["--tx" as string]: `${s.tx}vw`,
                  ["--ty" as string]: `${s.ty}vh`,
                  ["--rot" as string]: `${s.rot}deg`,
                  ["--delay" as string]: `${i * 28}ms`,
                } as React.CSSProperties
              }
            >
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,#e9b876_0%,#7a4524_55%,#1c0e0a_100%)]" />
              <img
                src="/img/intro-living.png"
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
                onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
              />
            </div>
          ))}

          {phase === "breaking" && (
            <svg
              className="pointer-events-none absolute inset-0 h-full w-full"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
            >
              <g
                stroke="white"
                strokeWidth="0.18"
                fill="none"
                opacity="0.9"
                style={{ filter: "drop-shadow(0 0 1px rgba(255,255,255,0.95))" }}
              >
                <path className="crack" d="M0,30 L38,36 L64,28 L100,32" />
                <path className="crack" d="M0,68 L30,62 L72,70 L100,64" />
                <path className="crack" d="M34,0 L38,36 L30,62 L35,100" />
                <path className="crack" d="M68,0 L64,28 L72,70 L70,100" />
              </g>
            </svg>
          )}
        </div>
      )}

      {/* Impact flash */}
      {phase === "breaking" && <div className="absolute inset-0 intro-flash" />}

      {/* Vignette + grain on top of everything */}
      <div className="pointer-events-none absolute inset-0">
        <div
          className={`absolute inset-0 mix-blend-color transition-opacity duration-1000 ${
            phase === "broken" ? "opacity-100" : "opacity-0"
          }`}
          style={{
            background:
              "linear-gradient(180deg, rgba(80,100,200,0.32), rgba(20,10,60,0.42))",
          }}
        />
        <div className="hf-grain absolute inset-0 opacity-[0.07] mix-blend-overlay" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,rgba(0,0,0,0.55)_88%)]" />
      </div>

      {/* Foreground UI — appears only after the shatter completes */}
      {phase === "broken" && (
        <div className="relative z-10 flex h-full flex-col items-center justify-center px-6">
          <div className="relative inline-block intro-fade-in-slow">
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 block text-center font-display font-light leading-none tracking-[0.32em] text-[#ff5f8d] opacity-0 mix-blend-screen blur-[1px] hf-title-ghost-a"
              style={{ fontSize: "clamp(3.5rem, 12vw, 9.5rem)" }}
            >
              HUSHFALL
            </span>
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 block text-center font-display font-light leading-none tracking-[0.32em] text-[#78f3ff] opacity-0 mix-blend-screen blur-[1px] hf-title-ghost-b"
              style={{ fontSize: "clamp(3.5rem, 12vw, 9.5rem)" }}
            >
              HUSHFALL
            </span>
            <h1
              className="relative block select-none text-center font-display font-light leading-none tracking-[0.32em] text-bone hf-title-break hf-title-main-haunt"
              style={{ fontSize: "clamp(3.5rem, 12vw, 9.5rem)" }}
            >
              HUSHFALL
            </h1>
          </div>

          <div
            className="mt-5 h-px w-44 bg-gradient-to-r from-transparent via-ember/70 to-transparent intro-fade-in"
            style={{ animationDelay: "0.4s" }}
          />

          <p
            className="font-body mt-8 max-w-xl text-center text-lg italic leading-relaxed text-bone/80 drop-shadow-[0_1px_8px_rgba(0,0,0,0.85)] intro-fade-in"
            style={{ animationDelay: "0.7s" }}
          >
            The room stayed warm. The souls did not.
            <br />
            <span className="text-bone/55">
              Cross the mirror, follow the static, and bring the lost back
              before the Echoes close in.
            </span>
          </p>

          <button
            type="button"
            onClick={enter}
            className="font-display intro-fade-in group mt-14 inline-flex items-center gap-4 rounded-sm border border-bone/35 bg-ink/40 px-12 py-4 text-[11px] uppercase tracking-[0.55em] text-bone backdrop-blur-md transition-all duration-300 hover:border-ember/80 hover:bg-ember/15 hover:text-bone hover:shadow-[0_0_55px_rgba(201,123,74,0.5)]"
            style={{ animationDelay: "1.1s" }}
          >
            <ArrowRight
              className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1"
              strokeWidth={1.5}
            />
            <span>Cross the mirror</span>
          </button>
        </div>
      )}
    </div>
  );
}

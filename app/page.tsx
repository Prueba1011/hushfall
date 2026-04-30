import { IntroShatter } from "@/components/IntroShatter";

export default function HomePage() {
  return (
    <main className="relative h-screen w-screen overflow-hidden bg-ink text-bone">
      <IntroShatter />
      <footer className="pointer-events-none absolute bottom-5 left-0 right-0 z-20 text-center text-[9px] uppercase tracking-[0.5em] text-bone/40">
        ElevenLabs Hackathon &middot; 2026
      </footer>
    </main>
  );
}

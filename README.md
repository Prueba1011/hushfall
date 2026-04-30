# Hushfall

Hushfall is a short, polished stealth game prototype built for the Zed + ElevenLabs Hackathon. The player moves through a frozen world, crosses mirrors into a broken reflection of the same space, and recovers trapped souls while avoiding Echoes that react to sound.

This repository combines gameplay code and an ElevenLabs audio production pipeline. The current prototype already includes dual-world switching, handcrafted level data, noise-driven enemy behavior, and a soundscape built around generated footsteps, impacts, mirror transitions, and Echo cues.

## Built For The Zed + ElevenLabs Hackathon

This project was built with [Zed](https://zed.dev/), a fast editor written in Rust and designed for native performance and fluid collaboration with AI. That fit the hackathon well: Hushfall was developed as a compact Zed + ElevenLabs project where rapid iteration on gameplay, atmosphere, and generated audio mattered more than scope.

## Why ElevenLabs Is Core To The Project

ElevenLabs is not an add-on here. It is what gives the game most of its atmosphere and much of its tension.

- Surface-driven footsteps: the game models footsteps on wood, stone, rug, grass, and water, and each surface changes how far the sound travels and how dangerous movement feels.
- Object impact and prop noise: bumping into tables or smashing a vase is not cosmetic. Those sounds become gameplay events that can pull Echoes toward the player.
- Atmosphere through generated SFX: mirror crossings, Echo alerts, memory returns, and other environmental cues carry much of the game's mood and make the spaces feel fragile and haunted.
- Soul release voices: when memories are freed, the trapped souls answer with generated voice lines created with ElevenLabs, turning each release into an emotional audio beat instead of a silent collectible.
- Music as world texture: the ElevenLabs music pipeline supports the tonal contrast between the living world and its broken reflection.
- Audio as stealth logic: the Phaser runtime uses a `NoiseSystem` plus Echo hearing behavior so the soundscape directly shapes enemy reaction, pathing pressure, and player decision-making.

## Current Prototype Focus

- Switch between the living and broken worlds through mirrors.
- Navigate stealth spaces where Echoes patrol, hear footsteps and impacts, and hunt the player.
- Recover memories and souls across handcrafted rooms.
- Build tension through sound: loud steps on wood or water, quieter movement on rug, and dangerous collisions with props.

## Stack

- Next.js 16
- React 19
- TypeScript
- Phaser 3
- Zod
- ElevenLabs JavaScript SDK
- Tailwind CSS

## Getting Started

1. Install dependencies:

```bash
npm install
```

2. Create a local env file from the example:

```bash
copy .env.example .env.local
```

3. Fill in the required variables in `.env.local`:

- `ELEVENLABS_API_KEY`: server-side ElevenLabs API key.
- `ELEVENLABS_AGENT_IDS`: comma-separated allowlist of agent IDs the client can request signed URLs for.

4. Start the development server:

```bash
npm run dev
```

5. Open the prototype:

- Landing page: `http://localhost:3000`
- Game view: `http://localhost:3000/play`

## Useful Scripts

```bash
npm run dev
npm run build
npm run start
npm run typecheck
npm run assets:generate
npm run assets:sfx
npm run assets:music
npm run voices:design
npm run voices:create
```

## Environment Variables

The repository currently expects these variables:

```env
ELEVENLABS_API_KEY=
ELEVENLABS_AGENT_IDS=
```

Security note: the ElevenLabs API key never needs to reach the client. The client only asks the server for a signed conversation URL, and the server rejects agent IDs that are not explicitly allowed.

## Project Layout

```text
app/                  Next.js routes, API endpoints, and pages
components/           React shell components around the game canvas and HUD
game/                 Phaser runtime: scenes, systems, entities, data
lib/                  Shared server and ElevenLabs utilities
public/audio/         Generated and curated audio assets
scripts/elevenlabs/   Asset generation and voice design scripts
video/                Trailer experiments, compositions, and renders
```

## Notes

- The root `.gitignore` intentionally ignores local env files, editor metadata, `.github/`, and the `video/` workspace so experiments and local tooling do not pollute commits.
- If a file inside an ignored folder is already tracked by Git, adding it to `.gitignore` will not remove it automatically. That requires untracking it separately.
# PokeNotMon — Game Plan

A 2.5D (Pokémon Black/White-style) monster-catching adventure that runs in the browser,
is hosted on GitHub Pages, and installs on iPhone as a Home Screen web app.

---

## Design decisions (from the Q&A)

| # | Topic | Decision |
|---|-------|----------|
| 1 | Camera | 2.5D tilted world like Pokémon Black/White: flat ground drawn in perspective, upright sprites |
| 2 | Art | Detailed 32×32 pixel art |
| 3 | Colors | Changes per area (each region has its own palette/mood) |
| 4 | Orientation | Built for **landscape**, can switch to **portrait** in Settings |
| 5 | Controls | D-pad you can **swipe/slide** on (acts like a joystick) + A / B buttons |
| 6 | Movement | Free, smooth movement; world objects still placed on a tile grid |
| 7 | Tone | A mix: funny, earnest, and a little mysterious |
| 8 | Audio | Chiptune music + sound effects |
| 9 | Monsters | 50+ |
| 10 | Creature style | Mix of animals, elementals, objects |
| 11 | Evolution | By level **and** by items |
| 12 | Types (15) | Fire, Water, Grass, Wind, Ice, Ground, Fighting, Psychic, Dragon, Mythical, Electric, Poison, Ghost, Metal, Flying. Dual types allowed |
| 13 | Matchups | Moderate chart: each type strong vs 1–2, weak vs 1–2, few/no immunities |
| 14 | Named monsters | Sparkrill → Voltalon → Thundrake (Electric line), Skyrion |
| 15 | Rare variants | "Prism" variants: rare recolor with boosted stats |
| 16 | Dex | Full Dex with descriptions |
| 17 | Catching | Throw capture orbs; lower HP = better odds |
| 18 | Encounters | Random in tall grass **and** visible roaming monsters |
| 19 | Wild fleeing | Yes, but very rarely |
| 20 | Party | 6 in party + storage box |
| 21–22 | Battles | 1v1 turn-based, classic view (your monster back-left, foe front-right) |
| 23 | Moves | 4 per monster, learn/forget new ones |
| 24 | Stats | Full: HP, Atk, Def, Sp.Atk, Sp.Def, Speed |
| 25 | Status | Yes: poison, burn, sleep, paralysis, freeze, confusion |
| 26 | Battle feel | Flashy effects, screen shake |
| 27 | Fainting | Just needs healing |
| 28 | Level cap | 100 |
| 29 | EXP | Only monsters that fought |
| 30 | Economy | Full: money, shops, items |
| 31 | Healing | Heal centers + healing items |
| 32 | Gyms | 8 |
| 33 | Areas | Mixed themes (forest, volcano, beach, snow, desert, swamp, city, caves, sky…) |
| 34 | Gyms | Trainers then the leader |
| 35 | Progress gates | Mix of guards/gates and field abilities |
| 36 | Route trainers | Yes, line-of-sight challenges |
| 37 | Endgame | Villain team story **and** Elite Four / Champion |
| 38 | Player | Pick from preset looks + name |
| 39 | Rival | Yes (Kai) |
| 40 | Name | PokeNotMon |
| 41 | Saving | Autosave + manual save |
| 42 | Offline | Yes (service worker) |
| 43 | Audience | Friends |

---

## Phases

Each phase ends with something playable on the phone. Test it, give feedback, then move on.

### ✅ Phase 1: Engine & World Foundation
- Installable iPhone web app (fullscreen, icon, works offline)
- 2.5D perspective renderer (tilted ground, upright sprites, depth sorting, shadows)
- Landscape layout by default, Portrait layout in Settings (works even with rotation lock)
- Swipeable D-pad + A / B / Menu buttons (keyboard works on desktop too)
- Free movement with tile collision, hold B to run
- Title screen, New Game (pick look + name), Continue
- Mossbrook Town, your house, Professor Hazel's Lab, Route 1
- NPCs that wander and talk, signs, doors, map transitions, location banners
- Tall grass (rustles when you walk through it)
- Chiptune music (title/town/route) + sound effects
- Pause menu, Trainer card, Settings (layout, volume, text speed, delete save)
- Autosave + manual save

### Phase 2: Monsters & Battles
- Monster data system + first ~20 monsters (including Sparkrill line and Skyrion)
- Pick your starter in the lab; rival Kai picks the one strong against yours
- Wild encounters in tall grass + visible roaming monsters
- 1v1 turn-based battle screen with flashy move effects and screen shake
- 15 types with dual types and the effectiveness chart
- Full stats, 4 moves, status effects, crits, accuracy
- Catching with capture orbs, wild monsters that (rarely) flee
- EXP, leveling, learning moves, evolution by level
- First rival battle

### Phase 3: Trainer Life
- Party of 6 + storage box (PC)
- Bag & items: potions, status cures, capture orbs, evolution stones
- Money, shops, heal centers
- Monster Dex with descriptions and seen/caught tracking
- Route trainers with line-of-sight "!" challenges
- Rare "Prism" variants
- Level-cap guards and early field ability

### Phase 4: Gyms 1–3
- Cinderpeak City (Fire), plus two more towns and routes
- Gym trainers and gym leaders, badges on the trainer card
- Gates/guards and field abilities to reach new areas
- About 35 monsters total, item evolutions

### Phase 5: Gyms 4–8 & The Villain Team
- Remaining towns, routes, caves, and themed areas
- Villain team storyline with hideouts and boss battles
- 50+ monsters total, all types represented

### Phase 6: Elite Four, Champion & Polish
- Victory Road, Elite Four and Champion
- Post-game content
- Balance pass, more music tracks, battle and animation polish
- Final install and offline polish

---

## Tech notes
- Plain HTML/CSS/JavaScript ES modules. There is no build step, so GitHub Pages serves the repo as-is.
- All art is drawn in code as pixel art at startup (`js/sprites.js`). Music is synthesized with WebAudio (`js/audio.js`).
- Saves use `localStorage` on the device.

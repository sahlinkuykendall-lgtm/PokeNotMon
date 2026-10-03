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

### ✅ Phase 2: Monsters & Battles
- 25 monsters with their own pixel art (front + back), stats, learnsets and dex entries
  - Starters: Emberpup → Blazehound → Infernox (Fire), Sproutle → Thornback → Verdantor (Grass), Finnlet → Tidalfin → Abyssail (Water)
  - Sparkrill → Voltalon → Thundrake (Electric/Dragon), Skyrion (Wind/Flying)
  - Route monsters: Pebblit, Boulderon, Fluffinch, Galewing, Brawlbit, Punchare, Mothwisp, Toxitoad, Frostnib, Kettlekin, Psyfox, Lumiwisp
- Choose your starter in the lab; Kai picks the one strong against yours and battles you
- Random encounters in Route 1's tall grass + wild monsters you can see wandering around (Skyrion is a rare wanderer, Sparkrill a rare grass find)
- 1v1 turn-based battles: 15 types + dual types, full stats, crits, accuracy, priority moves, stat stages
- Status effects: poison, burn, sleep, paralysis, freeze, confusion
- Flashy move effects per type, screen shake, hit flashes
- Capture orbs with wobble animation; wild monsters very rarely flee
- EXP to monsters that fought, level ups, learning / forgetting moves, evolution with animation
- Party screen, summary screen, bag (potions + capture orbs), forced switch, blacking out
- Mom and your bed heal your team
- Battle, rival and victory music

### ✅ Phase 3: Trainer Life
- Monster Center in Mossbrook: Nurse Clover heals your team (and becomes your blackout respawn point), a PC, and a shop counter
- Shop with buying and selling: Capture/Great Orbs, Potions, Super Potions, status cures, Full Heal, Revive, evolution stones
- PC Box: deposit, withdraw, release (also on the PC in your bedroom)
- Bag works in and out of battle: healing, curing status, reviving, evolution stones
- Stone evolutions: Psyfox → Mystifox and Mothwisp → Lunamoth (Moon Stone), Frostnib → Emperice (Ice Stone), Kettlekin → Brewlord (Fire Stone). 29 monsters total
- Monster Dex: seen/caught tracking, silhouettes, entries with base stats and evolution info
- Route 1 trainers (Hiker Bram, Lass Poppy, Youngster Tim, Camper Leo) who spot you with a "!", walk over and battle for prize money
- Items to find on Route 1 (including a Moon Stone)
- Rare ✨ Prism variants (1 in 64): recolored, +10% stats, sparkle intro; wandering monsters can be Prism too

### Phase 4: Gyms 1–3
- Level-cap guards and the first field ability (moved here from Phase 3)
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

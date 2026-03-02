# Feature Research

**Domain:** Browser-based arcade space shooter with roguelite meta-progression (Neon Tokyo cyberpunk aesthetic)
**Researched:** 2026-03-02
**Confidence:** MEDIUM-HIGH (WebSearch + verified against multiple industry sources; no single authoritative doc for "browser shooter feature standards")

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features players assume exist in any arcade shooter with roguelite elements. Missing these causes immediate abandonment — players don't reward you for having them, but they penalize you hard for missing them.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Responsive ship movement (sub-100ms input response) | Arcade shooters live and die on feel; any perceivable lag registers as "broken" | LOW | Three.js requestAnimationFrame loop at 60fps + direct keyboard state polling (not event-driven) |
| Shooting with visual + positional feedback | Player must see and feel every shot fired — muzzle flash, projectile travel, impact effect | LOW | Particle system for muzzle flash; projectile as Three.js mesh |
| Enemy death animations / explosion particles | Without visual confirmation of kills, the game feels like shooting into void | MEDIUM | Particle bursts on enemy death; color/size varies by enemy type |
| Score display (live, during run) | Arcade genre DNA — players are score-chasing from muscle memory | LOW | HUD element; increment on kill with multiplier display |
| Wave number / level indicator | Players need spatial context — "how far am I?" is a core feedback loop | LOW | Persistent HUD display |
| Lives / health system with clear UI | Not knowing when you'll die creates dread, not tension | LOW | Lives counter OR health bar; clear visual state |
| Game over screen with run summary | Players need closure + motivation to retry; missing this = "what just happened?" | LOW | Show: final score, wave reached, enemies killed, time survived |
| Pause functionality | Any game without pause on desktop keyboard feels unfinished | LOW | ESC or P key; overlay pause menu |
| Power-up drops during waves | Core to the genre — players expect periodic pickups during combat | MEDIUM | Drop on enemy death (chance-based); spread shot, rapid fire, shield are canonical |
| Boss encounters | A "boss" is expected at wave milestones in any wave-based shooter | HIGH | Multi-phase attack patterns; distinct health bar; visual differentiation |
| Difficulty escalation over time | Waves must get harder — same-difficulty waves = player boredom by wave 3 | MEDIUM | Increase enemy count, speed, firing rate, formation complexity per wave |
| Persistent meta-progression across runs | Roguelite expectation: each run should feed into something permanent | HIGH | localStorage-based persistence; meta shop currency carries over |
| Between-wave upgrade selection | Players expect a "shop" or card-select moment between waves in roguelites | MEDIUM | 3-choice upgrade offer; spend in-run currency |
| Main menu with clear entry points | Portfolio context: reviewers need immediate clarity on what they're playing | LOW | New Game, Continue, Meta Shop — clean navigation |
| Local score persistence (localStorage) | Browser game expectation: high score survives browser close | LOW | JSON serialization to localStorage; ~5MB limit |
| 60fps target performance | Below 60fps in a browser shooter feels broken; 31% session-length increase documented at 60fps vs sub-60fps | MEDIUM | Three.js instancing + batched draw calls; avoid per-frame DOM queries |
| Visual hit confirmation on player ship | Player needs to know when they're being hit — flash, invincibility frames, screen shake | LOW | Brief ship flash + 1-2 second invincibility window after hit |
| Enemy projectile visibility | Player must be able to read and dodge incoming fire — illegible bullets = unfair | LOW | High-contrast colors; speed calibrated to allow reaction time |

### Differentiators (Competitive Advantage)

Features that set Super Space Invaders X apart from generic browser shooters. These align directly with the project's Core Value statement and the Neon Tokyo cyberpunk direction. Don't try to differentiate on all of these — pick the ones that compound.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Neon Tokyo multi-hue enemy waves | Visual identity that's immediately memorable and screenshot-worthy; each wave is a different color composition | MEDIUM | Per-wave color palette assignment; emissive materials + bloom post-processing in Three.js |
| Per-wave enemy formation variety (pincer, wedge, grid-break) | Most Space Invaders clones use static grid — dynamic formation behavior is immediately impressive | HIGH | Formation state machine; break-apart trigger conditions; leader-follower AI |
| Enemy type archetypes with distinct combat roles | Shielders, flankers, snipers, chargers require different player responses — depth without complexity | HIGH | 4-5 distinct behavior trees; visual differentiation (shape/color/size) per archetype |
| Multi-phase boss fight with escalating patterns | Boss encounters are table stakes, but multi-phase bosses with cinematic telegraphs are differentiating | HIGH | Phase transition triggers; attack pattern library; arena-aware targeting |
| In-run artifact system (locked at run start) | Build identity from run start vs. only acquiring mid-run; creates pre-run strategic planning | HIGH | Artifact slot count is a meta-progression unlock; artifacts modify base behavior (not just stats) |
| Meta shop with cosmetic + functional unlocks | Depth that survives repeat portfolio demo sessions; demonstrates systems design skill | HIGH | Ship skins, color themes, trail effects + functional: weapon loadouts, passive boosts, extra lives |
| Bloom / glow post-processing on projectiles and ships | WebGL-level visual polish that Canvas2D games can't match; core to cyberpunk aesthetic | MEDIUM | Three.js UnrealBloomPass or custom bloom; performance-budget it per device tier |
| Particle system with per-type kill effects | Killing different enemy types feels different; layered feedback rewards learning enemy types | MEDIUM | Particle pool with type-specific burst profiles; color-matched to enemy palette |
| Formation-breaking behavior mid-wave | Enemies that charge out of formation, flank, and adapt create genuine tension vs. predictable grids | HIGH | Break-away trigger: health threshold, wave timer, or player-position-based |
| Campaign mode with chapter/level structure | Demonstrates narrative + progression design skills for portfolio beyond infinite wave-chasing | HIGH | 3-4 levels + boss fight per chapter; handcrafted wave scripts vs. procedural |
| Difficulty unlock system via meta shop | Replayability for demo sessions; shows you thought about long-term engagement | LOW | Flag-gated mode unlocking through meta shop currency spend |
| Alternate ships with distinct base stats | Build variety at run start; increases replay motivation; cosmetic + functional differentiation | MEDIUM | 2-3 ships with stat variance (speed vs. fire rate vs. health trade-offs) |
| Cinematic screen shake calibration | Distinguishes amateur from polished — over-shake is readable, calibrated shake is satisfying | LOW | Scaled by event severity; boss hit > standard hit > kill; never during enemy projectile readability |
| Trail effects on player ship movement | Cyberpunk visual language; makes movement feel fast and intentional | LOW | THREE.js shader or particle trail; color-themeable via meta shop |
| Glowing projectile color variance by weapon type | Spread shot = blue, rapid = orange, etc. — builds vocabulary without tutorial text | LOW | Emissive color property on projectile mesh; tied to weapon type |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem like improvements but create scope, design, or player experience problems for v1.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Online leaderboards | "Social competition drives retention" | Requires backend infrastructure, anti-cheat, database, maintenance; no backend = no online leaderboard | Local high-score display; show run history in localStorage |
| Multiplayer co-op | "More fun with friends" | Doubles networking complexity; synchronizing game state in a browser WebGL game is a project unto itself | Design single-player to feel complete; mark as v2 |
| Procedurally generated levels | "Infinite variety" | Procedural wave design almost always produces less satisfying encounters than handcrafted; harder to balance | Handcrafted wave scripts for campaign; procedural escalation for endless mode |
| Permanent stat power inflation (Meta shop stat stacking) | "Players like feeling stronger" | Permanent +% damage/speed stacking breaks game balance over time; players hit "solved" state and disengage | Prefer unlocking sidegrades and new options (weapon loadouts, artifacts) over raw stat inflation; limit permanent stat bonuses to small percentages |
| Audio in v1 | "A game needs sound" | Sourcing, mixing, and licensing audio is a significant scope item; game loop can be validated without it | Confirm audio is deferred to v2 (already in PROJECT.md); ensure visual feedback compensates |
| Touch / mobile controls | "More players" | Desktop-first design and touch controls require different UX; layout and interaction model would need significant redesign | Keyboard-first for v1; add gamepad in v2, touch in v3 |
| Gamepad in v1 | "Better feel than keyboard" | Analog stick dead-zone calibration + button mapping adds scope; keyboard is fine for v1 | Add in v2 after core loop is validated |
| Full save/load mid-run state | "Players want to save anywhere" | Mid-run save breaks roguelite tension; run-based game design assumes you finish or lose the run | Auto-save meta-progression only (persistent currency, unlocks); in-run state resets on close by design |
| Physics-based movement | "More realistic" | Arcade shooters need direct, predictable movement; physics introduces input-to-response delay that feels sluggish | Direct kinematic movement; "juice" the presentation (trails, squash/stretch) to feel physical without being so |
| Narrative cutscenes / voiced dialogue | "Story makes it compelling" | Significant content production cost; portfolio reviewers spend 5-10 minutes, not hours | Atmospheric text overlays (mission briefing) between campaign levels; environment tells the story |
| Randomized enemy placement in campaign | "Variety on repeat play" | Randomization in handcrafted levels destroys the pacing designers built | Save procedural generation for endless mode; campaign waves should be deterministic |

---

## Feature Dependencies

```
[Meta Shop (persistent currency)]
    └──requires──> [Persistent Currency System (localStorage)]
                       └──requires──> [Run-end reward calculation]
                                          └──requires──> [Score / enemies killed tracking]

[Artifact System (in-run)]
    └──requires──> [Artifact Slot Unlocks (meta shop)]
                       └──requires──> [Meta Shop]
    └──requires──> [Power-up / effect library]

[In-run Upgrade Shop (between waves)]
    └──requires──> [In-run currency drop from enemies]
    └──requires──> [Wave transition state]

[Formation-breaking behavior]
    └──requires──> [Enemy archetype system]
    └──requires──> [Enemy state machine]

[Multi-phase Boss]
    └──requires──> [Boss health tracking]
    └──requires──> [Attack pattern library]
    └──requires──> [Phase transition triggers]

[Alternate Ships]
    └──requires──> [Meta shop unlock]
    └──requires──> [Ship stat model]

[Bloom post-processing]
    └──enhances──> [All visual elements]
    └──requires──> [Three.js EffectComposer]

[Cosmetic unlocks (skins, trails, themes)]
    └──requires──> [Meta shop]
    └──requires──> [Cosmetic application layer on ship/UI]

[Difficulty unlock system]
    └──requires──> [Meta shop]

[Campaign mode]
    └──requires──> [Wave scripting system]
    └──requires──> [Boss encounters]
    └──requires──> [Level/chapter state management]

[Endless mode]
    └──requires──> [Procedural wave escalation logic]
    └──conflicts──> [Handcrafted campaign wave scripts] (separate code paths)

[Power-up drops]
    └──enhances──> [In-run upgrade shop] (shop is structured version of drops)
    └──requires──> [Power-up effect library]

[Screen shake / hit feedback]
    └──requires──> [Camera / viewport transform access]
    └──enhances──> [All combat events]
```

### Dependency Notes

- **Meta shop requires localStorage persistence:** All meta-progression (currency, unlocks, cosmetics) is meaningless without cross-session storage. Implement this in Phase 1.
- **Artifact system requires meta shop:** Artifact slots are meta-shop unlocks; the artifact selection UI at run start is gated behind this.
- **Formation-breaking requires enemy state machine:** You cannot implement flankers or chargers without a proper enemy state machine. A simple "translate down" approach won't extend to this.
- **Campaign mode requires wave scripting system:** The scripting system (wave definitions as data, not code) enables campaign handcrafting and also powers endless mode's escalation. Build the data layer first.
- **Bloom requires EffectComposer:** Three.js post-processing requires the EffectComposer pipeline. This affects how the entire render output is structured — decide early.
- **Endless mode and campaign share enemy/wave infrastructure but diverge in spawning logic** — plan for two separate "wave source" implementations using the same enemy type library.

---

## MVP Definition

### Launch With (v1)

The minimum viable product that demonstrates the Core Value: "the thrill of arcade shooting elevated."

- [ ] Responsive ship movement + shooting at 60fps — without this nothing else matters
- [ ] 4-5 enemy types with distinct visual identities and basic behavior differences — depth reads immediately
- [ ] Wave escalation with 8-12 waves before first boss — enough to show the progression arc
- [ ] One multi-phase boss encounter — portfolio centerpiece
- [ ] Power-up drops (spread shot, rapid fire, shield) — in-run variety
- [ ] Between-wave upgrade shop (3 choices, in-run currency) — roguelite core loop
- [ ] Meta shop with persistent currency — shows systems design depth; even 6-8 items is enough
- [ ] Endless mode — always-playable demo mode that doesn't require completing campaign
- [ ] Campaign chapter 1 (3-4 levels + boss) — demonstrates handcrafted design skill
- [ ] Neon Tokyo visual identity with bloom + particle effects — the aesthetic IS the portfolio pitch
- [ ] localStorage persistence for meta-progression — demo sessions must survive browser refreshes
- [ ] Screen shake + hit feedback — game feel is non-negotiable

### Add After Validation (v1.x)

Add once the core loop is confirmed to feel good.

- [ ] Alternate ships (2 additional) — add when meta shop is proven and player wants build variety
- [ ] More artifact variety (expand from starter set) — when the artifact system is proven valuable
- [ ] Additional campaign chapter — after chapter 1 demonstrates the format works
- [ ] Cosmetic unlock depth (more skins, themes, trails) — once meta shop engagement is confirmed
- [ ] Higher difficulty modes — after core difficulty balance is validated

### Future Consideration (v2+)

Defer until the v1 portfolio goal is achieved.

- [ ] Audio (BGM + SFX) — already confirmed deferred in PROJECT.md; significant scope
- [ ] Gamepad support — v1 keyboard is sufficient for portfolio demos
- [ ] Mouse aim/control — different control scheme changes feel significantly; separate design effort
- [ ] Touch/mobile — separate UX design problem
- [ ] Online leaderboards — requires backend infrastructure

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Responsive movement + shooting (60fps) | HIGH | LOW | P1 |
| Screen shake + particle hit feedback | HIGH | LOW | P1 |
| Enemy type variety (4-5 types) | HIGH | MEDIUM | P1 |
| Power-up drops during waves | HIGH | MEDIUM | P1 |
| Wave escalation | HIGH | LOW | P1 |
| Neon Tokyo aesthetic + bloom post-processing | HIGH | MEDIUM | P1 |
| Boss encounter (multi-phase) | HIGH | HIGH | P1 |
| Between-wave upgrade shop | HIGH | MEDIUM | P1 |
| Meta shop + localStorage persistence | HIGH | HIGH | P1 |
| Endless mode | HIGH | MEDIUM | P1 |
| Campaign chapter 1 (3-4 levels) | HIGH | HIGH | P1 |
| Formation-breaking enemy behavior | MEDIUM | HIGH | P2 |
| Artifact system (in-run) | MEDIUM | HIGH | P2 |
| Alternate ships | MEDIUM | MEDIUM | P2 |
| Cosmetic unlocks (skins, trails, themes) | MEDIUM | MEDIUM | P2 |
| Difficulty unlock system | MEDIUM | LOW | P2 |
| Additional campaign chapters | LOW | HIGH | P3 |
| Audio (BGM + SFX) | HIGH | HIGH | P3 (v2) |
| Gamepad support | MEDIUM | MEDIUM | P3 (v2) |
| Online leaderboards | LOW | HIGH | P3 (v2+, never for v1) |

**Priority key:**
- P1: Must have for v1 launch
- P2: Should have, add when P1 features are stable
- P3: Nice to have / future version

---

## Competitor Feature Analysis

| Feature | Beat Invaders (closest Space Invaders roguelite comp) | Generic browser shooters | Our Approach |
|---------|------------------------------------------------------|--------------------------|--------------|
| Visual identity | Rhythm-tied neon with 22 music tracks | Usually flat color or pixel art | Neon Tokyo multi-hue with Three.js bloom — WebGL differentiator |
| Enemy behavior | Music-tempo driven movement and firing | Static grid patterns | Formation-breaking archetypes (shielders, flankers, snipers, chargers) |
| Roguelite loop | Between-wave ship upgrades, weapon unlocks | Usually absent or minimal | In-run shop + artifact system + full meta shop |
| Progression depth | Weapon unlocks, ship upgrades | High score only | Meta shop with functional + cosmetic unlocks, artifact slots, alternate ships |
| Boss encounters | Present | Rare in browser games | Multi-phase with attack pattern library and telegraphed phases |
| Meta persistence | Unknown (likely session-only) | Usually none | localStorage with full meta-progression carry-over |
| Audio integration | Core differentiator (rhythm mechanic) | Background music at best | No audio in v1; visual feedback compensates; audio is a v2 differentiator opportunity |
| Game modes | Single endless mode + score chase | Usually just endless | Campaign (3-4 levels + boss) + Endless + difficulty unlock system |

---

## Game Feel Specifics (Non-Negotiable Quality Bar)

These aren't optional features — they're the quality floor that separates "polished indie" from "student project."

| Feel Element | Implementation | Why Critical |
|--------------|----------------|--------------|
| Input response under 100ms | requestAnimationFrame loop; poll keyboard state each frame (not addEventListener) | "Broken" feeling kills sessions instantly |
| Muzzle flash on fire | 1-2 frame particle burst at barrel position | Firing feels powerful vs. invisible |
| Screen shake on impact and boss events | Scaled by event type; boss hit = large, kill = small; never obscure readability | Calibrated shake = professional feel |
| Enemy death burst | Particle explosion color-matched to enemy type | Kill feedback loop; reward signal |
| Player hit flash + invincibility frames | 1-2 second I-frames with ship flashing | Fair-feeling damage; player can recover |
| Power-up pickup flash + sound placeholder | Visual swell on pickup; text flash of power-up name | Acquisition feedback |
| Wave transition with breathing room | Brief pause between waves (2-3 seconds) with "Wave X" display | Player recovery + anticipation building |
| Boss health bar with phase transitions | Segmented health bar; bar section depletes = phase change | Phase shift readable; satisfying milestone |

---

## Sources

- [Beat Invaders (Space Invaders roguelite comp) — GamingOnLinux review](https://www.gamingonlinux.com/2022/03/space-invaders-gets-reinvented-with-beat-invaders-and-its-slick/)
- [Rogueliker.com — Best roguelites 2025, meta-progression design](https://rogueliker.com/best-new-roguelikes/)
- [Game Feel / Juice — Wayline.io](https://www.wayline.io/blog/game-feel-is-king)
- [The Juice Problem — Wayline.io (over-reliance caution)](https://www.wayline.io/blog/the-juice-problem-how-exaggerated-feedback-is-harming-game-design)
- [Enemy NPC Design Patterns in Shooter Games — ACM DL](https://dl.acm.org/doi/10.1145/2427116.2427122)
- [Designing Enemies With Distinct Functions — Gamedeveloper.com](https://www.gamedeveloper.com/design/designing-enemies-with-distinct-functions)
- [Roguelite progression systems academic paper — Theseus.fi](https://www.theseus.fi/bitstream/handle/10024/881994/Kammonen_Eino.pdf)
- [Meta progression: variety over power (Enter the Gungeon model) — RPGHQ](https://rpghq.org/forums/viewtopic.php?t=4470)
- [WebGL 60fps player retention data — Sonnydickson.com](https://sonnydickson.com/2025/08/23/why-browser-performance-still-matters-for-online-gaming-in-2025/)
- [localStorage for browser game saves — Dynetis Games](https://www.dynetisgames.com/2018/10/28/how-save-load-player-progress-localstorage/)
- [Difficulty curve procedural generation — ResearchGate](https://www.researchgate.net/publication/343188131_Difficulty_Curve-Based_Procedural_Generation_of_Scrolling_Shooter_Enemy_Formations)
- [Space Invaders Infinity Gene — Wikipedia (modern remake features)](https://en.wikipedia.org/wiki/Space_Invaders_Infinity_Gene)
- [Neon Inferno cyberpunk shooter review 2025 — NoisyPixel](https://noisypixel.net/neon-inferno-review-cyberpunk-new-york/)

---

*Feature research for: Browser-based space shooter with roguelite meta-progression (Super Space Invaders X)*
*Researched: 2026-03-02*

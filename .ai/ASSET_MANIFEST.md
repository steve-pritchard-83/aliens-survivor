# Asset Manifest: Aliens Survivor

> **CRITICAL FOR AI AGENTS:** Use the exact node names, animation clip names, world-space coordinate transformations, and audio file paths listed below. Do not hallucinate bone or clip names.

## 1. 3D Models (`/public/models/`)

### 1.1 Corridor Level (`/models/corridor.glb`) — 818 KB
* **Root Hierarchy:** `Sketchfab_model` (scale `0.0053374`, rotated -90° X) -> `SFNR1.obj.cleaner.materialmerger.gles` (offset `[-752, -1280, -80]`) -> `Object_2` -> `Object_3`..`Object_9`
* **Meshes (7):** `Object_0` through `Object_6`
* **Materials (7):** `panel_color.bmp`, `pipewall_color.`, `schrank_color.b`, `sftex1.bmp`, `wall2_color.bmp`, `wall2_color2.bm`, `wire1.tga`
* **World-Space Coordinate Mapping:**
  * `worldX = (rawX - 752) * 0.0053374`
  * `worldY = (rawZ - 80) * 0.0053374` (Floor `rawZ = 80` maps to `worldY = 0.0m`, ceiling `rawZ = 214` maps to `worldY = 0.715m` at 1x model scale; `<CorridorLevel />` group is scaled by `3.5` so ceiling height is `2.50m` and hallway width is `~3.2m`)
  * `worldZ = -(rawY - 1280) * 0.0053374`

### 1.2 M41A Pulse Rifle (`/models/pulse_rifle.glb`) — 324 KB
* **Root Hierarchy:** `Sketchfab_model` -> `6dd8713b2f18480e8139d73aa57a65a7.fbx` -> `Object_2` -> `RootNode`
* **Child Nodes (10 parts):**
  * `trigger_a_low` -> `Object_5`
  * `frame_low` -> `Object_7`
  * `gun_front_low` -> `Object_9`
  * `slider_low` -> `Object_11`
  * `top_low` -> `Object_13`
  * `back_low` -> `Object_15`
  * `top_front_low` -> `Object_17`
  * `trigger_part_low` -> `Object_19`
  * `barrel_low` -> `Object_21` (Muzzle tip anchor at local `[-7.6, -57.0, 3.8]`)
  * `trigger_b_low` -> `Object_23`
* **Material:** `03___Default`
* **Animations:** None embedded (procedural recoil, reload tilt, and LED ammo counter plane).

### 1.3 Xenomorph Drone & Praetorian Boss (`/models/xenomorph.glb`) — 1.78 MB
* **Root Hierarchy:** `Sketchfab_model` -> `4d3e3330bde24cac8f907d06a95229c3.fbx` -> `Object_2` -> `RootNode` -> `alien_xenos_drone_SK_Xenos_Drone_skeleton` -> `Object_6` -> `_rootJoint`
* **Skinned Meshes:**
  * `Object_9` (`alien_xenos_drone_SK_Xenos_Drone_T_MI_Xeno_Body_BaseColor_0`)
  * `Object_10` (`alien_xenos_drone_SK_Xenos_Drone_T_MI_Xeno_HeadCap_BaseColor_0`)
* **Dismemberment Limb Joints:**
  * `0`: Left Arm (`XenosBiped_l_Arm_ShoulderSHJnt_028`)
  * `1`: Right Arm (`XenosBiped_r_Arm_ShoulderSHJnt_046`)
  * `2`: Left Leg (`XenosBiped_l_Leg_Knee1SHJnt_077`)
  * `3`: Right Leg (`XenosBiped_r_Leg_Knee1SHJnt_087`)
  * `4`: Neck/Head (`XenosBiped_Neck_TopSHJnt_09`)
* **Exact Animation Clip Names (8 clips):**
  * `alien_xenos_drone_SK_Xenos_Drone_skeleton|attack1`
  * `alien_xenos_drone_SK_Xenos_Drone_skeleton|attack2`
  * `alien_xenos_drone_SK_Xenos_Drone_skeleton|die`
  * `alien_xenos_drone_SK_Xenos_Drone_skeleton|idle`
  * `alien_xenos_drone_SK_Xenos_Drone_skeleton|kill1`
  * `alien_xenos_drone_SK_Xenos_Drone_skeleton|kill2`
  * `alien_xenos_drone_SK_Xenos_Drone_skeleton|run1`
  * `alien_xenos_drone_SK_Xenos_Drone_skeleton|walk`

### 1.4 Bishop Synthetic Companion (`/models/bishop.glb`) — 1.41 MB
* Posable synthetic marine companion running alongside the player with procedural walk gait, aiming, and covering fire.

### 1.5 M314 Motion Tracker (`/models/motion_tracker.glb`) — 163 KB
* Canonical USCM tracker model equipped with LED display grid, cathode sweep line, and range indicators.

### 1.6 Additional Alien Lifeforms
* **Facehugger (`/models/facehugger.glb`)** — 37 KB
* **Chestburster (`/models/chestburster.glb`)** — 55 KB
* **Ovomorph Alien Egg (`/models/egg.glb`)** — 528 KB
* **Ripley Model (`/models/ripley.glb`)** — 534 KB

---

## 2. Fonts (`/public/fonts/`)
* `/fonts/AlienLeague.otf` (`font-family: 'AlienLeague'`). Licence unconfirmed: see `CREDITS.md`.

---

## 3. Audio Assets (`/public/audio/`) — Full Web Audio Manifest

> **Formats (see `docs/adr/0004-asset-compression.md`):** effects and music are AAC `.m4a`; the pulse rifle shots and tail, `sfx_empty`, `sfx_tracker_ping` and `sfx_ui_beep` stay `.wav`; `defeat.mp3` is unchanged. Sound keys and URLs live in `src/core/AudioCatalog.ts`; a test checks every URL exists. Uncompressed originals are archived in `assets/audio-src/`. Provenance: `CREDITS.md`.

### 3.1 Background & Ambiance
* `/audio/bgm_sulaco.m4a` — Atmospheric ambient tension loop
* `/audio/sfx_distant_boom1.m4a` & `sfx_distant_boom2.m4a` — Distant Sulaco hull groans
* `/audio/sfx_console_alarm.m4a` — Klaxon alert
* `/audio/sfx_spark.m4a` — Electrical sparking
* `/audio/defeat.mp3` — Game over defeat theme

### 3.2 M41A Pulse Rifle SFX
* `/audio/sfx_pulse.wav`, `sfx_pulse2.wav`, `sfx_pulse3.wav`, `sfx_pulse4.wav` — 4-sample round variation
* `/audio/sfx_pulse_tail.wav` — Acoustic corridor reverberation tail
* `/audio/sfx_reload_out.m4a` — Magazine ejection
* `/audio/sfx_reload_in.m4a` — Magazine seat
* `/audio/sfx_reload_slap.m4a` — Bolt release slap
* `/audio/sfx_empty.wav` — Dry fire hammer click
* `/audio/sfx_ricochet1.m4a` & `sfx_ricochet2.m4a` — Metal bulkhead bullet ricochet

### 3.3 Motion Tracker & Tactical Equipment
* `/audio/sfx_tracker_sweep.m4a` — Radar ping sweep pulse
* `/audio/sfx_tracker_ping.wav` — Proximity pitch-modulated target ping
* `/audio/sfx_torch_on.m4a` & `sfx_torch_off.m4a` — Flashlight toggle clicks
* `/audio/sfx_ui_beep.wav` — Upgrade selection and UI confirmation

### 3.4 Xenomorph Audio
* `/audio/sfx_xeno_hiss1.m4a` & `sfx_xeno_hiss2.m4a` — Aggro warning hisses
* `/audio/sfx_xeno_attack.m4a` — Claw slash impact
* `/audio/sfx_xeno_sprint.m4a` — Skittering pursuit footsteps
* `/audio/sfx_xeno_hit.m4a` — Chitin impact scream
* `/audio/sfx_xeno_death1.m4a` & `sfx_xeno_death2.m4a` — Death shrieks
* `/audio/sfx_xeno_explode1.m4a` & `sfx_xeno_gib1.m4a` — Limb severing and body explosion
* `/audio/sfx_xeno_bodyfall.m4a` — Corpse drop impact
* `/audio/sfx_acid_fizz.m4a` & `sfx_acid_burn.m4a` — Acid blood sizzle and burn pools
* `/audio/sfx_vent_clang.m4a` — Ceiling vent spawn clang

### 3.5 Facehuggers & Small Swarmers
* `/audio/sfx_small_screech1.m4a` & `sfx_small_screech2.m4a` — High-pitched vocal screeches
* `/audio/sfx_small_skitter.m4a` — Rapid multi-leg crawl
* `/audio/sfx_small_leap.m4a` — Pounce jump
* `/audio/sfx_small_bite.m4a` — Pounce latch damage
* `/audio/sfx_small_death.m4a` — Splat kill

### 3.6 Marine & Combat Impacts
* `/audio/sfx_marine_pain.m4a` — Damage grunt
* `/audio/sfx_marine_death.m4a` — Fatal defeat vocal
* `/audio/sfx_bullet_flesh1.m4a` & `sfx_bullet_flesh2.m4a` — Xenomorph flesh penetration

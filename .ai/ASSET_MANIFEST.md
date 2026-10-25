# Asset Manifest: Aliens Survivor

> **CRITICAL FOR AI AGENTS:** Use the exact node names, animation clip names, world-space coordinate transformations, and audio file paths listed below. Do not hallucinate bone or clip names.

## 1. 3D Models (`/public/models/`)

### 1.1 Corridor Level (`/models/corridor.glb`) — ~6.3 MB
* **Root Hierarchy:** `Sketchfab_model` (scale `0.0053374`, rotated -90° X) -> `SFNR1.obj.cleaner.materialmerger.gles` (offset `[-752, -1280, -80]`) -> `Object_2` -> `Object_3`..`Object_9`
* **Meshes (7):** `Object_0` through `Object_6`
* **Materials (7):** `panel_color.bmp`, `pipewall_color.`, `schrank_color.b`, `sftex1.bmp`, `wall2_color.bmp`, `wall2_color2.bm`, `wire1.tga`
* **World-Space Coordinate Mapping:**
  * `worldX = (rawX - 752) * 0.0053374`
  * `worldY = (rawZ - 80) * 0.0053374` (Floor `rawZ = 80` maps to `worldY = 0.0m`, ceiling `rawZ = 214` maps to `worldY = 0.715m` at 1x model scale; `<CorridorLevel />` group is scaled by `3.5` so ceiling height is `2.50m` and hallway width is `~3.2m`)
  * `worldZ = -(rawY - 1280) * 0.0053374`

### 1.2 M41A Pulse Rifle (`/models/pulse_rifle.glb`) — ~4.0 MB
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

### 1.3 Xenomorph Drone & Praetorian Boss (`/models/xenomorph.glb`) — ~12.3 MB
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

### 1.4 Bishop Synthetic Companion (`/models/bishop.glb`) — ~9.4 MB
* Posable synthetic marine companion running alongside the player with procedural walk gait, aiming, and covering fire.

### 1.5 M314 Motion Tracker (`/models/motion_tracker.glb`) — ~980 KB
* Canonical USCM tracker model equipped with LED display grid, cathode sweep line, and range indicators.

### 1.6 Additional Alien Lifeforms
* **Facehugger (`/models/facehugger.glb`)** — ~227 KB
* **Chestburster (`/models/chestburster.glb`)** — ~342 KB
* **Ovomorph Alien Egg (`/models/egg.glb`)** — ~3.48 MB
* **Ripley Model (`/models/ripley.glb`)** — ~4.57 MB

---

## 2. Fonts (`/public/fonts/`)
* `/fonts/AlienLeague.otf` (`font-family: 'AlienLeague'`)

---

## 3. Audio Assets (`/public/audio/`) — Full Web Audio Manifest

### 3.1 Background & Ambiance
* `/audio/bgm_sulaco.mp3` — Atmospheric ambient tension loop
* `/audio/sfx_distant_boom1.wav` & `sfx_distant_boom2.wav` — Distant Sulaco hull groans
* `/audio/sfx_console_alarm.wav` — Klaxon alert
* `/audio/sfx_spark.wav` — Electrical sparking
* `/audio/defeat.mp3` — Game over defeat theme

### 3.2 M41A Pulse Rifle SFX
* `/audio/sfx_pulse.wav`, `sfx_pulse2.wav`, `sfx_pulse3.wav`, `sfx_pulse4.wav` — 4-sample round variation
* `/audio/sfx_pulse_tail.wav` — Acoustic corridor reverberation tail
* `/audio/sfx_reload_out.wav` — Magazine ejection
* `/audio/sfx_reload_in.wav` — Magazine seat
* `/audio/sfx_reload_slap.wav` — Bolt release slap
* `/audio/sfx_empty.wav` — Dry fire hammer click
* `/audio/sfx_ricochet1.wav` & `sfx_ricochet2.wav` — Metal bulkhead bullet ricochet

### 3.3 Motion Tracker & Tactical Equipment
* `/audio/sfx_tracker_sweep.wav` — Radar ping sweep pulse
* `/audio/sfx_tracker_ping.wav` — Proximity pitch-modulated target ping
* `/audio/sfx_torch_on.wav` & `sfx_torch_off.wav` — Flashlight toggle clicks
* `/audio/sfx_ui_beep.wav` — Upgrade selection and UI confirmation

### 3.4 Xenomorph Audio
* `/audio/sfx_xeno_hiss1.wav` & `sfx_xeno_hiss2.wav` — Aggro warning hisses
* `/audio/sfx_xeno_attack.wav` — Claw slash impact
* `/audio/sfx_xeno_sprint.wav` — Skittering pursuit footsteps
* `/audio/sfx_xeno_hit.wav` — Chitin impact scream
* `/audio/sfx_xeno_death1.wav` & `sfx_xeno_death2.wav` — Death shrieks
* `/audio/sfx_xeno_explode1.wav` & `sfx_xeno_gib1.wav` — Limb severing and body explosion
* `/audio/sfx_xeno_bodyfall.wav` — Corpse drop impact
* `/audio/sfx_acid_fizz.wav` & `sfx_acid_burn.wav` — Acid blood sizzle and burn pools
* `/audio/sfx_vent_clang.wav` — Ceiling vent spawn clang

### 3.5 Facehuggers & Small Swarmers
* `/audio/sfx_small_screech1.wav` & `sfx_small_screech2.wav` — High-pitched vocal screeches
* `/audio/sfx_small_skitter.wav` — Rapid multi-leg crawl
* `/audio/sfx_small_leap.wav` — Pounce jump
* `/audio/sfx_small_bite.wav` — Pounce latch damage
* `/audio/sfx_small_death.wav` — Splat kill

### 3.6 Marine & Combat Impacts
* `/audio/sfx_marine_pain.wav` — Damage grunt
* `/audio/sfx_marine_death.wav` — Fatal defeat vocal
* `/audio/sfx_bullet_flesh1.wav` & `sfx_bullet_flesh2.wav` — Xenomorph flesh penetration

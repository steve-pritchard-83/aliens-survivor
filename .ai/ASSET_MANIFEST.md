# Asset Manifest: Aliens Survivor

> **CRITICAL FOR AI AGENTS:** Use the exact node names, animation clip names, world-space coordinate transformations, and audio file paths listed below. Do not hallucinate bone or clip names.

## 1. 3D Models (`/public/models/`)

### 1.1 Corridor Level (`/models/corridor.glb` & `/models/corridors.glb`)
* **Root Hierarchy:** `Sketchfab_model` (scale `0.0053374`, rotated -90° X) -> `SFNR1.obj.cleaner.materialmerger.gles` (offset `[-752, -1280, -80]`) -> `Object_2` -> `Object_3`..`Object_9`
* **Meshes (7):** `Object_0` through `Object_6`
* **Materials (7):** `panel_color.bmp`, `pipewall_color.`, `schrank_color.b`, `sftex1.bmp`, `wall2_color.bmp`, `wall2_color2.bm`, `wire1.tga`
* **World-Space Coordinate Mapping:**
  * `worldX = (rawX - 752) * 0.0053374`
  * `worldY = (rawZ - 80) * 0.0053374` (Floor `rawZ = 80` maps exactly to `worldY = 0.0m`, ceiling `rawZ = 214` maps to `worldY = 0.715m` at 1x model scale; we scale the `<CorridorLevel />` root by `3.5` so ceiling height is `2.50m` and hallway width is `~3.2m`)
  * `worldZ = -(rawY - 1280) * 0.0053374`

### 1.2 M41A Pulse Rifle (`/models/pulse_rifle.glb`)
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
* **Animations:** None embedded (use procedural recoil, reload tilt, and LED ammo counter plane).

### 1.3 Xenomorph Drone (`/models/xenomorph.glb`)
* **Root Hierarchy:** `Sketchfab_model` -> `4d3e3330bde24cac8f907d06a95229c3.fbx` -> `Object_2` -> `RootNode` -> `alien_xenos_drone_SK_Xenos_Drone_skeleton` -> `Object_6` -> `_rootJoint`
* **Skinned Meshes:**
  * `Object_9` (`alien_xenos_drone_SK_Xenos_Drone_T_MI_Xeno_Body_BaseColor_0`, material: `T_MI_Xeno_Body_BaseColor`)
  * `Object_10` (`alien_xenos_drone_SK_Xenos_Drone_T_MI_Xeno_HeadCap_BaseColor_0`, material: `T_MI_Xeno_HeadCap_BaseColor`)
* **Exact Animation Clip Names (8 clips):**
  * `alien_xenos_drone_SK_Xenos_Drone_skeleton|attack1`
  * `alien_xenos_drone_SK_Xenos_Drone_skeleton|attack2`
  * `alien_xenos_drone_SK_Xenos_Drone_skeleton|die`
  * `alien_xenos_drone_SK_Xenos_Drone_skeleton|idle`
  * `alien_xenos_drone_SK_Xenos_Drone_skeleton|kill1`
  * `alien_xenos_drone_SK_Xenos_Drone_skeleton|kill2`
  * `alien_xenos_drone_SK_Xenos_Drone_skeleton|run1`
  * `alien_xenos_drone_SK_Xenos_Drone_skeleton|walk`

---

## 2. Fonts (`/public/fonts/`)
* `/fonts/AlienLeague.otf` (`font-family: 'AlienLeague'`)

---

## 3. Audio Assets (`/public/audio/`)
* **Music:**
  * `/audio/bgm_sulaco.mp3` — Background ambient tension track
* **Weapons (M41A Pulse Rifle):**
  * `/audio/sfx_pulse.wav` — Iconic Pulse Rifle staccato shot
  * `/audio/sfx_pulse_tail.wav` — Corridor echo tail
  * `/audio/sfx_reload_out.wav` — Magazine eject clack
  * `/audio/sfx_reload_in.wav` — Magazine insert clack
  * `/audio/sfx_reload_slap.wav` — Side catch bolt slap
  * `/audio/sfx_empty.wav` — Dry fire click
* **Equipment (M314 Motion Tracker & UI):**
  * `/audio/sfx_tracker_sweep.wav` — Rhythmic radar sweep pulse
  * `/audio/sfx_tracker_ping.wav` — Pitch-modulated proximity micro-ping
  * `/audio/sfx_ui_beep.wav` — Console/UI interaction beep
  * `/audio/sfx_spark.wav` — Environmental electrical spark
* **Xenomorph Spatial Audio:**
  * `/audio/sfx_xeno_hiss1.wav` — Short hiss
  * `/audio/sfx_xeno_hiss2.wav` — Short growl
  * `/audio/sfx_xeno_hit.wav` — Bullet impact vocal pain
  * `/audio/sfx_xeno_death1.wav` — Iconic elephant death scream
  * `/audio/sfx_xeno_death2.wav` — Secondary death scream
  * `/audio/sfx_xeno_attack.wav` — Melee claw slash impact
  * `/audio/sfx_acid_fizz.wav` — Acid blood burst sizzle
  * `/audio/sfx_vent_clang.wav` — Metallic vent breach sound
* **Colonial Marine Audio:**
  * `/audio/sfx_marine_pain.wav` — Player damage grunt
  * `/audio/sfx_marine_death.wav` — Player defeat vocal

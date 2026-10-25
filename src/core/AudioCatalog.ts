// Sound catalogue: keys, asset URLs and playback policy tables for AudioManager
export type SoundKey =
  | 'pulse_shot'
  | 'pulse_shot2'
  | 'pulse_shot3'
  | 'pulse_shot4'
  | 'pulse_tail'
  | 'reload_out'
  | 'reload_in'
  | 'reload_slap'
  | 'empty_click'
  | 'tracker_sweep'
  | 'tracker_ping'
  | 'xeno_hiss1'
  | 'xeno_hiss2'
  | 'xeno_hit'
  | 'xeno_death1'
  | 'xeno_death2'
  | 'xeno_attack'
  | 'xeno_sprint'
  | 'xeno_bodyfall'
  | 'xeno_gib1'
  | 'xeno_explode1'
  | 'small_screech1'
  | 'small_screech2'
  | 'small_death'
  | 'small_skitter'
  | 'small_bite'
  | 'small_leap'
  | 'bullet_flesh1'
  | 'bullet_flesh2'
  | 'ricochet1'
  | 'ricochet2'
  | 'acid_fizz'
  | 'acid_burn'
  | 'vent_clang'
  | 'marine_pain'
  | 'marine_death'
  | 'torch_on'
  | 'torch_off'
  | 'distant_boom1'
  | 'distant_boom2'
  | 'console_alarm'
  | 'spark'
  | 'ui_beep'
  | 'defeat';

export const SOUND_URLS: Record<SoundKey, string> = {
  pulse_shot: '/audio/sfx_pulse.wav',
  pulse_shot2: '/audio/sfx_pulse2.wav',
  pulse_shot3: '/audio/sfx_pulse3.wav',
  pulse_shot4: '/audio/sfx_pulse4.wav',
  pulse_tail: '/audio/sfx_pulse_tail.wav',
  reload_out: '/audio/sfx_reload_out.m4a',
  reload_in: '/audio/sfx_reload_in.m4a',
  reload_slap: '/audio/sfx_reload_slap.m4a',
  empty_click: '/audio/sfx_empty.wav',
  tracker_sweep: '/audio/sfx_tracker_sweep.m4a',
  tracker_ping: '/audio/sfx_tracker_ping.wav',
  xeno_hiss1: '/audio/sfx_xeno_hiss1.m4a',
  xeno_hiss2: '/audio/sfx_xeno_hiss2.m4a',
  xeno_hit: '/audio/sfx_xeno_hit.m4a',
  xeno_death1: '/audio/sfx_xeno_death1.m4a',
  xeno_death2: '/audio/sfx_xeno_death2.m4a',
  xeno_attack: '/audio/sfx_xeno_attack.m4a',
  xeno_sprint: '/audio/sfx_xeno_sprint.m4a',
  xeno_bodyfall: '/audio/sfx_xeno_bodyfall.m4a',
  xeno_gib1: '/audio/sfx_xeno_gib1.m4a',
  xeno_explode1: '/audio/sfx_xeno_explode1.m4a',
  small_screech1: '/audio/sfx_small_screech1.m4a',
  small_screech2: '/audio/sfx_small_screech2.m4a',
  small_death: '/audio/sfx_small_death.m4a',
  small_skitter: '/audio/sfx_small_skitter.m4a',
  small_bite: '/audio/sfx_small_bite.m4a',
  small_leap: '/audio/sfx_small_leap.m4a',
  bullet_flesh1: '/audio/sfx_bullet_flesh1.m4a',
  bullet_flesh2: '/audio/sfx_bullet_flesh2.m4a',
  ricochet1: '/audio/sfx_ricochet1.m4a',
  ricochet2: '/audio/sfx_ricochet2.m4a',
  acid_fizz: '/audio/sfx_acid_fizz.m4a',
  acid_burn: '/audio/sfx_acid_burn.m4a',
  vent_clang: '/audio/sfx_vent_clang.m4a',
  marine_pain: '/audio/sfx_marine_pain.m4a',
  marine_death: '/audio/sfx_marine_death.m4a',
  torch_on: '/audio/sfx_torch_on.m4a',
  torch_off: '/audio/sfx_torch_off.m4a',
  distant_boom1: '/audio/sfx_distant_boom1.m4a',
  distant_boom2: '/audio/sfx_distant_boom2.m4a',
  console_alarm: '/audio/sfx_console_alarm.m4a',
  spark: '/audio/sfx_spark.m4a',
  ui_beep: '/audio/sfx_ui_beep.wav',
  defeat: '/audio/defeat.mp3'
};

export const BGM_URL = '/audio/bgm_sulaco.m4a';

/** Sounds that must always play, even when the voice cap is reached. */
export const CRITICAL_SOUNDS: ReadonlySet<SoundKey> = new Set<SoundKey>([
  'pulse_shot',
  'pulse_shot2',
  'pulse_shot3',
  'pulse_shot4',
  'pulse_tail',
  'marine_pain',
  'marine_death',
  'defeat',
  'ui_beep'
]);

/** Sounds worth full HRTF spatialisation; everything else uses the cheaper equal-power panner. */
export const HRTF_SOUNDS: ReadonlySet<SoundKey> = new Set<SoundKey>([
  'xeno_attack',
  'xeno_hiss1',
  'xeno_hiss2',
  'xeno_sprint',
  'vent_clang',
  'small_screech1',
  'small_screech2'
]);

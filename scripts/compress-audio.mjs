// Converts public/audio WAVs (and the BGM mp3) to AAC .m4a and archives the originals in assets/audio-src.
// Requires ffmpeg on PATH. Usage: node scripts/compress-audio.mjs
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, renameSync, statSync } from 'node:fs';
import { join, parse } from 'node:path';

const AUDIO_DIR = 'public/audio';
const ARCHIVE_DIR = 'assets/audio-src';

// Gunfire, dry-fire and UI cues keep their WAV: AAC adds encoder padding that would delay sample-accurate starts
const KEEP_AS_WAV = new Set([
  'sfx_pulse.wav',
  'sfx_pulse2.wav',
  'sfx_pulse3.wav',
  'sfx_pulse4.wav',
  'sfx_pulse_tail.wav',
  'sfx_empty.wav',
  'sfx_tracker_ping.wav',
  'sfx_ui_beep.wav'
]);

// Long-form music is encoded at a lower bitrate than effects
const MUSIC = new Map([['bgm_sulaco.mp3', '80k']]);
const SFX_BITRATE = '96k';

function encode(input, output, bitrate, channels) {
  const args = ['-y', '-loglevel', 'error', '-i', input, '-c:a', 'aac', '-b:a', bitrate];
  if (channels) args.push('-ac', String(channels));
  args.push('-movflags', '+faststart', output);
  execFileSync('ffmpeg', args, { stdio: 'inherit' });
}

mkdirSync(ARCHIVE_DIR, { recursive: true });
let before = 0;
let after = 0;

for (const file of readdirSync(AUDIO_DIR)) {
  const { name, ext } = parse(file);
  const isMusic = MUSIC.has(file);
  const isSfx = ext === '.wav' && !KEEP_AS_WAV.has(file);
  if (!isMusic && !isSfx) continue;
  const input = join(AUDIO_DIR, file);
  const output = join(AUDIO_DIR, `${name}.m4a`);
  before += statSync(input).size;
  encode(input, output, isMusic ? MUSIC.get(file) : SFX_BITRATE, isMusic ? 0 : 1);
  after += statSync(output).size;
  const archived = join(ARCHIVE_DIR, file);
  if (!existsSync(archived)) renameSync(input, archived);
  console.log(`${file} -> ${name}.m4a`);
}

const mb = (n) => (n / 1048576).toFixed(2);
console.log(`Converted ${mb(before)} MB -> ${mb(after)} MB`);

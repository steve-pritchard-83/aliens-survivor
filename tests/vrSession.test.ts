import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useGameStore } from '../src/core/GameStore';
import { AudioManager } from '../src/core/AudioManager';
import { launchMission } from '../src/core/MissionLauncher';
import { attachSessionHandlers } from '../src/ui/vrSessionEvents';

class FakeSession extends EventTarget {
  visibilityState: XRVisibilityState = 'visible';
  setVisibility(v: XRVisibilityState) {
    this.visibilityState = v;
    this.dispatchEvent(new Event('visibilitychange'));
  }
}
const status = () => useGameStore.getState().status;

describe('launchMission', () => {
  it('starts a new run and brings up audio', async () => {
    const unlock = vi.spyOn(AudioManager, 'unlock').mockResolvedValue();
    const bgm = vi.spyOn(AudioManager, 'startBGM').mockImplementation(() => undefined);
    const klaxon = vi.spyOn(AudioManager, 'setKlaxonActive').mockImplementation(() => undefined);
    vi.spyOn(AudioManager, 'play2D').mockImplementation(() => undefined);
    const before = useGameStore.getState().runId;
    launchMission();
    expect(status()).toBe('PLAYING');
    expect(useGameStore.getState().runId).toBe(before + 1);
    await Promise.resolve();
    await Promise.resolve();
    expect(unlock).toHaveBeenCalled();
    expect(bgm).toHaveBeenCalled();
    expect(klaxon).toHaveBeenCalledWith(true);
    vi.restoreAllMocks();
  });
});

describe('VR session handlers', () => {
  beforeEach(() => {
    vi.spyOn(AudioManager, 'pauseBGM').mockImplementation(() => undefined);
    vi.spyOn(AudioManager, 'resumeBGM').mockImplementation(() => undefined);
    vi.spyOn(AudioManager, 'setKlaxonActive').mockImplementation(() => undefined);
    useGameStore.getState().startGame();
  });

  it('pauses when the headset loses visibility and resumes when it returns', () => {
    const s = new FakeSession();
    const detach = attachSessionHandlers(s as unknown as XRSession);
    s.setVisibility('visible-blurred');
    expect(status()).toBe('PAUSED');
    s.setVisibility('visible');
    expect(status()).toBe('PLAYING');
    detach();
  });

  it('does not resume a pause the player made themselves', () => {
    const s = new FakeSession();
    attachSessionHandlers(s as unknown as XRSession);
    useGameStore.getState().pauseGame();
    s.setVisibility('hidden');
    s.setVisibility('visible');
    expect(status()).toBe('PAUSED');
  });

  it('pauses when the session ends while playing, but leaves menus and end screens alone', () => {
    const s = new FakeSession();
    attachSessionHandlers(s as unknown as XRSession);
    s.dispatchEvent(new Event('end'));
    expect(status()).toBe('PAUSED');
    useGameStore.setState({ status: 'DEFEAT' });
    s.dispatchEvent(new Event('end'));
    expect(status()).toBe('DEFEAT');
  });

  it('stops reacting once detached', () => {
    const s = new FakeSession();
    const detach = attachSessionHandlers(s as unknown as XRSession);
    detach();
    s.setVisibility('hidden');
    expect(status()).toBe('PLAYING');
  });
});

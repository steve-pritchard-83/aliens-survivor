import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore, computePhase } from '../src/core/GameStore';
import { constrainToCorridor, getHallId } from '../src/core/CorridorNav';

describe('Corridor Navigation & Hall Math', () => {
  it('correctly constrains player position inside Sulaco corridor bounds', () => {
    // Center of main east spine corridor
    const [cx, cz] = constrainToCorridor(-0.32, 15.0, 0.1);
    expect(cx).toBeCloseTo(-0.32, 2);
    expect(cz).toBeCloseTo(15.0, 2);

    // Clamp out-of-bounds X to nearest corridor wall
    const [clampedX] = constrainToCorridor(5.0, 15.0, 0.1);
    expect(clampedX).toBeLessThanOrEqual(0.32);

    // Identify hall IDs (0: East spine, 1: West spine, 2: North hall)
    expect(getHallId(-0.32, 15.0)).toBe(0); // East hall
    expect(getHallId(-13.48, 15.0)).toBe(1); // West hall
    expect(getHallId(-6.0, 35.9)).toBe(2); // North hall
  });
});

describe('Mission Phase Transitions', () => {
  it('computes phases according to mission time remaining', () => {
    expect(computePhase(300)).toBe(1);
    expect(computePhase(230)).toBe(1);
    expect(computePhase(220)).toBe(2);
    expect(computePhase(125)).toBe(2);
    expect(computePhase(115)).toBe(3);
    expect(computePhase(50)).toBe(3);
    expect(computePhase(40)).toBe(4);
    expect(computePhase(0)).toBe(4);
  });
});

describe('GameStore State Machine', () => {
  beforeEach(() => {
    useGameStore.getState().startGame();
  });

  it('initializes mission with 300s, 100 HP, 99 rounds', () => {
    const s = useGameStore.getState();
    expect(s.status).toBe('PLAYING');
    expect(s.timeRemaining).toBe(300);
    expect(s.hp).toBe(100);
    expect(s.ammo).toBe(99);
    expect(s.isReloading).toBe(false);
  });

  it('handles firing and ammo depletion into reload', () => {
    const fired = useGameStore.getState().fireRound();
    expect(fired).toBe(true);
    expect(useGameStore.getState().ammo).toBe(98);
    expect(useGameStore.getState().shotsFired).toBe(1);
  });

  it('handles taking damage and death', () => {
    useGameStore.getState().takeDamage(60, 1.0);
    expect(useGameStore.getState().hp).toBe(40);
    expect(useGameStore.getState().status).toBe('PLAYING');

    useGameStore.getState().takeDamage(50, 2.0);
    expect(useGameStore.getState().hp).toBe(0);
    expect(useGameStore.getState().status).toBe('DEFEAT');
  });

  it('awards XP on kills and triggers LEVEL_UP when threshold reached', () => {
    expect(useGameStore.getState().level).toBe(1);
    expect(useGameStore.getState().xp).toBe(0);

    // Drone kill gives 25 XP
    useGameStore.getState().registerKill(false);
    expect(useGameStore.getState().xp).toBe(25);
    expect(useGameStore.getState().status).toBe('PLAYING');

    // Second drone kill gives +25 XP -> 50 XP (Level 1 threshold is 50)
    useGameStore.getState().registerKill(false);
    expect(useGameStore.getState().xp).toBe(50);
    expect(useGameStore.getState().level).toBe(2);
    expect(useGameStore.getState().status).toBe('LEVEL_UP');
    expect(useGameStore.getState().offeredUpgrades.length).toBeGreaterThan(0);

    // Choose extended drum upgrade
    useGameStore.getState().chooseUpgrade('extended_mag');
    expect(useGameStore.getState().status).toBe('PLAYING');
    expect(useGameStore.getState().maxAmmo).toBe(150);
    expect(useGameStore.getState().ammo).toBe(150);
    expect(useGameStore.getState().activeUpgrades).toContain('extended_mag');
  });

  it('applies acid damage reduction upgrade', () => {
    useGameStore.getState().chooseUpgrade('acid_proofing');
    useGameStore.getState().takeDamage(20, 1.0, true);
    // Acid damage reduced by 50% from 20 to 10
    expect(useGameStore.getState().hp).toBe(90);
  });

  it('triggers victory when time reaches 0', () => {
    useGameStore.setState({ timeRemaining: 0.1 });
    useGameStore.getState().tick(0.2, 10.0);
    expect(useGameStore.getState().status).toBe('VICTORY');
  });
});

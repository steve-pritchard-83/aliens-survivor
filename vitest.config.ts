import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      // Logic layers only: React/three adapters and the Web Audio graph are covered by the browser smoke test
      include: [
        'src/core/**/*.ts',
        'src/data/**/*.ts',
        'src/systems/**/*.ts',
        'src/entities/xeno/**/*.ts',
        'src/entities/small/**/*.ts',
        'src/entities/level/**/*.ts',
        'src/entities/rifle/**/*.ts',
        'src/ui/VRMenuNav.ts'
      ],
      // Excluded: Web Audio graph, XR/haptics hardware glue and canvas/skeleton builders (smoke-tested in a browser)
      exclude: [
        'src/**/*.d.ts',
        'src/core/AudioManager.ts',
        'src/core/XRStore.ts',
        'src/core/Haptics.ts',
        'src/core/MuzzleTexture.ts',
        'src/core/SevenSegment.ts',
        'src/entities/small/smallAssets.ts'
      ],
      reporter: ['text-summary', 'text'],
      thresholds: { lines: 80, functions: 75, branches: 65 }
    }
  }
});

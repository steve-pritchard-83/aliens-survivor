import { Suspense, lazy } from 'react';
import { Canvas } from '@react-three/fiber';
import { XR, XROrigin } from '@react-three/xr';
import { xrStore } from './core/XRStore';
import { CorridorLevel } from './entities/CorridorLevel';
import { PlayerController } from './entities/PlayerController';
import { PulseRifle } from './entities/PulseRifle';
import { XenomorphPool } from './entities/XenomorphPool';
import { SmallAlienSpawner } from './entities/SmallAlienSpawner';
import { XenomorphImpactFX } from './entities/XenomorphImpactFX';
import { sharedImpactFx } from './entities/fx/sharedImpactFx';
import { WallImpactFX } from './entities/WallImpactFX';
import { MotionTracker } from './entities/MotionTracker';
import { HUD } from './ui/HUD';
import { VRHud } from './ui/VRHud';
import { ComfortVignette } from './entities/ComfortVignette';
import { VRAutoLauncher } from './ui/VRAutoLauncher';
import { AdaptiveQuality } from './core/AdaptiveQuality';
import { InputManager } from './core/InputManager';
import { useGameStore } from './core/GameStore';
import { Platform } from './core/Platform';
import { ShaderWarmup } from './entities/fx/ShaderWarmup';
import { HitVignette } from './entities/HitVignette';

// Telemetry is only ever used with ?debug=1, so keep it out of the main bundle
const DebugTelemetry = lazy(() => import('./ui/DebugTelemetry').then((m) => ({ default: m.DebugTelemetry })));

export function App() {
  const status = useGameStore((s) => s.status);

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        position: 'relative',
        overflow: 'hidden',
        background: '#030507',
        // Pinch-zoom stays available on menus; during play touches belong to the game
        touchAction: status === 'PLAYING' ? 'none' : 'manipulation'
      }}
      onClick={() => {
        if (status === 'PLAYING' && InputManager.mode === 'DESKTOP' && Platform.hasMouse) {
          InputManager.requestPointerLock();
        }
      }}
    >
      <HUD />

      <Canvas
        dpr={0.8}
        camera={{ fov: 62, near: 0.05, far: 65, position: [-0.8, 1.15, 13.0] }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
      >
        <XR store={xrStore}>
          <VRAutoLauncher />
          <AdaptiveQuality />
          <XROrigin position={[-0.8, 0, 13.0]} />
          <Suspense fallback={null}>
            <CorridorLevel />
            <WallImpactFX />
            <PlayerController />
            <PulseRifle />
            <MotionTracker />
            <XenomorphImpactFX ref={sharedImpactFx} />
            <XenomorphPool />
            <SmallAlienSpawner />
            <VRHud />
            <ComfortVignette />
            <HitVignette />
            <ShaderWarmup />
            {Platform.isDebug && <DebugTelemetry />}
          </Suspense>
        </XR>
      </Canvas>
      {/* Faint blue-teal grade over the picture (VR gets the same look from the fog and light colours) */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 5,
          pointerEvents: 'none',
          background: 'rgba(30, 120, 150, 0.14)',
          mixBlendMode: 'soft-light'
        }}
      />
    </div>
  );
}

export default App;

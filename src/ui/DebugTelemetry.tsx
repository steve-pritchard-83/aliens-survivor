import { useRef, useMemo, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useXR } from '@react-three/xr';
import * as THREE from 'three';

const _vPos = new THREE.Vector3(),
  _vFwd = new THREE.Vector3(),
  _vQuat = new THREE.Quaternion();

export function DebugTelemetry() {
  const isDebug = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).has('debug') || sessionStorage.getItem('uscm_debug') === '1';
  }, []);

  const { session } = useXR();
  const { gl, camera } = useThree();
  const panelMeshRef = useRef<THREE.Mesh>(null);
  const domRef = useRef<HTMLDivElement | null>(null);

  const lastTimeRef = useRef(performance.now());
  const framesRef = useRef(0);
  const fpsTextRef = useRef('FPS: -- | -- ms');

  const { debugCanvas, debugTex } = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return { debugCanvas: canvas, debugTex: tex };
  }, []);

  useEffect(() => {
    if (!isDebug) return;
    const div = document.createElement('div');
    div.style.position = 'fixed';
    div.style.top = '10px';
    div.style.left = '10px';
    div.style.zIndex = '9999';
    div.style.padding = '6px 12px';
    div.style.background = 'rgba(2, 10, 6, 0.88)';
    div.style.border = '1px solid #00ff88';
    div.style.color = '#00ff88';
    div.style.fontFamily = 'monospace';
    div.style.fontSize = '12px';
    div.style.pointerEvents = 'none';
    div.style.borderRadius = '4px';
    div.innerText = 'INIT DEBUG...';
    document.body.appendChild(div);
    domRef.current = div;
    return () => {
      div.remove();
      domRef.current = null;
    };
  }, [isDebug]);

  useFrame(() => {
    if (!isDebug) return;
    framesRef.current++;
    const now = performance.now();
    const elapsed = now - lastTimeRef.current;

    if (elapsed >= 250) {
      const fps = Math.round((framesRef.current * 1000) / elapsed);
      const frameMs = (elapsed / framesRef.current).toFixed(1);
      const calls = gl.info.render.calls;
      const tris = gl.info.render.triangles;
      const memGeos = gl.info.memory.geometries;
      const memTex = gl.info.memory.textures;
      const isXR = Boolean(session);

      fpsTextRef.current = `FPS: ${fps} | ${frameMs}ms | CALLS: ${calls} | TRIS: ${tris} | GEO: ${memGeos} | TEX: ${memTex} | XR: ${isXR ? 'ON' : 'OFF'}`;
      framesRef.current = 0;
      lastTimeRef.current = now;

      if (domRef.current && !isXR) {
        domRef.current.innerText = fpsTextRef.current;
      }

      if (isXR) {
        const ctx = debugCanvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, 512, 256);
          ctx.fillStyle = 'rgba(2, 12, 6, 0.85)';
          ctx.fillRect(0, 0, 512, 256);
          ctx.strokeStyle = '#00ff88';
          ctx.lineWidth = 4;
          ctx.strokeRect(4, 4, 504, 248);

          ctx.fillStyle = '#00ff88';
          ctx.font = 'bold 26px monospace';
          ctx.fillText(`FPS: ${fps} (${frameMs} ms)`, 24, 55);

          ctx.fillStyle = '#88ffaa';
          ctx.font = '20px monospace';
          ctx.fillText(`DRAWS: ${calls}  TRIS: ${tris}`, 24, 105);
          ctx.fillText(`GEOS: ${memGeos}  TEXS: ${memTex}`, 24, 150);
          ctx.fillText(`MODE: IMMERSIVE-VR`, 24, 195);
          debugTex.needsUpdate = true;
        }
      }
    }

    if (session && panelMeshRef.current) {
      camera.getWorldPosition(_vPos);
      camera.getWorldDirection(_vFwd);
      camera.getWorldQuaternion(_vQuat);
      panelMeshRef.current.position.copy(_vPos).addScaledVector(_vFwd, 1.3);
      panelMeshRef.current.position.y += 0.32;
      panelMeshRef.current.quaternion.copy(_vQuat);
      panelMeshRef.current.visible = true;
    } else if (panelMeshRef.current) {
      panelMeshRef.current.visible = false;
    }
  });

  if (!isDebug) return null;

  return (
    <mesh ref={panelMeshRef} visible={false}>
      <planeGeometry args={[0.55, 0.28]} />
      <meshBasicMaterial map={debugTex} transparent depthTest={false} depthWrite={false} side={THREE.DoubleSide} />
    </mesh>
  );
}

import * as THREE from 'three';

// A small teal reflection environment for the creatures only: dark room, cold ceiling strips and one pale
// doorway, so their glossy skin picks up the same highlights as the film art without touching the walls.
const registered = new Set<THREE.MeshStandardMaterial>();
let envMap: THREE.Texture | null = null;

/** Gives a material wet, reflective skin. Safe to call before the environment exists; it is applied once built. */
export function registerWet(mat: THREE.MeshStandardMaterial, intensity = 0.85): void {
  mat.envMapIntensity = intensity;
  registered.add(mat);
  if (envMap) {
    mat.envMap = envMap;
    mat.needsUpdate = true;
  }
}

function glowing(hex: number, level: number): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({ color: new THREE.Color(hex).multiplyScalar(level), side: THREE.DoubleSide });
}

/** Builds the environment once, from the renderer, and applies it to every registered material. */
export function installWetEnv(gl: THREE.WebGLRenderer): void {
  if (envMap) return;
  const scene = new THREE.Scene();
  scene.add(
    new THREE.Mesh(
      new THREE.BoxGeometry(24, 8, 44),
      new THREE.MeshBasicMaterial({ color: 0x03090c, side: THREE.BackSide })
    )
  );
  const strips = glowing(0x5fd0e8, 2);
  for (const x of [-3.5, 3.5]) {
    const strip = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 34), strips);
    strip.rotation.x = Math.PI / 2;
    strip.position.set(x, 3.9, 0);
    scene.add(strip);
  }
  const door = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 5.5), glowing(0xdff0cf, 4));
  door.position.set(0, 0.5, -21.5);
  scene.add(door);

  const pmrem = new THREE.PMREMGenerator(gl);
  envMap = pmrem.fromScene(scene, 0.03).texture;
  pmrem.dispose();
  scene.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (mesh.isMesh) mesh.geometry.dispose();
  });
  registered.forEach((m) => {
    m.envMap = envMap;
    m.needsUpdate = true;
  });
}

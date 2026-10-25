import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { installWetEnv } from './wetEnv';

/** Builds the creatures' reflection environment once the renderer exists. Renders nothing. */
export function WetEnvironment() {
  const gl = useThree((s) => s.gl);
  useEffect(() => {
    installWetEnv(gl);
  }, [gl]);
  return null;
}

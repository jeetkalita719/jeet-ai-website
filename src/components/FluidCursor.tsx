'use client';
import { useEffect } from 'react';

import fluidCursor from '@/hooks/use-FluidCursor';

const FluidCursor = () => {
  useEffect(() => {
    try {
      return fluidCursor();
    } catch (err) {
      console.warn(
        'FluidCursor: WebGL unavailable, background effect disabled',
        err
      );
    }
  }, []);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed top-0 left-0 z-0"
    >
      <canvas id="fluid" className="h-screen w-screen" />
    </div>
  );
};
export default FluidCursor;

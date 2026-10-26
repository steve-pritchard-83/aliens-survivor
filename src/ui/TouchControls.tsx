import React, { useEffect, useRef, useState } from 'react';
import { InputManager } from '../core/InputManager';
import { GREEN, hintStyle } from './uiStyles';

const STICK_RADIUS = 48;
const LOOK_SENS_X = 0.0115;
const LOOK_SENS_Y = 0.0105;

const zoneStyle: React.CSSProperties = {
  position: 'absolute',
  top: 0,
  width: '50%',
  height: '100%',
  pointerEvents: 'auto',
  touchAction: 'none'
};

/** Dual-zone touch controls: left half is a floating move stick, right half is look (with auto-fire). */
export function TouchControls({ onPause }: { onPause: () => void }) {
  const [joyOrigin, setJoyOrigin] = useState<[number, number] | null>(null),
    [joyOffset, setJoyOffset] = useState<[number, number]>([0, 0]);
  const joyTouchId = useRef<number | null>(null),
    lookTouchId = useRef<number | null>(null),
    lookLastPos = useRef<[number, number] | null>(null);

  // This component unmounts on pause or level-up before its touchend arrives; never leave the stick held
  useEffect(() => () => InputManager.setTouchMove(0, 0), []);

  const onLeftStart = (e: React.TouchEvent) => {
    const t = e.changedTouches[0];
    joyTouchId.current = t.identifier;
    setJoyOrigin([t.clientX, t.clientY]);
    setJoyOffset([0, 0]);
  };
  const onLeftMove = (e: React.TouchEvent) => {
    if (!joyOrigin) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      if (t.identifier !== joyTouchId.current) continue;
      const dx = t.clientX - joyOrigin[0],
        dy = t.clientY - joyOrigin[1],
        dist = Math.min(STICK_RADIUS, Math.hypot(dx, dy)),
        a = Math.atan2(dy, dx);
      const ox = Math.cos(a) * dist,
        oy = Math.sin(a) * dist;
      setJoyOffset([ox, oy]);
      InputManager.setTouchMove(ox / STICK_RADIUS, -oy / STICK_RADIUS);
      break;
    }
  };
  const onLeftEnd = (e: React.TouchEvent) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier !== joyTouchId.current) continue;
      joyTouchId.current = null;
      setJoyOrigin(null);
      setJoyOffset([0, 0]);
      InputManager.setTouchMove(0, 0);
      break;
    }
  };
  const onRightStart = (e: React.TouchEvent) => {
    const t = e.changedTouches[0];
    lookTouchId.current = t.identifier;
    lookLastPos.current = [t.clientX, t.clientY];
  };
  const onRightMove = (e: React.TouchEvent) => {
    const last = lookLastPos.current;
    if (!last) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      if (t.identifier !== lookTouchId.current) continue;
      InputManager.addTouchLook((t.clientX - last[0]) * LOOK_SENS_X, (t.clientY - last[1]) * LOOK_SENS_Y);
      lookLastPos.current = [t.clientX, t.clientY];
      break;
    }
  };
  const onRightEnd = (e: React.TouchEvent) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier !== lookTouchId.current) continue;
      lookTouchId.current = null;
      lookLastPos.current = null;
      break;
    }
  };

  return (
    <>
      <button
        onClick={onPause}
        onTouchStart={(e) => {
          e.stopPropagation();
          onPause();
        }}
        style={{
          position: 'absolute',
          top: 16,
          right: 16,
          padding: '8px 18px',
          background: 'rgba(2, 24, 15, 0.75)',
          border: '1.5px solid rgba(0, 255, 136, 0.7)',
          color: GREEN,
          fontFamily: 'inherit',
          fontSize: 13,
          letterSpacing: 2,
          borderRadius: 4,
          pointerEvents: 'auto',
          cursor: 'pointer',
          zIndex: 20
        }}
      >
        PAUSE
      </button>
      <div
        onTouchStart={onLeftStart}
        onTouchMove={onLeftMove}
        onTouchEnd={onLeftEnd}
        onTouchCancel={onLeftEnd}
        style={{ ...zoneStyle, left: 0 }}
      />
      <div
        onTouchStart={onRightStart}
        onTouchMove={onRightMove}
        onTouchEnd={onRightEnd}
        onTouchCancel={onRightEnd}
        style={{ ...zoneStyle, right: 0 }}
      />
      {joyOrigin && (
        <div
          style={{
            position: 'fixed',
            left: joyOrigin[0] - 55,
            top: joyOrigin[1] - 55,
            width: 110,
            height: 110,
            borderRadius: '50%',
            border: '2px solid rgba(0, 255, 136, 0.55)',
            background: 'radial-gradient(circle, rgba(0, 45, 25, 0.5) 0%, rgba(0, 255, 136, 0.1) 100%)',
            pointerEvents: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 12
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              background: 'rgba(0, 255, 136, 0.75)',
              boxShadow: '0 0 14px rgba(0, 255, 136, 0.6)',
              transform: `translate(${joyOffset[0]}px, ${joyOffset[1]}px)`
            }}
          />
        </div>
      )}
      <div style={{ ...hintStyle, left: 24 }}>[LEFT SCREEN: MOVE]</div>
      <div style={{ ...hintStyle, right: 24 }}>[RIGHT SCREEN: AIM // AUTO-FIRE]</div>
    </>
  );
}

import React, { useEffect, useState } from 'react';

export const CustomCursor: React.FC = () => {
  const [position, setPosition] = useState({ x: -100, y: -100 });
  const [trailingPos, setTrailingPos] = useState({ x: -100, y: -100 });
  const [isHovered, setIsHovered] = useState(false);
  const [isClicked, setIsClicked] = useState(false);
  const [cursorText, setCursorText] = useState('');
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Only enable for pointer devices (not pure touch)
    if (window.matchMedia('(pointer: coarse)').matches) {
      return;
    }

    const onMouseMove = (e: MouseEvent) => {
      setPosition({ x: e.clientX, y: e.clientY });
      setIsVisible(true);

      // Check if hovering interactive element
      const target = e.target as HTMLElement | null;
      const interactive = target?.closest('button, a, input, [data-cursor], .interactive-hover');
      if (interactive) {
        setIsHovered(true);
        const text = interactive.getAttribute('data-cursor');
        setCursorText(text || '');
      } else {
        setIsHovered(false);
        setCursorText('');
      }
    };

    const onMouseDown = () => setIsClicked(true);
    const onMouseUp = () => setIsClicked(false);
    const onMouseLeave = () => setIsVisible(false);

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);
    document.addEventListener('mouseleave', onMouseLeave);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
      document.removeEventListener('mouseleave', onMouseLeave);
    };
  }, []);

  // Smooth lag follower
  useEffect(() => {
    let animationFrameId: number;
    const follow = () => {
      setTrailingPos(prev => ({
        x: prev.x + (position.x - prev.x) * 0.2,
        y: prev.y + (position.y - prev.y) * 0.2
      }));
      animationFrameId = requestAnimationFrame(follow);
    };
    animationFrameId = requestAnimationFrame(follow);
    return () => cancelAnimationFrame(animationFrameId);
  }, [position]);

  if (!isVisible) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[9999] overflow-hidden transition-opacity duration-300 hidden md:block">
      {/* Outer Glow Ring */}
      <div
        className={`fixed -translate-x-1/2 -translate-y-1/2 rounded-full transition-[width,height,background-color,transform] duration-200 flex items-center justify-center ${
          isHovered
            ? 'w-14 h-14 bg-vybe-lime/30 border-2 border-vybe-lime backdrop-blur-xs scale-110'
            : isClicked
            ? 'w-8 h-8 bg-vybe-citrus/40 border border-vybe-citrus scale-90'
            : 'w-8 h-8 border border-white/40 dark:border-vybe-lime/40 bg-white/5'
        }`}
        style={{
          left: `${trailingPos.x}px`,
          top: `${trailingPos.y}px`
        }}
      >
        {cursorText && (
          <span className="text-[9px] font-extrabold uppercase tracking-widest text-black dark:text-vybe-lime">
            {cursorText}
          </span>
        )}
      </div>

      {/* Center Dot */}
      <div
        className="fixed -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-vybe-lime dark:bg-vybe-lime shadow-neon-lime"
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`
        }}
      />
    </div>
  );
};


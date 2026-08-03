import {useRef} from 'react';
import type {ReactNode} from 'react';
import {cn} from '@/lib/utils';

type Props = {
  children: ReactNode;
  className?: string;
};

/** A glass panel with a mouse-tracking spotlight highlight (see .spotlight in index.css). */
export default function SpotlightCard({children, className}: Props) {
  const ref = useRef<HTMLDivElement>(null);

  const onMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty('--spot-x', `${e.clientX - rect.left}px`);
    el.style.setProperty('--spot-y', `${e.clientY - rect.top}px`);
  };

  return (
    <div
      ref={ref}
      onMouseMove={onMouseMove}
      className={cn('glass-panel spotlight rounded-xl', className)}>
      {children}
    </div>
  );
}

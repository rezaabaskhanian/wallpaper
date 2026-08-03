import {cn} from '@/lib/utils';

type Tone = 'success' | 'warning' | 'destructive' | 'info' | 'neutral';

const TONE_CLASSES: Record<Tone, string> = {
  success: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/25',
  warning: 'text-amber-400 bg-amber-400/10 border-amber-400/25',
  destructive: 'text-rose-400 bg-rose-400/10 border-rose-400/25',
  info: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/25',
  neutral: 'text-muted-foreground bg-muted border-border',
};

type Props = {
  label: string;
  tone: Tone;
  /** Show the pulsing status dot (use for "live" states like active/premium). */
  pulse?: boolean;
};

export default function StatusBadge({label, tone, pulse = true}: Props) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium',
        TONE_CLASSES[tone],
      )}>
      <span className="relative inline-flex size-1.5">
        {pulse ? <span className="status-dot absolute inset-0" /> : null}
        <span className="relative inline-block size-1.5 rounded-full bg-current" />
      </span>
      <span className="font-mono">{label}</span>
    </span>
  );
}

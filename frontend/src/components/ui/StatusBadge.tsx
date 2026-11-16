import React from 'react';

export type BadgeColor = 'green' | 'yellow' | 'red' | 'blue' | 'neutral';

export interface StatusBadgeProps {
  color: BadgeColor;
  label: string;
  pulse?: boolean;
}

const COLOR_MAP: Record<BadgeColor, { badge: string; dot: string }> = {
  green: {
    badge: 'bg-emerald-50 text-emerald-800 border-emerald-300',
    dot: 'bg-emerald-500',
  },
  yellow: {
    badge: 'bg-amber-50 text-amber-800 border-amber-300',
    dot: 'bg-amber-500',
  },
  red: {
    badge: 'bg-rose-50 text-rose-800 border-rose-300',
    dot: 'bg-rose-600',
  },
  blue: {
    badge: 'bg-blue-50 text-blue-800 border-blue-300',
    dot: 'bg-blue-600',
  },
  neutral: {
    badge: 'bg-slate-100 text-slate-700 border-slate-300',
    dot: 'bg-slate-500',
  },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  color,
  label,
  pulse = false,
}) => {
  const styles = COLOR_MAP[color];

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${styles.badge}`}
    >
      <span
        className={`h-2 w-2 rounded-full ${styles.dot} ${pulse ? 'animate-pulse' : ''}`}
      />
      <span>{label}</span>
    </span>
  );
};


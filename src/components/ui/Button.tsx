import type { ReactNode, ButtonHTMLAttributes } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'gold';
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-[#F84464] text-white hover:bg-[#E03B5A] shadow-lg shadow-[#F84464]/25 hover:shadow-[#F84464]/40 border border-[#F84464]/30 focus-visible:ring-[#F84464]/50 disabled:opacity-50 disabled:shadow-none',
  secondary:
    'bg-[#161926] text-slate-100 hover:bg-[#1E2235] border border-white/10 hover:border-white/20 focus-visible:ring-slate-400/50 disabled:opacity-50',
  outline:
    'bg-transparent text-slate-200 border border-white/20 hover:border-[#F84464] hover:text-[#F84464] hover:bg-[#F84464]/5 focus-visible:ring-[#F84464]/50 disabled:opacity-50',
  ghost:
    'bg-transparent text-slate-300 hover:text-white hover:bg-white/5 focus-visible:ring-white/20 disabled:opacity-50',
  danger:
    'bg-rose-600 text-white hover:bg-rose-700 shadow-lg shadow-rose-600/25 focus-visible:ring-rose-500/50 disabled:opacity-50',
  gold:
    'bg-amber-500 text-slate-950 font-bold hover:bg-amber-400 shadow-lg shadow-amber-500/20 focus-visible:ring-amber-400/50 disabled:opacity-50',
};

const sizeClasses: Record<ButtonSize, string> = {
  xs: 'h-7 px-2.5 text-[11px] gap-1 rounded-lg font-medium',
  sm: 'h-8 px-3.5 text-xs gap-1.5 rounded-xl font-medium',
  md: 'h-10 px-5 text-sm gap-2 rounded-xl font-semibold',
  lg: 'h-12 px-7 text-base gap-2.5 rounded-xl font-bold tracking-wide',
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  leftIcon,
  rightIcon,
  children,
  disabled,
  className = '',
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={[
        'inline-flex items-center justify-center transition-all duration-200 cursor-pointer select-none active:scale-[0.98]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#08090D]',
        variantClasses[variant],
        sizeClasses[size],
        className,
      ].join(' ')}
      {...props}
    >
      {loading ? (
        <span
          className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0"
          aria-hidden="true"
        />
      ) : (
        leftIcon && <span className="shrink-0">{leftIcon}</span>
      )}
      <span>{children}</span>
      {!loading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
    </button>
  );
}

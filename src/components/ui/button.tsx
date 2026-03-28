'use client';

import type { ButtonHTMLAttributes, ReactNode } from 'react';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: 'default' | 'outline';
};

export function Button({ children, className = '', variant = 'default', type = 'button', ...props }: ButtonProps) {
  const baseClassName =
    'inline-flex items-center justify-center rounded-xl px-6 font-semibold transition disabled:cursor-not-allowed disabled:opacity-60';
  const variantClassName =
    variant === 'outline'
      ? 'border border-zinc-700 bg-transparent text-white hover:border-zinc-500 hover:bg-zinc-900'
      : 'bg-[#1DA1F2] text-black hover:bg-[#1A8CD8]';

  return (
    <button
      type={type}
      className={`${baseClassName} ${variantClassName} ${className}`.trim()}
      {...props}
    >
      {children}
    </button>
  );
}
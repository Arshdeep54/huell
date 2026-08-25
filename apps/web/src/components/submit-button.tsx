"use client";

import { useFormStatus } from "react-dom";
import type { CSSProperties, ReactNode } from "react";

export function SubmitButton({
  children,
  pendingLabel,
  disabled,
  className,
  style,
}: {
  children: ReactNode;
  pendingLabel: string;
  disabled?: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  const { pending } = useFormStatus();
  const isDisabled = disabled || pending;

  return (
    <button
      type="submit"
      disabled={isDisabled}
      className={className}
      style={{ ...style, opacity: isDisabled ? 0.5 : (style?.opacity ?? 1) }}
    >
      {pending ? pendingLabel : children}
    </button>
  );
}

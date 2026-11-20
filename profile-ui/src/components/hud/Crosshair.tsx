import { clsx } from "clsx";

export interface CrosshairProps {
  className?: string;
}

/** Crisp 14x14px '+' registration crosshair primitive for FUI HUD axes. */
export default function Crosshair({ className }: CrosshairProps) {
  return (
    <svg
      width={14}
      height={14}
      viewBox="0 0 14 14"
      fill="none"
      aria-hidden="true"
      className={clsx("fui-crosshair", className)}
    >
      <path
        d="M7 1V13M1 7H13"
        stroke="currentColor"
        strokeWidth={1}
        strokeLinecap="square"
      />
    </svg>
  );
}

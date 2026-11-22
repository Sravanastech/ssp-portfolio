import { clsx } from "clsx";

export interface ScanlineProps {
  className?: string;
}

/** Lightweight inline SVG telemetry waveform / subtle scanline accent. */
export default function Scanline({ className }: ScanlineProps) {
  return (
    <svg
      width={48}
      height={12}
      viewBox="0 0 48 12"
      fill="none"
      aria-hidden="true"
      className={clsx("fui-scanline", className)}
    >
      <path
        d="M0 6H12L15 2L19 10L23 1L27 9L30 6H48"
        stroke="currentColor"
        strokeWidth={1}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

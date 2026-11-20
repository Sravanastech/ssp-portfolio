import { clsx } from "clsx";

export type CornerPosition = "tl" | "tr" | "bl" | "br";

export interface CornerBracketProps {
  position: CornerPosition;
  className?: string;
}

const CORNER_PATHS: Record<CornerPosition, string> = {
  tl: "M0.5 11.5V0.5H11.5",
  tr: "M0.5 0.5H11.5V11.5",
  bl: "M0.5 0.5V11.5H11.5",
  br: "M11.5 0.5V11.5H0.5",
};

/** Crisp 12x12px L-bracket registration primitive for FUI HUD corners. */
export default function CornerBracket({
  position,
  className,
}: CornerBracketProps) {
  return (
    <svg
      width={12}
      height={12}
      viewBox="0 0 12 12"
      fill="none"
      aria-hidden="true"
      data-position={position}
      className={clsx(
        "fui-corner-bracket",
        `fui-corner-bracket--${position}`,
        className,
      )}
    >
      <path
        d={CORNER_PATHS[position]}
        stroke="currentColor"
        strokeWidth={1}
        strokeLinecap="square"
      />
    </svg>
  );
}

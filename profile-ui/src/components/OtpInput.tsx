import { useCallback, useEffect, useRef, useState } from "react";

const LENGTH = 6;
const EMPTY = Array<string>(LENGTH).fill("");

type Props = {
  legend: string;
  onComplete: (code: string) => void;
  disabled?: boolean;
  invalid?: boolean;
  describedBy?: string;
  /** Change to clear the boxes and refocus the first one. */
  resetKey?: number;
  autoFocus?: boolean;
  /** Refocus the first box after a reset (default). Turn off to leave focus on an error summary. */
  focusOnReset?: boolean;
};

export default function OtpInput({
  legend,
  onComplete,
  disabled = false,
  invalid = false,
  describedBy,
  resetKey = 0,
  autoFocus = false,
  focusOnReset = true,
}: Props) {
  const [digits, setDigits] = useState<string[]>(EMPTY);
  const state = useRef<string[]>(EMPTY);
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const completeRef = useRef(onComplete);
  useEffect(() => {
    completeRef.current = onComplete;
  });

  const focusAt = (i: number) => {
    const target = refs.current[Math.max(0, Math.min(LENGTH - 1, i))];
    target?.focus();
    target?.select();
  };

  const commit = useCallback((next: string[], focus: number) => {
    state.current = next;
    setDigits(next);
    focusAt(focus);
    if (next.every(Boolean)) completeRef.current(next.join(""));
  }, []);

  const fill = (start: number, text: string) => {
    const incoming = text.replace(/\D/g, "").slice(0, LENGTH - start);
    if (!incoming) return;
    const next = [...state.current];
    incoming.split("").forEach((d, k) => {
      next[start + k] = d;
    });
    commit(next, Math.min(start + incoming.length, LENGTH - 1));
  };

  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      if (autoFocus) focusAt(0);
      return;
    }
    state.current = EMPTY;
    setDigits(EMPTY);
    if (focusOnReset) focusAt(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);

  const onChange = (i: number, raw: string) => {
    const clean = raw.replace(/\D/g, "");
    if (raw === "") {
      const next = [...state.current];
      next[i] = "";
      commit(next, i);
      return;
    }
    if (!clean) return;
    if (clean.length > 1) return fill(i === 0 ? 0 : i, clean);
    const next = [...state.current];
    next[i] = clean;
    commit(next, i + 1);
  };

  const onKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    switch (e.key) {
      case "Backspace": {
        e.preventDefault();
        const next = [...state.current];
        if (next[i]) {
          next[i] = "";
          commit(next, i);
        } else if (i > 0) {
          next[i - 1] = "";
          commit(next, i - 1);
        }
        break;
      }
      case "ArrowLeft":
        e.preventDefault();
        focusAt(i - 1);
        break;
      case "ArrowRight":
        e.preventDefault();
        focusAt(i + 1);
        break;
      case "Home":
        e.preventDefault();
        focusAt(0);
        break;
      case "End":
        e.preventDefault();
        focusAt(LENGTH - 1);
        break;
    }
  };

  return (
    <fieldset className="otp-group" disabled={disabled}>
      <legend className="field-label otp-legend">{legend}</legend>
      <div className="otp-boxes">
        {digits.map((value, i) => (
          <input
            key={i}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="text"
            name={i === 0 ? "code" : undefined}
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={i === 0 ? LENGTH : 1}
            autoComplete={i === 0 ? "one-time-code" : "off"}
            aria-label={`Digit ${i + 1} of ${LENGTH}`}
            aria-invalid={invalid || undefined}
            aria-describedby={describedBy}
            className="otp-box"
            value={value}
            disabled={disabled}
            onChange={(e) => onChange(i, e.target.value)}
            onKeyDown={(e) => onKeyDown(i, e)}
            onPaste={(e) => {
              e.preventDefault();
              fill(i === 0 ? 0 : i, e.clipboardData.getData("text"));
            }}
            onFocus={(e) => e.currentTarget.select()}
          />
        ))}
      </div>
    </fieldset>
  );
}

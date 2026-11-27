import { useEffect, useRef } from "react";
import { fillTemplate, dataOf } from "./model";
import type { StudioModel } from "./useStudio";

/** Focusable list of every field error; each entry jumps to its field. */
export default function ErrorSummary({
  studio,
  onPick,
}: {
  studio: StudioModel;
  onPick: (key: string, path: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const entries = Object.entries(studio.errors).flatMap(([key, fields]) =>
    Object.entries(fields).map(([path, message]) => ({ key, path, message })),
  );
  const sig = entries.map((e) => `${e.key}${e.path}`).join();
  const show = studio.notice?.kind === "error" && entries.length > 0;
  useEffect(() => {
    if (show) ref.current?.focus();
  }, [show, sig]);
  if (!entries.length || !show) return null;
  return (
    <div
      ref={ref}
      tabIndex={-1}
      role="alert"
      className="page-notice page-notice--error studio-errors"
    >
      <p>
        <strong>
          {entries.length} {entries.length === 1 ? "problem" : "problems"} to
          fix before saving
        </strong>
      </p>
      <ul>
        {entries.map((e) => {
          const type =
            studio.blocks.find((b) => b.id === e.key)?.type ??
            studio.edits.newBlocks[e.key]?.type ??
            "";
          const schema = studio.schemaOf(type);
          const title =
            fillTemplate(
              schema?.["x-studio"].itemTitle,
              dataOf(studio.blocks, studio.edits, e.key),
            ) ||
            schema?.["x-studio"].section ||
            "Item";
          return (
            <li key={`${e.key}-${e.path}`}>
              <button
                type="button"
                className="studio-link"
                onClick={() => onPick(e.key, e.path)}
              >
                {title}: {e.message}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

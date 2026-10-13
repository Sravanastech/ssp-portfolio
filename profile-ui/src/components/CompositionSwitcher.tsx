import { Check } from "lucide-react";
import { useContext, useId } from "react";
import { CompositionContext } from "@/theme/CompositionContext";
const choices = [
  { id: "a", label: "Bold" },
  { id: "b", label: "Bright" },
  { id: "c", label: "Spatial" },
] as const;
export default function CompositionSwitcher() {
  const groupId = useId();
  const { composition, select } = useContext(CompositionContext);
  return (
    <fieldset className="composition-switcher" data-selected={composition}>
      <legend className="sr-only">Portfolio composition</legend>
      {choices.map(({ id, label }) => (
        <label key={id} title={`${id.toUpperCase()} · ${label} composition`}>
          <input
            type="radio"
            name={`portfolio-composition-${groupId}`}
            value={id}
            checked={composition === id}
            onChange={() => select(id)}
          />
          <span className="composition-choice">
            <b>{id.toUpperCase()}</b> {label}
            <Check size={14} className="choice-check" aria-hidden="true" />
          </span>
        </label>
      ))}
    </fieldset>
  );
}

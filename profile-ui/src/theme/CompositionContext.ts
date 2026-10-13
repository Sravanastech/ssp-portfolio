import { createContext } from "react";
export type Composition = "a" | "b" | "c";
export const CompositionContext = createContext<{
  composition: Composition;
  select: (value: Composition) => void;
}>({ composition: "a", select: () => {} });

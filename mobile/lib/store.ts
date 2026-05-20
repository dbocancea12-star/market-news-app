import { create } from "zustand";
import type { Source } from "./types";

type State = {
  forex: boolean;
  oil: boolean;
  earnings: boolean;
  mag7Only: boolean;
  highOnly: boolean;
  holidaysOnly: boolean;
  toggle: (key: keyof Omit<State, "toggle" | "activeSources">) => void;
  activeSources: () => Source[];
};

export const useFilters = create<State>((set, get) => ({
  forex: true,
  oil: true,
  earnings: true,
  mag7Only: false,
  highOnly: false,
  holidaysOnly: false,
  toggle: (key) => set((s) => ({ ...s, [key]: !s[key] })),
  activeSources: () => {
    const s = get();
    const arr: Source[] = [];
    if (s.forex) arr.push("forex");
    if (s.oil) arr.push("oil");
    if (s.earnings) arr.push("earnings");
    return arr;
  },
}));

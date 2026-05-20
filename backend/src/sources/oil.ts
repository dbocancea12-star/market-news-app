import type { Event } from "../types.js";

const OIL_PATTERN =
  /crude oil inventor|crude oil stocks change|opec|gasoline inventor|natural gas storage|baker hughes|distillate stocks|api weekly crude/i;

export const isOilEvent = (title: string): boolean => OIL_PATTERN.test(title);

export const tagOil = (e: Event): Event =>
  isOilEvent(e.title) ? { ...e, source: "oil" } : e;

export const UnitSystem = {
  SI: "SI",
  IP: "IP",
} as const;

export type UnitSystem = (typeof UnitSystem)[keyof typeof UnitSystem];

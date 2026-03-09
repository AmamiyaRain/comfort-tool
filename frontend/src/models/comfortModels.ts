export const ComfortModel = {
  Pmv: "PMV",
} as const;

export type ComfortModel = (typeof ComfortModel)[keyof typeof ComfortModel];

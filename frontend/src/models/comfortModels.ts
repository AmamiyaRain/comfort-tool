export const ComfortModel = {
  Pmv: "PMV",
  Utci: "UTCI",
} as const;

export type ComfortModel = (typeof ComfortModel)[keyof typeof ComfortModel];

export const comfortModelOrder: ComfortModel[] = [ComfortModel.Pmv, ComfortModel.Utci];

export const comfortModelMetaById: Record<
  ComfortModel,
  {
    label: string;
    description: string;
  }
> = {
  [ComfortModel.Pmv]: {
    label: "PMV",
    description: "ASHRAE 55 PMV/PPD with comfort zone overlays.",
  },
  [ComfortModel.Utci]: {
    label: "UTCI",
    description: "Outdoor UTCI with stress category visualization.",
  },
};

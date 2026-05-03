export const ComfortModel = {
  Pmv: "PMV",
  Utci: "UTCI",
  AdaptiveAshrae: "ADAPTIVE_ASHRAE",
  AdaptiveEn: "ADAPTIVE_EN",
  HeatIndex: "HEAT_INDEX",
} as const;

export type ComfortModel = (typeof ComfortModel)[keyof typeof ComfortModel];
// The order in which the comfort models are displayed in the dropdown.
export const comfortModelOrder: ComfortModel[] = [ComfortModel.Pmv, ComfortModel.Utci, ComfortModel.AdaptiveAshrae, ComfortModel.AdaptiveEn, ComfortModel.HeatIndex];

export const comfortModelMetaById: Record<
  ComfortModel,
  {
    label: string;
    description: string;
  }
> = {
  [ComfortModel.Pmv]: {
    label: "PMV (ASHRAE-55)",
    description: "ASHRAE 55 PMV/PPD with comfort zone overlays.",
  },
  [ComfortModel.Utci]: {
    label: "UTCI",
    description: "Outdoor UTCI with stress category visualization.",
  },
  [ComfortModel.AdaptiveAshrae]: {
    label: "Adaptive (ASHRAE-55)",
    description: "ASHRAE 55 Adaptive thermal comfort model for naturally ventilated buildings.",
  },
  [ComfortModel.AdaptiveEn]: {
    label: "Adaptive (EN 16798-1)",
    description: "EN 16798-1 Adaptive thermal comfort model for naturally ventilated buildings.",
  },
  [ComfortModel.HeatIndex]: {
    label: "Thermal Indices",
    description: "Various heat and cold indices used to calculate the apparent temperature of the thermal environment.",
  },
};

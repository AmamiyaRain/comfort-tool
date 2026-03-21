export const CalculationSource = {
  JsThermalComfort: "jsthermalcomfort",
  FrontendGenerated: "frontend-generated",
} as const;

export type CalculationSource = (typeof CalculationSource)[keyof typeof CalculationSource];

export const ComfortStandard = {
  Ashrae55PmvPpd: "ASHRAE 55 (PMV/PPD)",
} as const;

export type ComfortStandard = (typeof ComfortStandard)[keyof typeof ComfortStandard];

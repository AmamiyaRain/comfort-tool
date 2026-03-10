import { FieldKey, type FieldKey as FieldKeyType } from "./fieldKeys";

export const CompareCaseId = {
  A: "A",
  B: "B",
  C: "C",
} as const;

export type CompareCaseId = (typeof CompareCaseId)[keyof typeof CompareCaseId];

export const compareCaseOrder: CompareCaseId[] = [CompareCaseId.A, CompareCaseId.B, CompareCaseId.C];

export type CompareCaseDefaults = Record<FieldKeyType, number>;

export const compareCaseDefaultsById: Record<CompareCaseId, CompareCaseDefaults> = {
  [CompareCaseId.A]: {
    [FieldKey.DryBulbTemperature]: 26,
    [FieldKey.MeanRadiantTemperature]: 25,
    [FieldKey.RelativeAirSpeed]: 0.1,
    [FieldKey.WindSpeed]: 0.1,
    [FieldKey.RelativeHumidity]: 50,
    [FieldKey.MetabolicRate]: 1.0,
    [FieldKey.ClothingInsulation]: 0.51,
    [FieldKey.ExternalWork]: 0,
  },
  [CompareCaseId.B]: {
    [FieldKey.DryBulbTemperature]: 25,
    [FieldKey.MeanRadiantTemperature]: 25,
    [FieldKey.RelativeAirSpeed]: 0.1,
    [FieldKey.WindSpeed]: 0.1,
    [FieldKey.RelativeHumidity]: 50,
    [FieldKey.MetabolicRate]: 1.1,
    [FieldKey.ClothingInsulation]: 0.61,
    [FieldKey.ExternalWork]: 0,
  },
  [CompareCaseId.C]: {
    [FieldKey.DryBulbTemperature]: 23,
    [FieldKey.MeanRadiantTemperature]: 23,
    [FieldKey.RelativeAirSpeed]: 0.1,
    [FieldKey.WindSpeed]: 0.1,
    [FieldKey.RelativeHumidity]: 50,
    [FieldKey.MetabolicRate]: 1.2,
    [FieldKey.ClothingInsulation]: 0.71,
    [FieldKey.ExternalWork]: 0,
  },
};

export const compareCaseMetaById: Record<
  CompareCaseId,
  {
    label: string;
    shortLabel: string;
    accentClass: string;
    badgeColor: "green" | "yellow" | "blue";
  }
> = {
  [CompareCaseId.A]: {
    label: "Case A",
    shortLabel: "A",
    accentClass: "text-teal-700",
    badgeColor: "green",
  },
  [CompareCaseId.B]: {
    label: "Case B",
    shortLabel: "B",
    accentClass: "text-amber-700",
    badgeColor: "yellow",
  },
  [CompareCaseId.C]: {
    label: "Case C",
    shortLabel: "C",
    accentClass: "text-sky-700",
    badgeColor: "blue",
  },
};

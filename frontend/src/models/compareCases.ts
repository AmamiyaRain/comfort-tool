import { FieldKey, type FieldKey as FieldKeyType } from "./fieldKeys";

export const CompareCaseId = {
  A: "A",
  B: "B",
  C: "C",
} as const;

export type CompareCaseId = (typeof CompareCaseId)[keyof typeof CompareCaseId];

export const compareCaseOrder: CompareCaseId[] = [CompareCaseId.A, CompareCaseId.B, CompareCaseId.C];

export type CompareCaseDefaults = Record<FieldKeyType, number>;
export type CompareCaseTone = "red" | "green" | "blue";

export interface CompareCaseChartStyle {
  line: string;
  fill: string;
  marker: string;
}

export interface CompareCaseUiStyle {
  inputToggleVisibleClass: string;
  inputToggleHiddenClass: string;
  clothingTargetActiveClass: string;
  clothingTargetInactiveClass: string;
  resultCellClass: string;
  resultActiveRingClass: string;
}

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
    tone: CompareCaseTone;
    accentClass: string;
    chartStyle: CompareCaseChartStyle;
    ui: CompareCaseUiStyle;
  }
> = {
  [CompareCaseId.A]: {
    label: "Case A",
    shortLabel: "A",
    tone: "blue",
    accentClass: "text-blue-800",
    chartStyle: {
      line: "#1e40af",
      fill: "rgba(30, 64, 175, 0.12)",
      marker: "#1e40af",
    },
    ui: {
      inputToggleVisibleClass: "border-blue-700 text-blue-900",
      inputToggleHiddenClass: "border-blue-300 text-blue-700",
      clothingTargetActiveClass: "bg-blue-100 text-blue-900 ring-1 ring-inset ring-blue-300 shadow-sm shadow-blue-900/5",
      clothingTargetInactiveClass: "text-blue-800 hover:bg-blue-100/80",
      resultCellClass: "border-blue-100 bg-blue-50/70",
      resultActiveRingClass: "ring-1 ring-blue-200/80",
    },
  },
  [CompareCaseId.B]: {
    label: "Case B",
    shortLabel: "B",
    tone: "red",
    accentClass: "text-red-800",
    chartStyle: {
      line: "#991b1b",
      fill: "rgba(153, 27, 27, 0.12)",
      marker: "#991b1b",
    },
    ui: {
      inputToggleVisibleClass: "border-red-700 text-red-900",
      inputToggleHiddenClass: "border-red-300 text-red-700",
      clothingTargetActiveClass: "bg-red-100 text-red-900 ring-1 ring-inset ring-red-300 shadow-sm shadow-red-900/5",
      clothingTargetInactiveClass: "text-red-800 hover:bg-red-100/80",
      resultCellClass: "border-red-100 bg-red-50/70",
      resultActiveRingClass: "ring-1 ring-red-200/80",
    },
  },
  [CompareCaseId.C]: {
    label: "Case C",
    shortLabel: "C",
    tone: "green",
    accentClass: "text-emerald-800",
    chartStyle: {
      line: "#047857",
      fill: "rgba(4, 120, 87, 0.14)",
      marker: "#047857",
    },
    ui: {
      inputToggleVisibleClass: "border-emerald-700 text-emerald-900",
      inputToggleHiddenClass: "border-emerald-300 text-emerald-700",
      clothingTargetActiveClass: "bg-emerald-100 text-emerald-900 ring-1 ring-inset ring-emerald-300 shadow-sm shadow-emerald-900/5",
      clothingTargetInactiveClass: "text-emerald-800 hover:bg-emerald-100/80",
      resultCellClass: "border-emerald-100 bg-emerald-50/70",
      resultActiveRingClass: "ring-1 ring-emerald-200/80",
    },
  },
};

export const compareCaseChartStyleById: Record<CompareCaseId, CompareCaseChartStyle> = compareCaseOrder.reduce(
  (accumulator, caseId) => {
    accumulator[caseId] = compareCaseMetaById[caseId].chartStyle;
    return accumulator;
  },
  {} as Record<CompareCaseId, CompareCaseChartStyle>,
);

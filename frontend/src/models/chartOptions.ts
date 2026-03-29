import { ComfortModel, type ComfortModel as ComfortModelType } from "./comfortModels";

export const ChartId = {
  Psychrometric: "psychrometric",
  RelativeHumidity: "relativeHumidity",
  Stress: "stress",
  AirTemperature: "airTemperature",
} as const;

export type ChartId = (typeof ChartId)[keyof typeof ChartId];

export const chartMetaById: Record<
  ChartId,
  {
    model: ComfortModelType;
    name: string;
    emptyMessage: string;
    heightClass: string;
  }
> = {
  [ChartId.Psychrometric]: {
    model: ComfortModel.Pmv,
    name: "Psychrometric Chart",
    emptyMessage: "No psychrometric chart yet.",
    heightClass: "h-[420px] xl:h-[420px]",
  },
  [ChartId.RelativeHumidity]: {
    model: ComfortModel.Pmv,
    name: "Relative Humidity Chart",
    emptyMessage: "No relative humidity chart yet.",
    heightClass: "h-[420px] xl:h-[420px]",
  },
  [ChartId.Stress]: {
    model: ComfortModel.Utci,
    name: "UTCI Stress Chart",
    emptyMessage: "No UTCI stress visualization yet.",
    heightClass: "h-[360px] xl:h-[360px]",
  },
  [ChartId.AirTemperature]: {
    model: ComfortModel.Utci,
    name: "UTCI vs Air Temperature",
    emptyMessage: "No UTCI temperature comparison yet.",
    heightClass: "h-[380px] xl:h-[380px]",
  },
};

export const chartIdsByModel: Record<ComfortModelType, ChartId[]> = {
  [ComfortModel.Pmv]: [ChartId.Psychrometric, ChartId.RelativeHumidity],
  [ComfortModel.Utci]: [ChartId.Stress, ChartId.AirTemperature],
};

export const defaultChartByModel: Record<ComfortModelType, ChartId> = {
  [ComfortModel.Pmv]: ChartId.Psychrometric,
  [ComfortModel.Utci]: ChartId.Stress,
};

export const chartOptionsByModel: Record<ComfortModelType, Array<{ name: string; value: ChartId }>> = {
  [ComfortModel.Pmv]: chartIdsByModel[ComfortModel.Pmv].map((chartId) => ({
    name: chartMetaById[chartId].name,
    value: chartId,
  })),
  [ComfortModel.Utci]: chartIdsByModel[ComfortModel.Utci].map((chartId) => ({
    name: chartMetaById[chartId].name,
    value: chartId,
  })),
};

export const PmvChartId = {
  Psychrometric: ChartId.Psychrometric,
  RelativeHumidity: ChartId.RelativeHumidity,
} as const;

export type PmvChartId = (typeof PmvChartId)[keyof typeof PmvChartId];

export const UtciChartId = {
  Stress: ChartId.Stress,
  AirTemperature: ChartId.AirTemperature,
} as const;

export type UtciChartId = (typeof UtciChartId)[keyof typeof UtciChartId];

export const pmvChartOptions = chartOptionsByModel[ComfortModel.Pmv];
export const utciChartOptions = chartOptionsByModel[ComfortModel.Utci];

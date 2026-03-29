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
    name: string;
    emptyMessage: string;
    heightClass: string;
  }
> = {
  [ChartId.Psychrometric]: {
    name: "Psychrometric Chart",
    emptyMessage: "No psychrometric chart yet.",
    heightClass: "h-[420px] xl:h-[420px]",
  },
  [ChartId.RelativeHumidity]: {
    name: "Relative Humidity Chart",
    emptyMessage: "No relative humidity chart yet.",
    heightClass: "h-[420px] xl:h-[420px]",
  },
  [ChartId.Stress]: {
    name: "UTCI Stress Chart",
    emptyMessage: "No UTCI stress visualization yet.",
    heightClass: "h-[360px] xl:h-[360px]",
  },
  [ChartId.AirTemperature]: {
    name: "UTCI vs Air Temperature",
    emptyMessage: "No UTCI temperature comparison yet.",
    heightClass: "h-[380px] xl:h-[380px]",
  },
};

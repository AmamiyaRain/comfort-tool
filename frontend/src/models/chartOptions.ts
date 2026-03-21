export const PmvChartId = {
  Psychrometric: "psychrometric",
  RelativeHumidity: "relativeHumidity",
} as const;

export type PmvChartId = (typeof PmvChartId)[keyof typeof PmvChartId];

export const pmvChartOptions: Array<{ name: string; value: PmvChartId }> = [
  { name: "Psychrometric Chart", value: PmvChartId.Psychrometric },
  { name: "Relative Humidity Chart", value: PmvChartId.RelativeHumidity },
];

export const UtciChartId = {
  Stress: "stress",
  AirTemperature: "airTemperature",
} as const;

export type UtciChartId = (typeof UtciChartId)[keyof typeof UtciChartId];

export const utciChartOptions: Array<{ name: string; value: UtciChartId }> = [
  { name: "UTCI Stress Chart", value: UtciChartId.Stress },
  { name: "UTCI vs Air Temperature", value: UtciChartId.AirTemperature },
];

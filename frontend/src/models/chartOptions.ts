export const PmvChartId = {
  Psychrometric: "psychrometric",
  RelativeHumidity: "relativeHumidity",
} as const;

export type PmvChartId = (typeof PmvChartId)[keyof typeof PmvChartId];

export const pmvChartOptions: Array<{ name: string; value: PmvChartId }> = [
  { name: "Psychrometric Chart", value: PmvChartId.Psychrometric },
  { name: "Relative Humidity Chart", value: PmvChartId.RelativeHumidity },
];

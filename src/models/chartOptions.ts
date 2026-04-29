export const ChartId = {
  Psychrometric: "psychrometric",
  RelativeHumidity: "relativeHumidity",
  Stress: "stress",
  AirTemperature: "airTemperature",
  Adaptive: "adaptive",
  PmvDynamic: "pmvDynamic",
  UtciDynamic: "utciDynamic",
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
    heightClass: "h-[480px] xl:h-[480px]",
  },
  [ChartId.RelativeHumidity]: {
    name: "Relative Humidity Chart",
    emptyMessage: "No relative humidity chart yet.",
    heightClass: "h-[480px] xl:h-[480px]",
  },
  [ChartId.Stress]: {
    name: "UTCI Stress Chart",
    emptyMessage: "No UTCI stress visualization yet.",
    heightClass: "h-[480px] xl:h-[480px]",
  },
  [ChartId.AirTemperature]: {
    name: "UTCI vs Air Temperature",
    emptyMessage: "No UTCI temperature comparison yet.",
    heightClass: "h-[480px] xl:h-[480px]",
  },
  [ChartId.Adaptive]: {
    name: "Adaptive Chart",
    emptyMessage: "No adaptive chart yet.",
    heightClass: "h-[480px] xl:h-[480px]",
  },
  [ChartId.PmvDynamic]: {
    name: "Dynamic PMV Chart",
    emptyMessage: "No PMV dynamic chart yet.",
    heightClass: "h-[480px] xl:h-[480px]",
  },
  [ChartId.UtciDynamic]: {
    name: "Dynamic UTCI Chart",
    emptyMessage: "No UTCI dynamic chart yet.",
    heightClass: "h-[480px] xl:h-[480px]",
  },
};

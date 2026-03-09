export const FieldKey = {
  DryBulbTemperature: "tdb",
  MeanRadiantTemperature: "tr",
  RelativeAirSpeed: "vr",
  RelativeHumidity: "rh",
  MetabolicRate: "met",
  ClothingInsulation: "clo",
  ExternalWork: "wme",
} as const;

export type FieldKey = (typeof FieldKey)[keyof typeof FieldKey];

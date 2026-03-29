export const FieldKey = {
  DryBulbTemperature: "tdb",
  MeanRadiantTemperature: "tr",
  RelativeAirSpeed: "vr",
  WindSpeed: "v",
  RelativeHumidity: "rh",
  MetabolicRate: "met",
  ClothingInsulation: "clo",
  ExternalWork: "wme",
} as const;

export type FieldKey = (typeof FieldKey)[keyof typeof FieldKey];

export const DerivedFieldKey = {
  MeasuredAirSpeed: "measuredAirSpeed",
  DewPoint: "dewPoint",
  HumidityRatio: "humidityRatio",
  WetBulb: "wetBulb",
  VaporPressure: "vaporPressure",
} as const;

export type DerivedFieldKey = (typeof DerivedFieldKey)[keyof typeof DerivedFieldKey];

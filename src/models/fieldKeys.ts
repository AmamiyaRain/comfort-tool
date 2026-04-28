export const FieldKey = {
  DryBulbTemperature: "tdb",
  MeanRadiantTemperature: "tr",
  RelativeAirSpeed: "vr",
  WindSpeed: "v",
  RelativeHumidity: "rh",
  MetabolicRate: "met",
  ClothingInsulation: "clo",
  ExternalWork: "wme",
  PrevailingMeanOutdoorTemperature: "trm",
} as const;

export type FieldKey = (typeof FieldKey)[keyof typeof FieldKey];

export const DerivedInputId = {
  MeasuredAirSpeed: "airSpeed.measured",
  DewPoint: "humidity.dewPoint",
  HumidityRatio: "humidity.humidityRatio",
  WetBulb: "humidity.wetBulb",
  VaporPressure: "humidity.vaporPressure",
} as const;

export type DerivedInputId = (typeof DerivedInputId)[keyof typeof DerivedInputId];

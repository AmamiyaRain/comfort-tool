export const DerivedFieldKey = {
  MeasuredAirSpeed: "measuredAirSpeed",
  DewPoint: "dewPoint",
  HumidityRatio: "humidityRatio",
  WetBulb: "wetBulb",
  VaporPressure: "vaporPressure",
} as const;

export type DerivedFieldKey = (typeof DerivedFieldKey)[keyof typeof DerivedFieldKey];

/**
 * Shared input option identifiers and mode values.
 * These ids are stored inside serializable UI state, while canonical field values remain in SI elsewhere.
 */
export const TemperatureInputMode = {
  Air: "air",
  Operative: "operative",
} as const;

export type TemperatureInputMode = (typeof TemperatureInputMode)[keyof typeof TemperatureInputMode];

export const AirSpeedInputMode = {
  Relative: "relative",
  Measured: "measured",
} as const;

export type AirSpeedInputMode = (typeof AirSpeedInputMode)[keyof typeof AirSpeedInputMode];

export const AirSpeedControlMode = {
  NoLocalControl: "noLocalControl",
  WithLocalControl: "withLocalControl",
} as const;

export type AirSpeedControlMode = (typeof AirSpeedControlMode)[keyof typeof AirSpeedControlMode];

export const HumidityInputMode = {
  RelativeHumidity: "relativeHumidity",
  HumidityRatio: "humidityRatio",
  DewPoint: "dewPoint",
  WetBulb: "wetBulb",
  VaporPressure: "vaporPressure",
} as const;

export type HumidityInputMode = (typeof HumidityInputMode)[keyof typeof HumidityInputMode];

export const ModelOptionId = {
  TemperatureInputMode: "temperatureInputMode",
  AirSpeedControlMode: "airSpeedControlMode",
  AirSpeedInputMode: "airSpeedInputMode",
  HumidityInputMode: "humidityInputMode",
} as const;

export type ModelOptionId = (typeof ModelOptionId)[keyof typeof ModelOptionId];

export type ModelOptionsRecord = Partial<Record<ModelOptionId, string>>;

export type PmvModelOptions = {
  [ModelOptionId.TemperatureInputMode]: TemperatureInputMode;
  [ModelOptionId.AirSpeedControlMode]: AirSpeedControlMode;
  [ModelOptionId.AirSpeedInputMode]: AirSpeedInputMode;
  [ModelOptionId.HumidityInputMode]: HumidityInputMode;
};

export const defaultPmvOptions: PmvModelOptions = {
  [ModelOptionId.TemperatureInputMode]: TemperatureInputMode.Air,
  [ModelOptionId.AirSpeedControlMode]: AirSpeedControlMode.WithLocalControl,
  [ModelOptionId.AirSpeedInputMode]: AirSpeedInputMode.Relative,
  [ModelOptionId.HumidityInputMode]: HumidityInputMode.RelativeHumidity,
};

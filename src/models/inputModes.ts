/**
 * Shared option identifiers and mode values.
 * These ids are stored inside serializable UI state, while canonical field values remain in SI elsewhere.
 */
export const TemperatureMode = {
  Air: "air",
  Operative: "operative",
} as const;

export type TemperatureMode = (typeof TemperatureMode)[keyof typeof TemperatureMode];

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

export const OptionKey = {
  TemperatureMode: "temperature.mode",
  AirSpeedControlMode: "airSpeed.controlMode",
  AirSpeedInputMode: "airSpeed.inputMode",
  HumidityInputMode: "humidity.inputMode",
} as const;

export type OptionKey = (typeof OptionKey)[keyof typeof OptionKey];

export type ModelOptionsRecord = Partial<Record<OptionKey, string>>;

export type PmvModelOptions = {
  [OptionKey.TemperatureMode]: TemperatureMode;
  [OptionKey.AirSpeedControlMode]: AirSpeedControlMode;
  [OptionKey.AirSpeedInputMode]: AirSpeedInputMode;
  [OptionKey.HumidityInputMode]: HumidityInputMode;
};

export const defaultPmvOptions: PmvModelOptions = {
  [OptionKey.TemperatureMode]: TemperatureMode.Air,
  [OptionKey.AirSpeedControlMode]: AirSpeedControlMode.WithLocalControl,
  [OptionKey.AirSpeedInputMode]: AirSpeedInputMode.Relative,
  [OptionKey.HumidityInputMode]: HumidityInputMode.RelativeHumidity,
};

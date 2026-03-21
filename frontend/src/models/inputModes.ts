export const PmvTemperatureInputMode = {
  Air: "air",
  Operative: "operative",
} as const;

export type PmvTemperatureInputMode = (typeof PmvTemperatureInputMode)[keyof typeof PmvTemperatureInputMode];

export const PmvAirSpeedInputMode = {
  Relative: "relative",
  Measured: "measured",
} as const;

export type PmvAirSpeedInputMode = (typeof PmvAirSpeedInputMode)[keyof typeof PmvAirSpeedInputMode];

export const PmvAirSpeedControlMode = {
  NoLocalControl: "noLocalControl",
  WithLocalControl: "withLocalControl",
} as const;

export type PmvAirSpeedControlMode = (typeof PmvAirSpeedControlMode)[keyof typeof PmvAirSpeedControlMode];

export const PmvHumidityInputMode = {
  RelativeHumidity: "relativeHumidity",
  HumidityRatio: "humidityRatio",
  DewPoint: "dewPoint",
  WetBulb: "wetBulb",
  VaporPressure: "vaporPressure",
} as const;

export type PmvHumidityInputMode = (typeof PmvHumidityInputMode)[keyof typeof PmvHumidityInputMode];

import type {
  PmvAirSpeedControlMode,
  PmvAirSpeedInputMode,
  PmvHumidityInputMode,
  PmvTemperatureInputMode,
} from "./inputModes";

export const ModelOptionKey = {
  PmvTemperatureInputMode: "pmvTemperatureInputMode",
  PmvAirSpeedControlMode: "pmvAirSpeedControlMode",
  PmvAirSpeedInputMode: "pmvAirSpeedInputMode",
  PmvHumidityInputMode: "pmvHumidityInputMode",
} as const;

export type ModelOptionKey = (typeof ModelOptionKey)[keyof typeof ModelOptionKey];

export type PmvModelOptions = {
  [ModelOptionKey.PmvTemperatureInputMode]: PmvTemperatureInputMode;
  [ModelOptionKey.PmvAirSpeedControlMode]: PmvAirSpeedControlMode;
  [ModelOptionKey.PmvAirSpeedInputMode]: PmvAirSpeedInputMode;
  [ModelOptionKey.PmvHumidityInputMode]: PmvHumidityInputMode;
};

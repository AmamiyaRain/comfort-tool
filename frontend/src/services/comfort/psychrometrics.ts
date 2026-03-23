import { psy_ta_rh } from "jsthermalcomfort/lib/esm/psychrometrics/psy_ta_rh.js";

import { ATM_PRESSURE_PA, ensureFiniteValue } from "./helpers";

export function getHumidityRatioGkg(temperature: number, relativeHumidity: number): number {
  const result = psy_ta_rh(temperature, relativeHumidity, ATM_PRESSURE_PA);
  return ensureFiniteValue("Humidity ratio", result.hr) * 1000;
}

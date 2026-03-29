import { psy_ta_rh } from "jsthermalcomfort/lib/esm/psychrometrics/psy_ta_rh.js";

import { UnitSystem } from "../../models/units";
import { convertHumidityRatioFromSi } from "../units";
import { ATM_PRESSURE_PA, ensureFiniteValue } from "./helpers";

export function getHumidityRatioGkg(temperature: number, relativeHumidity: number): number {
  const result = psy_ta_rh(temperature, relativeHumidity, ATM_PRESSURE_PA);
  return convertHumidityRatioFromSi(
    ensureFiniteValue("Humidity ratio", result.hr),
    UnitSystem.SI,
  );
}

import { heat_index, humidex, wc } from "jsthermalcomfort";
import { CalculationSource } from "../../models/calculationMetadata";
import type { HeatIndexRequestDto, HeatIndexResponseDto } from "../../models/comfortDtos";
import { ensureFiniteValue } from "./helpers";
import { UnitSystem } from "../../models/units";

/**
 * Main entry point for Heat Index (HI) calculations.
 * Returns the Heat Index value.
 * @param payload The Heat Index request parameters.
 * @returns An object containing the Heat Index.
 */
export function calculateHeatIndex(payload: HeatIndexRequestDto): HeatIndexResponseDto {
  const result = heat_index(payload.tdb, payload.rh, { units: payload.units, round: true });
  const hi = result.hi;

  let category = "Safe";
  if (hi >= 51) {
    category = "Extreme Danger";
  } else if (hi >= 39) {
    category = "Danger";
  } else if (hi >= 32) {
    category = "Extreme Caution";
  } else if (hi >= 27) {
    category = "Caution";
  }

  // Humidex calculation (expects Celsius)
  const tdbSi = payload.units === UnitSystem.IP ? (payload.tdb - 32) * 5/9 : payload.tdb;
  const humidexResult = humidex(tdbSi, payload.rh, { round: true });

  // Wind Chill calculation (expects Celsius)
  let wci = undefined;
  let wciTemp = undefined;
  let wciZone = undefined;
  if (payload.v !== undefined) {
    const wcResult = wc(tdbSi, payload.v, { round: true });
    wci = wcResult.wci;
    
    // Wind Chill Temperature formula (expects Celsius and m/s)
    if (payload.v > 1.33 && tdbSi <= 10) {
      wciTemp = 13.12 + 0.6215 * tdbSi - 13.95 * Math.pow(payload.v, 0.16) + 0.486 * tdbSi * Math.pow(payload.v, 0.16);
    } else {
      wciTemp = tdbSi;
    }

    if (wci >= 2300) wciZone = "2 mins to frostbite";
    else if (wci >= 1600) wciZone = "10 mins to frostbite";
    else if (wci >= 1400) wciZone = "30 mins to frostbite";
    else wciZone = "Safe";
  }

  return {
    hi: ensureFiniteValue("Heat Index", hi),
    category,
    humidex: ensureFiniteValue("Humidex", humidexResult.humidex),
    humidexDiscomfort: humidexResult.discomfort,
    wci: wci !== undefined ? ensureFiniteValue("Wind Chill", wci) : undefined,
    wciTemp: wciTemp !== undefined ? ensureFiniteValue("Wind Chill Temp", wciTemp) : undefined,
    wciZone,
    source: CalculationSource.JsThermalComfort,
  };
}

import { FieldKey, type FieldKey as FieldKeyType } from "../../models/fieldKeys";
import { UnitSystem, type UnitSystem as UnitSystemType } from "../../models/units";

/**
 * Centralized unit conversion helpers.
 * Canonical shared state stays in SI; these helpers map values to and from the active UI unit system.
 */
export type DisplayQuantityMeta = {
  displayUnits: string;
  step: number;
  decimals: number;
};

const humidityRatioDisplayMetaByUnitSystem: Record<UnitSystemType, DisplayQuantityMeta> = {
  [UnitSystem.SI]: {
    displayUnits: "g/kg",
    step: 0.1,
    decimals: 1,
  },
  [UnitSystem.IP]: {
    displayUnits: "gr/lb",
    step: 1,
    decimals: 0,
  },
};

const vaporPressureDisplayMetaByUnitSystem: Record<UnitSystemType, DisplayQuantityMeta> = {
  [UnitSystem.SI]: {
    displayUnits: "kPa",
    step: 0.01,
    decimals: 2,
  },
  [UnitSystem.IP]: {
    displayUnits: "inHg",
    step: 0.01,
    decimals: 2,
  },
};

/**
 * Converts a canonical SI field value into its display unit equivalent for the active unit system.
 * @param key The field key identifying the quantity type.
 * @param value The value in SI.
 * @param unitSystem The target unit system (SI/IP).
 * @returns The converted value.
 */
export function convertFieldValueFromSi(
  key: FieldKeyType,
  value: number,
  unitSystem: UnitSystemType,
): number {
  if (unitSystem === UnitSystem.SI) {
    return value;
  }

  if (key === FieldKey.DryBulbTemperature || key === FieldKey.MeanRadiantTemperature) {
    return value * (9 / 5) + 32;
  }

  if (key === FieldKey.RelativeAirSpeed || key === FieldKey.WindSpeed) {
    return value / 0.3048;
  }

  return value;
}

/**
 * Converts a UI display value back into its canonical SI equivalent.
 * @param key The field key identifying the quantity type.
 * @param value The raw display value.
 * @param unitSystem The current UI unit system (SI/IP).
 * @returns The converted SI value.
 */
export function convertFieldValueToSi(
  key: FieldKeyType,
  value: number,
  unitSystem: UnitSystemType,
): number {
  if (unitSystem === UnitSystem.SI) {
    return value;
  }

  if (key === FieldKey.DryBulbTemperature || key === FieldKey.MeanRadiantTemperature) {
    return (value - 32) * (5 / 9);
  }

  if (key === FieldKey.RelativeAirSpeed || key === FieldKey.WindSpeed) {
    return value * 0.3048;
  }

  return value;
}

export function convertHumidityRatioFromSi(value: number, unitSystem: UnitSystemType): number {
  return unitSystem === UnitSystem.IP ? value * 7000 : value * 1000;
}

export function convertHumidityRatioToSi(value: number, unitSystem: UnitSystemType): number {
  return unitSystem === UnitSystem.IP ? value / 7000 : value / 1000;
}

export function convertVaporPressureFromSi(value: number, unitSystem: UnitSystemType): number {
  return unitSystem === UnitSystem.IP ? value / 3386.389 : value / 1000;
}

export function convertVaporPressureToSi(value: number, unitSystem: UnitSystemType): number {
  return unitSystem === UnitSystem.IP ? value * 3386.389 : value * 1000;
}

/**
 * Returns metadata (units, step, decimals) for a specific humidity ratio unit system.
 * @param unitSystem Current unit system.
 * @returns DisplayQuantityMeta object.
 */
export function getHumidityRatioDisplayMeta(unitSystem: UnitSystemType): DisplayQuantityMeta {
  return humidityRatioDisplayMetaByUnitSystem[unitSystem];
}

/**
 * Returns metadata for a specific vapor pressure unit system.
 * @param unitSystem Current unit system.
 * @returns DisplayQuantityMeta object.
 */
export function getVaporPressureDisplayMeta(unitSystem: UnitSystemType): DisplayQuantityMeta {
  return vaporPressureDisplayMetaByUnitSystem[unitSystem];
}

export function formatDisplayValue(value: number, decimals: number): string {
  return value.toFixed(decimals);
}

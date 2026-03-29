import { FieldKey, type FieldKey as FieldKeyType } from "../../models/fieldKeys";
import { UnitSystem, type UnitSystem as UnitSystemType } from "../../models/units";

/**
 * Centralized unit conversion helpers.
 * Canonical shared state stays in SI; these helpers map values to and from the active UI unit system.
 */
type DisplayQuantityMeta = {
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

export function getHumidityRatioDisplayMeta(unitSystem: UnitSystemType): DisplayQuantityMeta {
  return humidityRatioDisplayMetaByUnitSystem[unitSystem];
}

export function getVaporPressureDisplayMeta(unitSystem: UnitSystemType): DisplayQuantityMeta {
  return vaporPressureDisplayMetaByUnitSystem[unitSystem];
}

export function formatDisplayValue(value: number, decimals: number): string {
  return value.toFixed(decimals);
}

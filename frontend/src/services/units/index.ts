import { FieldKey, type FieldKey as FieldKeyType } from "../../models/fieldKeys";
import { UnitSystem, type UnitSystem as UnitSystemType } from "../../models/units";

export function convertSiToDisplay(key: FieldKeyType, value: number, unitSystem: UnitSystemType): number {
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

export function convertDisplayToSi(key: FieldKeyType, value: number, unitSystem: UnitSystemType): number {
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

export function convertHumidityRatioSiToDisplay(value: number, unitSystem: UnitSystemType): number {
  return unitSystem === UnitSystem.IP ? value * 7000 : value * 1000;
}

export function convertHumidityRatioDisplayToSi(value: number, unitSystem: UnitSystemType): number {
  return unitSystem === UnitSystem.IP ? value / 7000 : value / 1000;
}

export function convertVaporPressureSiToDisplay(value: number, unitSystem: UnitSystemType): number {
  return unitSystem === UnitSystem.IP ? value / 3386.389 : value / 1000;
}

export function convertVaporPressureDisplayToSi(value: number, unitSystem: UnitSystemType): number {
  return unitSystem === UnitSystem.IP ? value * 3386.389 : value * 1000;
}

export function formatDisplayValue(value: number, decimals: number): string {
  return value.toFixed(decimals);
}

/**
 * Unit tests for the Thermal Indices calculation service.
 * Validates Heat Index, Humidex, and Wind Chill calculations
 * across both SI and IP unit systems.
 */
import { describe, expect, it } from "vitest";
import { calculateThermalIndices } from "./thermalIndices";
import { UnitSystem } from "../../models/units";
import { convertFieldValueFromSi } from "../units";
import { FieldKey } from "../../models/fieldKeys";

describe("thermalIndices service", () => {
  it("calculates Heat Index correctly in SI", () => {
    // 35°C, 70% RH -> HI should be ~50°C (Danger)
    const result = calculateThermalIndices({
      tdb: 35,
      rh: 70,
      units: UnitSystem.SI,
    });
    
    expect(result.hi).toBeGreaterThan(45);
    expect(result.category).toBe("Danger");
  });

  it("calculates Heat Index correctly in IP (Fahrenheit)", () => {
    // 95°F, 70% RH -> HI should be ~122°F (Danger, not Extreme Danger)
    const result = calculateThermalIndices({
      tdb: 95,
      rh: 70,
      units: UnitSystem.IP,
    });
    
    const hiF = convertFieldValueFromSi(FieldKey.DryBulbTemperature, result.hi, UnitSystem.IP);
    expect(hiF).toBeGreaterThan(115);
    expect(hiF).toBeLessThan(125);
    expect(result.category).toBe("Danger"); // 122°F is ~50°C, which is Danger (< 51)
  });

  it("calculates Wind Chill correctly in IP (Fahrenheit)", () => {
    // 10°F, 10 ft/s wind
    // 10 ft/s = 3.048 m/s (~11 km/h)
    // 10°F = -12.2°C
    const result = calculateThermalIndices({
      tdb: 10,
      rh: 50,
      v: 10, // 10 ft/s
      units: UnitSystem.IP,
    });
    
    const wciTempF = convertFieldValueFromSi(FieldKey.DryBulbTemperature, result.wciTemp!, UnitSystem.IP);
    expect(wciTempF).toBeLessThan(10);
    expect(wciTempF).toBeGreaterThan(-10);
    expect(result.wciZone).toBe("Safe");
  });

  it("identifies Extreme Danger correctly in IP", () => {
    // 105°F, 75% RH -> HI should be > 130°F (Extreme Danger)
    const result = calculateThermalIndices({
      tdb: 105,
      rh: 75,
      units: UnitSystem.IP,
    });
    
    const hiF = convertFieldValueFromSi(FieldKey.DryBulbTemperature, result.hi, UnitSystem.IP);
    expect(hiF).toBeGreaterThan(130);
    expect(result.category).toBe("Extreme Danger");
  });
});

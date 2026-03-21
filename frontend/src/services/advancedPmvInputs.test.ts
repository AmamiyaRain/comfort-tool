import { describe, expect, it } from "vitest";

import {
  convertHumidityRatioDisplayToSi,
  convertHumidityRatioSiToDisplay,
  convertVaporPressureDisplayToSi,
  convertVaporPressureSiToDisplay,
  deriveDewPointFromRelativeHumidity,
  deriveHumidityRatioFromRelativeHumidity,
  deriveMeasuredAirSpeedFromRelative,
  deriveOperativeTemperature,
  deriveRelativeAirSpeedFromMeasured,
  deriveRelativeHumidityFromHumidityRatio,
  deriveRelativeHumidityFromDewPoint,
  deriveRelativeHumidityFromVaporPressure,
  deriveRelativeHumidityFromWetBulb,
  deriveVaporPressureFromRelativeHumidity,
  deriveWetBulbFromRelativeHumidity,
} from "./advancedPmvInputs";
import { UnitSystem } from "../models/units";

describe("advancedPmvInputs", () => {
  it("converts measured air speed to relative air speed", () => {
    expect(deriveRelativeAirSpeedFromMeasured(0.1, 1.2)).toBeCloseTo(0.16, 6);
  });

  it("derives measured air speed from relative air speed", () => {
    expect(deriveMeasuredAirSpeedFromRelative(0.16, 1.2)).toBeCloseTo(0.1, 6);
  });

  it("round-trips dew point and relative humidity", () => {
    const dewPoint = deriveDewPointFromRelativeHumidity(26, 50);
    const relativeHumidity = deriveRelativeHumidityFromDewPoint(26, dewPoint);

    expect(dewPoint).toBeCloseTo(14.7, 1);
    expect(relativeHumidity).toBeCloseTo(50, 1);
  });

  it("derives operative temperature using the ASHRAE method", () => {
    expect(deriveOperativeTemperature(26, 24, 0.1)).toBeCloseTo(25, 6);
  });

  it("round-trips humidity ratio and relative humidity", () => {
    const humidityRatio = deriveHumidityRatioFromRelativeHumidity(26, 50);
    expect(deriveRelativeHumidityFromHumidityRatio(26, humidityRatio)).toBeCloseTo(50, 1);
  });

  it("round-trips wet bulb and relative humidity", () => {
    const wetBulb = deriveWetBulbFromRelativeHumidity(26, 50);
    expect(deriveRelativeHumidityFromWetBulb(26, wetBulb)).toBeCloseTo(50, 1);
  });

  it("round-trips vapor pressure and relative humidity", () => {
    const vaporPressure = deriveVaporPressureFromRelativeHumidity(26, 50);
    expect(deriveRelativeHumidityFromVaporPressure(26, vaporPressure)).toBeCloseTo(50, 1);
  });

  it("converts humidity ratio display units", () => {
    expect(convertHumidityRatioSiToDisplay(0.01, UnitSystem.SI)).toBeCloseTo(10, 6);
    expect(convertHumidityRatioDisplayToSi(70, UnitSystem.IP)).toBeCloseTo(0.01, 4);
  });

  it("converts vapor pressure display units", () => {
    expect(convertVaporPressureSiToDisplay(1000, UnitSystem.SI)).toBeCloseTo(1, 6);
    expect(convertVaporPressureDisplayToSi(1, UnitSystem.SI)).toBeCloseTo(1000, 6);
  });
});

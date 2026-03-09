import { describe, expect, it } from "vitest";

import { FieldKey } from "../models/fieldKeys";
import { UnitSystem } from "../models/units";
import { convertDisplayToSi, convertSiToDisplay, formatDisplayValue } from "./unitConversion";

describe("unitConversion", () => {
  it("converts SI temperatures to IP display units", () => {
    expect(convertSiToDisplay(FieldKey.DryBulbTemperature, 25, UnitSystem.IP)).toBe(77);
  });

  it("converts IP temperatures back to SI canonical units", () => {
    expect(convertDisplayToSi(FieldKey.MeanRadiantTemperature, 77, UnitSystem.IP)).toBeCloseTo(25, 6);
  });

  it("preserves values for non-converted dimensions", () => {
    expect(convertSiToDisplay(FieldKey.RelativeHumidity, 50, UnitSystem.IP)).toBe(50);
  });

  it("formats numeric display values with the requested precision", () => {
    expect(formatDisplayValue(1.2345, 2)).toBe("1.23");
  });
});

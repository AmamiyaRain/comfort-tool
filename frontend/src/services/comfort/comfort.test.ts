import { describe, expect, it } from "vitest";

import { InputId } from "../../models/inputSlots";
import { UnitSystem } from "../../models/units";
import {
  buildComparePsychrometricChart,
  buildUtciTemperatureChart,
  calculateComfortZone,
  calculatePmv,
  calculateUtci,
} from "./index";

const pmvPayload = {
  tdb: 26,
  tr: 26,
  vr: 0.1,
  rh: 50,
  met: 1.2,
  clo: 0.5,
  wme: 0,
  units: UnitSystem.SI,
};

const comfortZonePayload = {
  ...pmvPayload,
  rhMin: 0,
  rhMax: 100,
  rhPoints: 31,
};

const utciPayload = {
  tdb: 30,
  tr: 32,
  v: 1.2,
  rh: 50,
  units: UnitSystem.SI,
};

describe("comfort services", () => {
  it("calculates PMV and comfort zone data", () => {
    const pmvResult = calculatePmv(pmvPayload);
    const comfortZone = calculateComfortZone(comfortZonePayload);

    expect(pmvResult.pmv).toBeTypeOf("number");
    expect(pmvResult.ppd).toBeGreaterThanOrEqual(0);
    expect(comfortZone.coolEdge.length).toBeGreaterThan(0);
    expect(comfortZone.warmEdge.length).toBeGreaterThan(0);
  });

  it("builds PMV and UTCI charts from typed requests", () => {
    const comfortZone = calculateComfortZone(comfortZonePayload);
    const psychrometricChart = buildComparePsychrometricChart(
      {
        inputs: {
          [InputId.Input1]: comfortZonePayload,
        },
        chartRange: {
          tdbMin: 10,
          tdbMax: 40,
          tdbPoints: 121,
          humidityRatioMin: 0,
          humidityRatioMax: 30,
        },
        rhCurves: [10, 20, 30, 40, 50, 60],
      },
      {
        [InputId.Input1]: comfortZone,
      },
    );

    const utciResult = calculateUtci(utciPayload);
    const utciChart = buildUtciTemperatureChart(
      {
        inputs: {
          [InputId.Input1]: utciPayload,
        },
      },
      {
        [InputId.Input1]: utciResult,
      },
    );

    expect(psychrometricChart.traces.length).toBeGreaterThan(1);
    expect(utciChart.traces).toHaveLength(1);
    expect(utciChart.annotations).toHaveLength(1);
  });
});

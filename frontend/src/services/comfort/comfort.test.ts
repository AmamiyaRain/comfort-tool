import { describe, expect, it, vi } from "vitest";

import { InputId } from "../../models/inputSlots";
import { UnitSystem } from "../../models/units";
import { buildComparePsychrometricChart } from "./charts/pmvCharts";
import { buildUtciTemperatureChart } from "./charts/utciCharts";
import { calculateComfortZone } from "./comfortZone";
import { predictClothingInsulationFromOutdoorTemperature } from "./inputDerivations";
import { calculatePmv } from "./pmv";
import { calculateUtci } from "./utci";

const pmvPayload = {
  tdb: 26,
  tr: 26,
  vr: 0.1,
  rh: 50,
  met: 1.2,
  clo: 0.5,
  wme: 0,
  occupantHasAirSpeedControl: true,
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

  it("applies the no-local-control constraint to PMV acceptability and comfort zones", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const constrainedPayload = {
        ...pmvPayload,
        tdb: 24,
        tr: 24,
        vr: 0.4,
        occupantHasAirSpeedControl: false,
      };

      const constrainedResult = calculatePmv(constrainedPayload);
      const constrainedComfortZone = calculateComfortZone({
        ...constrainedPayload,
        rhMin: 0,
        rhMax: 100,
        rhPoints: 31,
      });

      expect(constrainedResult.acceptable80).toBe(false);
      expect(constrainedComfortZone.coolEdge.length).toBeLessThan(31);
    } finally {
      warnSpy.mockRestore();
    }
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

  it("normalizes clothing prediction results from jsthermalcomfort", () => {
    const predictedClothing = predictClothingInsulationFromOutdoorTemperature(10, UnitSystem.SI);

    expect(predictedClothing).toBeTypeOf("number");
    expect(predictedClothing).toBeGreaterThan(0);
  });
});

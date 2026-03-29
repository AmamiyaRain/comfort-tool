import { describe, expect, it } from "vitest";

import { CompareCaseId } from "../../models/compareCases";
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
  rh_min: 0,
  rh_max: 100,
  rh_points: 31,
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
    expect(comfortZone.cool_edge.length).toBeGreaterThan(0);
    expect(comfortZone.warm_edge.length).toBeGreaterThan(0);
  });

  it("builds PMV and UTCI charts from typed requests", () => {
    const comfortZone = calculateComfortZone(comfortZonePayload);
    const psychrometricChart = buildComparePsychrometricChart(
      {
        case_a: comfortZonePayload,
        case_b: null,
        case_c: null,
        chart_range: {
          tdb_min: 10,
          tdb_max: 40,
          tdb_points: 121,
          humidity_ratio_min: 0,
          humidity_ratio_max: 30,
        },
        rh_curves: [10, 20, 30, 40, 50, 60],
      },
      {
        [CompareCaseId.A]: comfortZone,
      },
    );

    const utciResult = calculateUtci(utciPayload);
    const utciChart = buildUtciTemperatureChart(
      {
        case_a: utciPayload,
        case_b: null,
        case_c: null,
      },
      {
        [CompareCaseId.A]: utciResult,
      },
    );

    expect(psychrometricChart.traces.length).toBeGreaterThan(1);
    expect(utciChart.traces).toHaveLength(1);
    expect(utciChart.annotations).toHaveLength(1);
  });
});

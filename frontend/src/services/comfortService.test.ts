import { describe, expect, it } from "vitest";

import { CompareCaseId } from "../models/compareCases";
import { CalculationSource } from "../models/calculationMetadata";
import { UnitSystem } from "../models/units";
import { UtciStressCategory } from "../models/utciStress";
import {
  buildComparePsychrometricChart,
  buildRelativeHumidityChart,
  buildUtciStressChart,
  buildUtciTemperatureChart,
  calculateComfortZone,
  calculatePmv,
  calculateUtci,
} from "./comfortService";

describe("comfortService", () => {
  it("calculates PMV locally with jsthermalcomfort", () => {
    const result = calculatePmv({
      tdb: 25,
      tr: 25,
      vr: 0.1,
      rh: 50,
      met: 1.2,
      clo: 0.5,
      wme: 0,
      units: UnitSystem.SI,
    });

    expect(result.source).toBe(CalculationSource.JsThermalComfort);
    expect(result.pmv).toBeCloseTo(0.08, 2);
    expect(result.ppd).toBeCloseTo(5.1, 1);
    expect(result.acceptable_80).toBe(true);
  });

  it("solves PMV comfort-zone edges in order", () => {
    const zone = calculateComfortZone({
      tdb: 25,
      tr: 25,
      vr: 0.1,
      rh: 50,
      met: 1.2,
      clo: 0.5,
      wme: 0,
      units: UnitSystem.SI,
      rh_min: 0,
      rh_max: 100,
      rh_points: 7,
    });

    expect(zone.source).toBe(CalculationSource.FrontendGenerated);
    expect(zone.cool_edge.length).toBe(zone.warm_edge.length);
    expect(zone.cool_edge.length).toBeGreaterThan(0);
    expect(zone.cool_edge[0].rh).toBeLessThan(zone.cool_edge.at(-1)?.rh ?? 0);
    expect(zone.cool_edge[0].tdb).toBeLessThan(zone.warm_edge[0].tdb);
  });

  it("uses raw PMV values when solving comfort-zone boundaries", () => {
    const zone = calculateComfortZone({
      tdb: 25,
      tr: 25,
      vr: 0.1,
      rh: 50,
      met: 1.2,
      clo: 0.5,
      wme: 0,
      units: UnitSystem.SI,
      rh_min: 0,
      rh_max: 100,
      rh_points: 31,
    });

    expect(zone.warm_edge[4]?.rh).toBeCloseTo(13.3333333333, 6);
    expect(zone.warm_edge[4]?.tdb).toBeCloseTo(29.76806640625, 6);
    expect(zone.warm_edge[10]?.tdb).toBeCloseTo(28.544921875, 6);
    expect(zone.warm_edge[24]?.tdb).toBeCloseTo(26.201171875, 6);
  });

  it("builds a psychrometric chart with RH curves and case overlays", () => {
    const chart = buildComparePsychrometricChart({
      case_a: {
        tdb: 26,
        tr: 25,
        vr: 0.1,
        rh: 50,
        met: 1.0,
        clo: 0.51,
        wme: 0,
        units: UnitSystem.SI,
        rh_min: 0,
        rh_max: 100,
        rh_points: 7,
      },
      case_b: {
        tdb: 25,
        tr: 25,
        vr: 0.1,
        rh: 50,
        met: 1.1,
        clo: 0.61,
        wme: 0,
        units: UnitSystem.SI,
        rh_min: 0,
        rh_max: 100,
        rh_points: 7,
      },
      case_c: null,
      chart_range: {
        tdb_min: 10,
        tdb_max: 40,
        tdb_points: 61,
        humidity_ratio_min: 0,
        humidity_ratio_max: 30,
      },
      rh_curves: [10, 50, 90],
    });

    expect(chart.source).toBe(CalculationSource.FrontendGenerated);
    expect(chart.traces.some((trace) => trace.name === "RH 50%")).toBe(true);
    expect(chart.traces.some((trace) => trace.name === "Case A comfort zone")).toBe(true);
    expect(chart.traces.some((trace) => trace.name === "Case B")).toBe(true);
    expect(chart.layout.title).toBe("Psychrometric chart");
  });

  it("builds a relative-humidity chart with annotations", () => {
    const chart = buildRelativeHumidityChart({
      case_a: {
        tdb: 26,
        tr: 25,
        vr: 0.1,
        rh: 50,
        met: 1.0,
        clo: 0.51,
        wme: 0,
        units: UnitSystem.SI,
        rh_min: 0,
        rh_max: 100,
        rh_points: 7,
      },
      case_b: null,
      case_c: null,
      chart_range: {
        tdb_min: 10,
        tdb_max: 40,
        tdb_points: 61,
        humidity_ratio_min: 0,
        humidity_ratio_max: 30,
      },
      rh_curves: [10, 50, 90],
    });

    expect(chart.traces.some((trace) => trace.name === "Case A RH comfort zone")).toBe(true);
    expect(chart.annotations[0]?.text).toBe(CompareCaseId.A);
    expect(chart.layout.yaxis).toMatchObject({ title: "Relative humidity (%)" });
  });

  it("calculates UTCI locally and builds the UTCI stress chart", () => {
    const utciResult = calculateUtci({
      tdb: 25,
      tr: 25,
      v: 1,
      rh: 50,
      units: UnitSystem.SI,
    });

    expect(utciResult.source).toBe(CalculationSource.JsThermalComfort);
    expect(utciResult.utci).toBeCloseTo(24.6, 1);
    expect(utciResult.stress_category).toBe(UtciStressCategory.NoThermalStress);

    const chart = buildUtciStressChart({
      case_a: {
        tdb: 25,
        tr: 25,
        v: 1,
        rh: 50,
        units: UnitSystem.SI,
      },
      case_b: {
        tdb: 30,
        tr: 32,
        v: 1,
        rh: 60,
        units: UnitSystem.SI,
      },
      case_c: null,
    });

    expect(chart.source).toBe(CalculationSource.FrontendGenerated);
    expect(chart.traces.some((trace) => trace.name === "Case A")).toBe(true);
    expect(chart.layout.shapes).toHaveLength(10);
    expect(chart.annotations.some((annotation) => annotation.text.includes("No<br>stress"))).toBe(true);
  });

  it("builds a UTCI air-temperature comparison chart", () => {
    const chart = buildUtciTemperatureChart({
      case_a: {
        tdb: 25,
        tr: 25,
        v: 1,
        rh: 50,
        units: UnitSystem.SI,
      },
      case_b: {
        tdb: 34,
        tr: 40,
        v: 0.7,
        rh: 60,
        units: UnitSystem.SI,
      },
      case_c: null,
    });

    expect(chart.source).toBe(CalculationSource.FrontendGenerated);
    expect(chart.layout.title).toBe("UTCI vs air temperature");
    expect(chart.traces).toHaveLength(2);
    expect(chart.annotations.some((annotation) => annotation.text.includes("Case A"))).toBe(true);
    expect(chart.layout.shapes?.some((shape) => shape.type === "line")).toBe(true);
  });
});

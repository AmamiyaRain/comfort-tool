import { describe, expect, it } from "vitest";

import { AdaptiveStandardMode } from "../../../models/inputModes";
import { FieldKey } from "../../../models/fieldKeys";
import { InputId } from "../../../models/inputSlots";
import { UnitSystem } from "../../../models/units";
import { calculateAdaptive } from "../adaptive";
import { buildAdaptiveChart, buildAdaptiveDynamicChart } from "./adaptiveCharts";

const ashraePayload = {
  tdb: 24,
  tr: 24,
  trm: 20.16,
  v: 0.1,
  units: UnitSystem.SI,
};

function getBoundaryPoint(chart, traceName: string, targetTrm: number, side: "lower" | "upper") {
  const trace = chart.traces.find((candidate) => candidate.name.includes(traceName));
  expect(trace).toBeDefined();

  const lowerPointCount = Math.floor(trace!.x.length / 2);
  const xValues = side === "lower"
    ? trace!.x.slice(0, lowerPointCount)
    : trace!.x.slice(lowerPointCount);
  const yValues = side === "lower"
    ? trace!.y.slice(0, lowerPointCount)
    : trace!.y.slice(lowerPointCount);
  const closestIndex = xValues.reduce((bestIndex, x, index) => (
    Math.abs(x - targetTrm) < Math.abs(xValues[bestIndex] - targetTrm) ? index : bestIndex
  ), 0);

  return {
    trm: xValues[closestIndex],
    operativeTemperature: yValues[closestIndex],
  };
}

describe("adaptive charts", () => {
  it("keeps ASHRAE static chart boundaries within jsthermalcomfort rounding tolerance", () => {
    const chart = buildAdaptiveChart(
      {
        inputs: {
          [InputId.Input1]: ashraePayload,
        },
      },
      AdaptiveStandardMode.Ashrae,
    );
    const lower80 = getBoundaryPoint(chart, "80% Acceptability", ashraePayload.trm, "lower");
    const upper80 = getBoundaryPoint(chart, "80% Acceptability", ashraePayload.trm, "upper");
    const lower90 = getBoundaryPoint(chart, "90% Acceptability", ashraePayload.trm, "lower");
    const upper90 = getBoundaryPoint(chart, "90% Acceptability", ashraePayload.trm, "upper");
    const result = calculateAdaptive(
      {
        ...ashraePayload,
        trm: lower80.trm,
      },
      AdaptiveStandardMode.Ashrae,
    );

    expect(lower80.operativeTemperature).toBeCloseTo(result.tmp_cmf_80_low!, 1);
    expect(upper80.operativeTemperature).toBeCloseTo(result.tmp_cmf_80_up!, 1);
    expect(lower90.operativeTemperature).toBeCloseTo(result.tmp_cmf_90_low!, 1);
    expect(upper90.operativeTemperature).toBeCloseTo(result.tmp_cmf_90_up!, 1);
  });

  it("renders mean-outdoor-temperature dynamic charts as smooth bands instead of grid contours", () => {
    const chart = buildAdaptiveDynamicChart(
      {
        inputs: {
          [InputId.Input1]: ashraePayload,
        },
      },
      AdaptiveStandardMode.Ashrae,
      UnitSystem.SI,
      FieldKey.PrevailingMeanOutdoorTemperature,
      FieldKey.OperativeTemperature,
    );

    const tooltipLayer = chart.traces.find((trace) => trace.name === "Tooltip Layer");
    const visibleContourTraces = chart.traces.filter((trace) => trace.type === "contour" && trace.name !== "Tooltip Layer");

    expect(tooltipLayer?.type).toBe("contour");
    expect(tooltipLayer?.contours?.coloring).toBe("none");
    expect(visibleContourTraces).toHaveLength(0);
    expect(chart.traces.some((trace) => trace.type === "scatter" && trace.fill === "toself")).toBe(true);
  });
});

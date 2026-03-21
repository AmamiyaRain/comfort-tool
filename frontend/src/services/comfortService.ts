import { CompareCaseId, type CompareCaseId as CompareCaseIdType } from "../models/compareCases";
import { CalculationSource, ComfortStandard } from "../models/calculationMetadata";
import type {
  ComfortPointDto,
  ComfortZoneRequestDto,
  ComfortZoneResponseDto,
  PlotAnnotationDto,
  PlotlyChartResponseDto,
  PlotTraceDto,
  PmvCompareChartRequestDto,
  PmvRequestDto,
  PmvResponseDto,
  PsychrometricChartRequestDto,
  RelativeHumidityChartRequestDto,
  UtciRequestDto,
  UtciResponseDto,
  UtciStressChartRequestDto,
} from "../models/dto";
import {
  UtciStressCategory,
  utciStressBands,
  utciStressCategoryOrder,
  utciStressShortLabelByCategory,
  type UtciStressCategory as UtciStressCategoryType,
} from "../models/utciStress";
import { pmv_ppd } from "jsthermalcomfort/lib/esm/models/pmv_ppd.js";
import { utci } from "jsthermalcomfort/lib/esm/models/utci.js";
import { psy_ta_rh } from "jsthermalcomfort/lib/esm/psychrometrics/psy_ta_rh.js";

const PMV_COMFORT_LIMIT = 0.5;
const ATM_PRESSURE_PA = 101325;

const compareCaseChartStyleById: Record<
  CompareCaseIdType,
  {
    line: string;
    fill: string;
    marker: string;
  }
> = {
  [CompareCaseId.A]: {
    line: "#0f766e",
    fill: "rgba(15, 118, 110, 0.18)",
    marker: "#0f766e",
  },
  [CompareCaseId.B]: {
    line: "#b45309",
    fill: "rgba(180, 83, 9, 0.14)",
    marker: "#b45309",
  },
  [CompareCaseId.C]: {
    line: "#1d4ed8",
    fill: "rgba(29, 78, 216, 0.12)",
    marker: "#1d4ed8",
  },
};

export type ComfortZonesByCase = Partial<Record<CompareCaseIdType, ComfortZoneResponseDto>>;
export type UtciChartResultsByCase = Partial<Record<CompareCaseIdType, UtciResponseDto>>;

function roundValue(value: number, decimals = 3): number {
  return Number(value.toFixed(decimals));
}

function ensureFiniteValue(label: string, value: number): number {
  if (!Number.isFinite(value)) {
    throw new Error(`${label} calculation returned an invalid value.`);
  }
  return value;
}

function calculatePmvValues(payload: PmvRequestDto): { pmv: number; ppd: number } {
  const result = pmv_ppd(payload.tdb, payload.tr, payload.vr, payload.rh, payload.met, payload.clo, payload.wme, "ASHRAE", {
    units: payload.units,
    limit_inputs: false,
    airspeed_control: true,
  });

  return {
    pmv: ensureFiniteValue("PMV", result.pmv),
    ppd: ensureFiniteValue("PPD", result.ppd),
  };
}

function clonePmvPayload(payload: PmvRequestDto, overrides: Partial<PmvRequestDto>): PmvRequestDto {
  return {
    ...payload,
    ...overrides,
  };
}

function solveDryBulbForTargetPmv(targetPmv: number, rh: number, payload: ComfortZoneRequestDto): number | null {
  let low = 10;
  let high = 40;

  const lowResult = calculatePmvValues(clonePmvPayload(payload, { tdb: low, rh }));
  const highResult = calculatePmvValues(clonePmvPayload(payload, { tdb: high, rh }));

  let lowDelta = lowResult.pmv - targetPmv;
  const highDelta = highResult.pmv - targetPmv;
  if (lowDelta * highDelta > 0) {
    return null;
  }

  for (let index = 0; index < 45; index += 1) {
    const middle = (low + high) / 2;
    const middleResult = calculatePmvValues(clonePmvPayload(payload, { tdb: middle, rh }));
    const middleDelta = middleResult.pmv - targetPmv;

    if (Math.abs(middleDelta) < 5e-4) {
      return middle;
    }

    if (lowDelta * middleDelta <= 0) {
      high = middle;
    } else {
      low = middle;
      lowDelta = middleDelta;
    }
  }

  return (low + high) / 2;
}

function getPmvCompareCases(
  payload: PmvCompareChartRequestDto | RelativeHumidityChartRequestDto,
): Array<{ caseId: CompareCaseIdType; payload: ComfortZoneRequestDto }> {
  const cases: Array<{ caseId: CompareCaseIdType; payload: ComfortZoneRequestDto }> = [
    { caseId: CompareCaseId.A, payload: payload.case_a },
  ];

  if (payload.case_b) {
    cases.push({ caseId: CompareCaseId.B, payload: payload.case_b });
  }

  if (payload.case_c) {
    cases.push({ caseId: CompareCaseId.C, payload: payload.case_c });
  }

  return cases;
}

function getUtciCases(payload: UtciStressChartRequestDto): Array<{ caseId: CompareCaseIdType; payload: UtciRequestDto }> {
  const cases: Array<{ caseId: CompareCaseIdType; payload: UtciRequestDto }> = [
    { caseId: CompareCaseId.A, payload: payload.case_a },
  ];

  if (payload.case_b) {
    cases.push({ caseId: CompareCaseId.B, payload: payload.case_b });
  }

  if (payload.case_c) {
    cases.push({ caseId: CompareCaseId.C, payload: payload.case_c });
  }

  return cases;
}

function getHumidityRatioGkg(temperature: number, relativeHumidity: number): number {
  const result = psy_ta_rh(temperature, relativeHumidity, ATM_PRESSURE_PA);
  return ensureFiniteValue("Humidity ratio", result.hr) * 1000;
}

function normalizeUtciStressCategory(value: string): UtciStressCategoryType {
  const matchedCategory = utciStressCategoryOrder.find((category) => category === value);
  if (!matchedCategory) {
    throw new Error(`Unexpected UTCI stress category: ${value}`);
  }
  return matchedCategory;
}

function getComfortZoneForCase(
  caseId: CompareCaseIdType,
  payload: ComfortZoneRequestDto,
  comfortZonesByCase: ComfortZonesByCase,
): ComfortZoneResponseDto {
  return comfortZonesByCase[caseId] ?? calculateComfortZone(payload);
}

function getUtciResultForCase(
  caseId: CompareCaseIdType,
  payload: UtciRequestDto,
  utciResultsByCase: UtciChartResultsByCase,
): UtciResponseDto {
  return utciResultsByCase[caseId] ?? calculateUtci(payload);
}

export function calculatePmv(payload: PmvRequestDto): PmvResponseDto {
  const result = calculatePmvValues(payload);
  return {
    pmv: result.pmv,
    ppd: result.ppd,
    acceptable_80: Math.abs(result.pmv) <= PMV_COMFORT_LIMIT,
    standard: ComfortStandard.Ashrae55PmvPpd,
    source: CalculationSource.JsThermalComfort,
  };
}

export function calculateComfortZone(payload: ComfortZoneRequestDto): ComfortZoneResponseDto {
  const rhMinimum = Math.min(payload.rh_min, payload.rh_max);
  const rhMaximum = Math.max(payload.rh_min, payload.rh_max);
  const rhValues =
    payload.rh_points === 1
      ? [rhMinimum]
      : Array.from({ length: payload.rh_points }, (_, index) => (
          rhMinimum + ((rhMaximum - rhMinimum) * index) / (payload.rh_points - 1)
        ));

  const coolEdge: ComfortPointDto[] = [];
  const warmEdge: ComfortPointDto[] = [];

  rhValues.forEach((relativeHumidity) => {
    const coolTemperature = solveDryBulbForTargetPmv(-PMV_COMFORT_LIMIT, relativeHumidity, payload);
    const warmTemperature = solveDryBulbForTargetPmv(PMV_COMFORT_LIMIT, relativeHumidity, payload);

    if (coolTemperature === null || warmTemperature === null) {
      return;
    }

    coolEdge.push({
      tdb: coolTemperature,
      rh: relativeHumidity,
    });
    warmEdge.push({
      tdb: warmTemperature,
      rh: relativeHumidity,
    });
  });

  return {
    cool_edge: coolEdge,
    warm_edge: warmEdge,
    source: CalculationSource.FrontendGenerated,
  };
}

export function buildPsychrometricChart(payload: PsychrometricChartRequestDto): PlotlyChartResponseDto {
  return buildComparePsychrometricChart(
    {
      case_a: payload,
      case_b: null,
      case_c: null,
      chart_range: payload.chart_range,
      rh_curves: payload.rh_curves,
    },
    {
      [CompareCaseId.A]: calculateComfortZone(payload),
    },
  );
}

export function buildComparePsychrometricChart(
  payload: PmvCompareChartRequestDto,
  comfortZonesByCase: ComfortZonesByCase = {},
): PlotlyChartResponseDto {
  const cases = getPmvCompareCases(payload);
  const showCaseLegend = cases.length > 1;
  const { chart_range: chartRange } = payload;
  const temperatures = Array.from({ length: chartRange.tdb_points }, (_, index) => (
    chartRange.tdb_min + ((chartRange.tdb_max - chartRange.tdb_min) * index) / (chartRange.tdb_points - 1)
  ));

  const traces: PlotTraceDto[] = [];

  payload.rh_curves.forEach((relativeHumidity) => {
    const xValues: number[] = [];
    const yValues: number[] = [];

    temperatures.forEach((temperature) => {
      const humidityRatio = getHumidityRatioGkg(temperature, relativeHumidity);
      if (humidityRatio >= chartRange.humidity_ratio_min && humidityRatio <= chartRange.humidity_ratio_max) {
        xValues.push(roundValue(temperature));
        yValues.push(roundValue(humidityRatio));
      }
    });

    if (xValues.length === 0) {
      return;
    }

    traces.push({
      type: "scatter",
      mode: "lines",
      name: `RH ${relativeHumidity}%`,
      x: xValues,
      y: yValues,
      showlegend: false,
      line: { color: "#94a3b8", width: 1.2 },
      marker: {},
      hovertemplate: "Tdb %{x:.1f} C<br>Humidity ratio %{y:.1f} g/kg<extra></extra>",
    });
  });

  cases.forEach(({ caseId, payload: casePayload }) => {
    const comfortZone = getComfortZoneForCase(caseId, casePayload, comfortZonesByCase);
    const polygon = [...comfortZone.cool_edge, ...[...comfortZone.warm_edge].reverse()];
    const caseStyle = compareCaseChartStyleById[caseId];

    if (polygon.length > 0) {
      traces.push({
        type: "scatter",
        mode: "lines",
        name: `Case ${caseId} comfort zone`,
        x: polygon.map((point) => roundValue(point.tdb)),
        y: polygon.map((point) => roundValue(getHumidityRatioGkg(point.tdb, point.rh))),
        showlegend: false,
        fill: "toself",
        fillcolor: caseStyle.fill,
        line: { color: caseStyle.line, width: 1.5 },
        marker: {},
        hovertemplate: "Tdb %{x:.1f} C<br>Humidity ratio %{y:.1f} g/kg<extra></extra>",
      });
    }

    traces.push({
      type: "scatter",
      mode: "markers",
      name: `Case ${caseId}`,
      x: [roundValue(casePayload.tdb)],
      y: [roundValue(getHumidityRatioGkg(casePayload.tdb, casePayload.rh))],
      showlegend: showCaseLegend,
      line: {},
      marker: { color: caseStyle.marker, size: 12 },
      hovertemplate: `Case ${caseId}<br>Tdb %{x:.1f} C<br>Humidity ratio %{y:.1f} g/kg<extra></extra>`,
    });
  });

  return {
    traces,
    layout: {
      title: "Psychrometric chart",
      paper_bgcolor: "#ffffff",
      plot_bgcolor: "#f8fafc",
      showlegend: showCaseLegend,
      margin: { l: 56, r: 24, t: 48, b: 56 },
      xaxis: {
        title: "Dry bulb temperature (C)",
        range: [chartRange.tdb_min, chartRange.tdb_max],
        gridcolor: "#e2e8f0",
      },
      yaxis: {
        title: "Humidity ratio (g/kg)",
        range: [chartRange.humidity_ratio_min, chartRange.humidity_ratio_max],
        gridcolor: "#e2e8f0",
      },
      legend: { orientation: "h", x: 0, y: 1.1 },
      height: 440,
    },
    annotations: [],
    source: CalculationSource.FrontendGenerated,
  };
}

export function buildRelativeHumidityChart(
  payload: RelativeHumidityChartRequestDto,
  comfortZonesByCase: ComfortZonesByCase = {},
): PlotlyChartResponseDto {
  const cases = getPmvCompareCases(payload);
  const showCaseLegend = cases.length > 1;
  const traces: PlotTraceDto[] = [];
  const annotations: PlotAnnotationDto[] = [];

  cases.forEach(({ caseId, payload: casePayload }) => {
    const comfortZone = getComfortZoneForCase(caseId, casePayload, comfortZonesByCase);
    const polygon = [...comfortZone.cool_edge, ...[...comfortZone.warm_edge].reverse()];
    const caseStyle = compareCaseChartStyleById[caseId];

    if (polygon.length > 0) {
      traces.push({
        type: "scatter",
        mode: "lines",
        name: `Case ${caseId} RH comfort zone`,
        x: polygon.map((point) => roundValue(point.tdb)),
        y: polygon.map((point) => roundValue(point.rh)),
        showlegend: false,
        fill: "toself",
        fillcolor: caseStyle.fill,
        line: { color: caseStyle.line, width: 1.5 },
        marker: {},
        hovertemplate: "Tdb %{x:.1f} C<br>RH %{y:.0f}%<extra></extra>",
      });
    }

    traces.push({
      type: "scatter",
      mode: "markers",
      name: `Case ${caseId}`,
      x: [roundValue(casePayload.tdb)],
      y: [roundValue(casePayload.rh)],
      showlegend: showCaseLegend,
      line: {},
      marker: { color: caseStyle.marker, size: 12 },
      hovertemplate: `Case ${caseId}<br>Tdb %{x:.1f} C<br>RH %{y:.0f}%<extra></extra>`,
    });

    annotations.push({
      x: roundValue(casePayload.tdb),
      y: roundValue(casePayload.rh),
      text: caseId,
      showarrow: true,
      font: { size: 11, color: caseStyle.line },
    });
  });

  return {
    traces,
    layout: {
      title: "Relative humidity chart",
      paper_bgcolor: "#ffffff",
      plot_bgcolor: "#f8fafc",
      showlegend: showCaseLegend,
      margin: { l: 56, r: 24, t: 48, b: 56 },
      xaxis: {
        title: "Dry bulb temperature (C)",
        range: [10, 40],
        gridcolor: "#e2e8f0",
      },
      yaxis: {
        title: "Relative humidity (%)",
        range: [0, 100],
        gridcolor: "#e2e8f0",
      },
      legend: { orientation: "h", x: 0, y: 1.1 },
      height: 420,
    },
    annotations,
    source: CalculationSource.FrontendGenerated,
  };
}

export function calculateUtci(payload: UtciRequestDto): UtciResponseDto {
  const result = utci(payload.tdb, payload.tr, payload.v, payload.rh, payload.units, true, false);

  if (typeof result === "number") {
    throw new Error("UTCI calculation did not return a stress category.");
  }

  return {
    utci: ensureFiniteValue("UTCI", result.utci),
    stress_category: normalizeUtciStressCategory(String(result.stress_category)),
    source: CalculationSource.JsThermalComfort,
  };
}

export function buildUtciStressChart(
  payload: UtciStressChartRequestDto,
  utciResultsByCase: UtciChartResultsByCase = {},
): PlotlyChartResponseDto {
  const cases = getUtciCases(payload);
  const showCaseLegend = cases.length > 1;
  const markerPositions = cases.length > 1 ? [0.78, 0.5, 0.22] : [0.5];
  const traces: PlotTraceDto[] = [];
  const annotations: PlotAnnotationDto[] = [];

  cases.forEach(({ caseId, payload: casePayload }, index) => {
    const result = getUtciResultForCase(caseId, casePayload, utciResultsByCase);
    const caseStyle = compareCaseChartStyleById[caseId];
    const yPosition = markerPositions[index];

    traces.push({
      type: "scatter",
      mode: "markers",
      name: `Case ${caseId}`,
      x: [roundValue(result.utci)],
      y: [yPosition],
      showlegend: showCaseLegend,
      line: {},
      marker: { color: caseStyle.marker, size: 14 },
      hovertemplate: `Case ${caseId}<br>UTCI %{x:.1f} C<br>${result.stress_category}<extra></extra>`,
    });

    annotations.push({
      x: roundValue(result.utci),
      y: yPosition + 0.12,
      text: `Case ${caseId}<br>${result.stress_category}`,
      showarrow: false,
      font: { size: 12, color: caseStyle.line },
    });
  });

  utciStressBands.forEach((band, index) => {
    annotations.push({
      x: (band.minimum + band.maximum) / 2,
      y: index % 2 === 0 ? 0.05 : 0.16,
      text: utciStressShortLabelByCategory[band.category],
      showarrow: false,
      font: { size: 8, color: "#1f2937" },
    });
  });

  return {
    traces,
    layout: {
      title: "UTCI stress category",
      paper_bgcolor: "#ffffff",
      plot_bgcolor: "#f8fafc",
      showlegend: showCaseLegend,
      margin: { l: 40, r: 24, t: 48, b: 96 },
      xaxis: {
        title: "UTCI (C)",
        range: [-50, 55],
        gridcolor: "#e2e8f0",
      },
      yaxis: {
        title: "",
        range: [0, 1],
        showticklabels: false,
        gridcolor: "#ffffff",
      },
      shapes: utciStressBands.map((band) => ({
        type: "rect",
        xref: "x",
        yref: "paper",
        x0: band.minimum,
        x1: band.maximum,
        y0: 0,
        y1: 1,
        fillcolor: band.color,
        line: { width: 0 },
        opacity: 0.18,
      })),
      legend: { orientation: "h", x: 0, y: 1.08 },
      height: 360,
    },
    annotations,
    source: CalculationSource.FrontendGenerated,
  };
}

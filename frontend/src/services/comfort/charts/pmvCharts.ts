import {
  CompareCaseId,
  compareCaseChartStyleById,
} from "../../../models/compareCases";
import { CalculationSource } from "../../../models/calculationMetadata";
import type {
  PlotAnnotationDto,
  PlotlyChartResponseDto,
  PlotTraceDto,
  PmvCompareChartRequestDto,
  PsychrometricChartRequestDto,
  RelativeHumidityChartRequestDto,
} from "../../../models/dto";
import { calculateComfortZone } from "../comfortZone";
import {
  getPmvCompareCases,
  roundValue,
  type ComfortZonesByCase,
} from "../helpers";
import { getHumidityRatioGkg } from "../psychrometrics";

function getComfortZoneForCase(caseId, payload, comfortZonesByCase: ComfortZonesByCase) {
  return comfortZonesByCase[caseId] ?? calculateComfortZone(payload);
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
        title: "Dry bulb temperature (°C)",
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
        title: "Dry bulb temperature (°C)",
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

import { compareCaseChartStyleById } from "../../../models/compareCases";
import { CalculationSource } from "../../../models/calculationMetadata";
import {
  utciStressBands,
  utciStressShortLabelByCategory,
} from "../../../models/utciStress";
import type {
  PlotAnnotationDto,
  PlotlyChartResponseDto,
  PlotTraceDto,
  UtciRequestDto,
  UtciResponseDto,
  UtciStressChartRequestDto,
} from "../../../models/dto";
import { calculateUtci } from "../utci";
import {
  formatSignedTemperature,
  getPaddedAxisRange,
  getUtciCases,
  roundValue,
  type UtciChartResultsByCase,
} from "../helpers";

function getUtciResultForCase(
  caseId,
  payload: UtciRequestDto,
  utciResultsByCase: UtciChartResultsByCase,
): UtciResponseDto {
  return utciResultsByCase[caseId] ?? calculateUtci(payload);
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

export function buildUtciTemperatureChart(
  payload: UtciStressChartRequestDto,
  utciResultsByCase: UtciChartResultsByCase = {},
): PlotlyChartResponseDto {
  const cases = getUtciCases(payload);
  const showCaseLegend = cases.length > 1;
  const traces: PlotTraceDto[] = [];
  const annotations: PlotAnnotationDto[] = [];
  const dryBulbTemperatures = cases.map(({ payload: casePayload }) => casePayload.tdb);
  const xRange = getPaddedAxisRange(dryBulbTemperatures, [-50, 55]);

  cases.forEach(({ caseId, payload: casePayload }) => {
    const result = getUtciResultForCase(caseId, casePayload, utciResultsByCase);
    const caseStyle = compareCaseChartStyleById[caseId];
    const temperatureOffset = result.utci - casePayload.tdb;

    traces.push({
      type: "scatter",
      mode: "markers",
      name: `Case ${caseId}`,
      x: [roundValue(casePayload.tdb)],
      y: [roundValue(result.utci)],
      showlegend: showCaseLegend,
      line: {},
      marker: { color: caseStyle.marker, size: 13 },
      hovertemplate: `Case ${caseId}<br>Dry bulb %{x:.1f} C<br>UTCI %{y:.1f} C<br>Offset ${formatSignedTemperature(temperatureOffset)}<br>${result.stress_category}<extra></extra>`,
    });

    annotations.push({
      x: roundValue(casePayload.tdb),
      y: roundValue(result.utci),
      text: `Case ${caseId}<br>${formatSignedTemperature(temperatureOffset)}`,
      showarrow: true,
      font: { size: 11, color: caseStyle.line },
    });
  });

  return {
    traces,
    layout: {
      title: "UTCI vs air temperature",
      paper_bgcolor: "#ffffff",
      plot_bgcolor: "#f8fafc",
      showlegend: showCaseLegend,
      margin: { l: 56, r: 24, t: 48, b: 56 },
      xaxis: {
        title: "Dry bulb temperature (°C)",
        range: xRange,
        gridcolor: "#e2e8f0",
      },
      yaxis: {
        title: "UTCI (C)",
        range: [-50, 55],
        gridcolor: "#e2e8f0",
      },
      shapes: [
        ...utciStressBands.map((band) => ({
          type: "rect",
          xref: "paper",
          yref: "y",
          x0: 0,
          x1: 1,
          y0: band.minimum,
          y1: band.maximum,
          fillcolor: band.color,
          line: { width: 0 },
          opacity: 0.12,
        })),
        {
          type: "line",
          xref: "x",
          yref: "y",
          x0: xRange[0],
          x1: xRange[1],
          y0: xRange[0],
          y1: xRange[1],
          line: { color: "#94a3b8", width: 1.5, dash: "dash" },
        },
      ],
      legend: { orientation: "h", x: 0, y: 1.08 },
      height: 380,
    },
    annotations,
    source: CalculationSource.FrontendGenerated,
  };
}

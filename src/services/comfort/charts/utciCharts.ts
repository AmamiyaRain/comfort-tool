import { inputChartStyleById, inputMetaById } from "../../../models/inputSlots";
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
  UtciChartInputsRequestDto,
} from "../../../models/dto";
import { calculateUtci } from "../utci";
import {
  formatSignedTemperature,
  getPaddedAxisRange,
  getCompareInputs,
  roundValue,
  type UtciChartResultsByInput,
} from "../helpers";

function getUtciResultForInput(
  inputId,
  payload: UtciRequestDto,
  cachedResultsByInput: UtciChartResultsByInput,
): UtciResponseDto {
  return cachedResultsByInput[inputId] ?? calculateUtci(payload);
}

export function buildUtciStressChart(
  payload: UtciChartInputsRequestDto,
  cachedResultsByInput: UtciChartResultsByInput = {},
): PlotlyChartResponseDto {
  const inputs = getCompareInputs(payload.inputs);
  const showInputLegend = inputs.length > 1;
  const markerPositions = inputs.length > 1 ? [0.78, 0.5, 0.22] : [0.5];
  const traces: PlotTraceDto[] = [];
  const annotations: PlotAnnotationDto[] = [];

  inputs.forEach(({ inputId, payload: inputPayload }, index) => {
    const result = getUtciResultForInput(inputId, inputPayload, cachedResultsByInput);
    const inputStyle = inputChartStyleById[inputId];
    const inputLabel = inputMetaById[inputId].label;
    const yPosition = markerPositions[index];

    traces.push({
      type: "scatter",
      mode: "markers",
      name: inputLabel,
      x: [roundValue(result.utci)],
      y: [yPosition],
      showlegend: showInputLegend,
      line: {},
      marker: { color: inputStyle.marker, size: 14 },
      hovertemplate: `${inputLabel}<br>UTCI %{x:.1f} C<br>${result.stressCategory}<extra></extra>`,
    });

    annotations.push({
      x: roundValue(result.utci),
      y: yPosition + 0.12,
      text: `${inputLabel}<br>${result.stressCategory}`,
      showarrow: false,
      font: { size: 12, color: inputStyle.line },
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
      showlegend: showInputLegend,
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
  payload: UtciChartInputsRequestDto,
  cachedResultsByInput: UtciChartResultsByInput = {},
): PlotlyChartResponseDto {
  const inputs = getCompareInputs(payload.inputs);
  const showInputLegend = inputs.length > 1;
  const traces: PlotTraceDto[] = [];
  const annotations: PlotAnnotationDto[] = [];
  const dryBulbTemperatures = inputs.map(({ payload: inputPayload }) => inputPayload.tdb);
  const xRange = getPaddedAxisRange(dryBulbTemperatures, [-50, 55]);

  inputs.forEach(({ inputId, payload: inputPayload }) => {
    const result = getUtciResultForInput(inputId, inputPayload, cachedResultsByInput);
    const inputStyle = inputChartStyleById[inputId];
    const inputLabel = inputMetaById[inputId].label;
    const temperatureOffset = result.utci - inputPayload.tdb;

    traces.push({
      type: "scatter",
      mode: "markers",
      name: inputLabel,
      x: [roundValue(inputPayload.tdb)],
      y: [roundValue(result.utci)],
      showlegend: showInputLegend,
      line: {},
      marker: { color: inputStyle.marker, size: 13 },
      hovertemplate: `${inputLabel}<br>Dry bulb %{x:.1f} C<br>UTCI %{y:.1f} C<br>Offset ${formatSignedTemperature(temperatureOffset)}<br>${result.stressCategory}<extra></extra>`,
    });

    annotations.push({
      x: roundValue(inputPayload.tdb),
      y: roundValue(result.utci),
      text: `${inputLabel}<br>${formatSignedTemperature(temperatureOffset)}`,
      showarrow: true,
      font: { size: 11, color: inputStyle.line },
    });
  });

  return {
    traces,
    layout: {
      title: "UTCI vs air temperature",
      paper_bgcolor: "#ffffff",
      plot_bgcolor: "#f8fafc",
      showlegend: showInputLegend,
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

import { inputChartStyleById, inputMetaById } from "../../../models/inputSlots";
import { CalculationSource } from "../../../models/calculationMetadata";
import type { ComfortPointDto, CompareInputMap, PlotAnnotationDto, PlotlyChartResponseDto, PlotTraceDto } from "../../../models/dto";
import { getCompareInputs, roundValue, type ComfortZonesByInput } from "../helpers";

export function buildRelativeHumidityChart(
  payload: { inputs: CompareInputMap<ComfortPointDto> },
  comfortZonesByInput: ComfortZonesByInput = {},
): PlotlyChartResponseDto {
  const inputs = getCompareInputs(payload.inputs);
  const showInputLegend = inputs.length > 1;
  const traces: PlotTraceDto[] = [];
  const annotations: PlotAnnotationDto[] = [];

  inputs.forEach(({ inputId, payload: inputPayload }) => {
    const inputMeta = inputMetaById[inputId];
    const inputStyle = inputChartStyleById[inputId];
    const comfortZone = comfortZonesByInput[inputId];
    const polygon = comfortZone ? [...comfortZone.coolEdge, ...[...comfortZone.warmEdge].reverse()] : [];
    if (polygon.length > 0) {
      traces.push({
        type: "scatter",
        mode: "lines",
        name: `${inputMeta.label} RH comfort zone`,
        x: polygon.map((point) => roundValue(point.tdb)),
        y: polygon.map((point) => roundValue(point.rh)),
        showlegend: false,
        fill: "toself",
        fillcolor: inputStyle.fill,
        line: { color: inputStyle.line, width: 1.5 },
        marker: {},
        hovertemplate: "Tdb %{x:.1f} C<br>RH %{y:.0f}%<extra></extra>",
      });
    }
    traces.push({
      type: "scatter",
      mode: "markers",
      name: inputMeta.label,
      x: [roundValue(inputPayload.tdb)],
      y: [roundValue(inputPayload.rh)],
      showlegend: showInputLegend,
      line: {},
      marker: { color: inputStyle.marker, size: 12 },
      hovertemplate: `${inputMeta.label}<br>Tdb %{x:.1f} C<br>RH %{y:.0f}%<extra></extra>`,
    });
    annotations.push({
      x: roundValue(inputPayload.tdb),
      y: roundValue(inputPayload.rh),
      text: inputMeta.shortLabel,
      showarrow: true,
      font: { size: 11, color: inputStyle.line },
    });
  });
  return {
    traces,
    layout: {
      title: "Relative humidity chart",
      paper_bgcolor: "#ffffff",
      plot_bgcolor: "#f8fafc",
      showlegend: showInputLegend,
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

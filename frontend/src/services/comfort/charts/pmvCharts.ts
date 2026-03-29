import {
  InputId,
  inputMetaById,
  inputChartStyleById,
} from "../../../models/inputSlots";
import { CalculationSource } from "../../../models/calculationMetadata";
import type {
  PlotAnnotationDto,
  PlotlyChartResponseDto,
  PlotTraceDto,
  PmvChartInputsRequestDto,
  PsychrometricChartRequestDto,
  RelativeHumidityChartRequestDto,
} from "../../../models/dto";
import { calculateComfortZone } from "../comfortZone";
import {
  getCompareInputs,
  roundValue,
  type ComfortZonesByInput,
} from "../helpers";
import { getHumidityRatioGkg } from "../psychrometrics";

function getComfortZoneForInput(inputId, payload, comfortZonesByInput: ComfortZonesByInput) {
  return comfortZonesByInput[inputId] ?? calculateComfortZone(payload);
}

export function buildPsychrometricChart(payload: PsychrometricChartRequestDto): PlotlyChartResponseDto {
  return buildComparePsychrometricChart(
    {
      inputs: {
        [InputId.Input1]: payload,
      },
      chartRange: payload.chartRange,
      rhCurves: payload.rhCurves,
    },
    {
      [InputId.Input1]: calculateComfortZone(payload),
    },
  );
}

export function buildComparePsychrometricChart(
  payload: PmvChartInputsRequestDto,
  comfortZonesByInput: ComfortZonesByInput = {},
): PlotlyChartResponseDto {
  const inputs = getCompareInputs(payload.inputs);
  const showInputLegend = inputs.length > 1;
  const { chartRange } = payload;
  const temperatures = Array.from({ length: chartRange.tdbPoints }, (_, index) => (
    chartRange.tdbMin + ((chartRange.tdbMax - chartRange.tdbMin) * index) / (chartRange.tdbPoints - 1)
  ));

  const traces: PlotTraceDto[] = [];

  payload.rhCurves.forEach((relativeHumidity) => {
    const xValues: number[] = [];
    const yValues: number[] = [];

    temperatures.forEach((temperature) => {
      const humidityRatio = getHumidityRatioGkg(temperature, relativeHumidity);
      if (humidityRatio >= chartRange.humidityRatioMin && humidityRatio <= chartRange.humidityRatioMax) {
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

  inputs.forEach(({ inputId, payload: inputPayload }) => {
    const comfortZone = getComfortZoneForInput(inputId, inputPayload, comfortZonesByInput);
    const polygon = [...comfortZone.coolEdge, ...[...comfortZone.warmEdge].reverse()];
    const inputStyle = inputChartStyleById[inputId];
    const inputLabel = inputMetaById[inputId].label;

    if (polygon.length > 0) {
      traces.push({
        type: "scatter",
        mode: "lines",
        name: `${inputLabel} comfort zone`,
        x: polygon.map((point) => roundValue(point.tdb)),
        y: polygon.map((point) => roundValue(getHumidityRatioGkg(point.tdb, point.rh))),
        showlegend: false,
        fill: "toself",
        fillcolor: inputStyle.fill,
        line: { color: inputStyle.line, width: 1.5 },
        marker: {},
        hovertemplate: "Tdb %{x:.1f} C<br>Humidity ratio %{y:.1f} g/kg<extra></extra>",
      });
    }

    traces.push({
      type: "scatter",
      mode: "markers",
      name: inputLabel,
      x: [roundValue(inputPayload.tdb)],
      y: [roundValue(getHumidityRatioGkg(inputPayload.tdb, inputPayload.rh))],
      showlegend: showInputLegend,
      line: {},
      marker: { color: inputStyle.marker, size: 12 },
      hovertemplate: `${inputLabel}<br>Tdb %{x:.1f} C<br>Humidity ratio %{y:.1f} g/kg<extra></extra>`,
    });
  });

  return {
    traces,
    layout: {
      title: "Psychrometric chart",
      paper_bgcolor: "#ffffff",
      plot_bgcolor: "#f8fafc",
      showlegend: showInputLegend,
      margin: { l: 56, r: 24, t: 48, b: 56 },
      xaxis: {
        title: "Dry bulb temperature (°C)",
        range: [chartRange.tdbMin, chartRange.tdbMax],
        gridcolor: "#e2e8f0",
      },
      yaxis: {
        title: "Humidity ratio (g/kg)",
        range: [chartRange.humidityRatioMin, chartRange.humidityRatioMax],
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
  comfortZonesByInput: ComfortZonesByInput = {},
): PlotlyChartResponseDto {
  const inputs = getCompareInputs(payload.inputs);
  const showInputLegend = inputs.length > 1;
  const traces: PlotTraceDto[] = [];
  const annotations: PlotAnnotationDto[] = [];

  inputs.forEach(({ inputId, payload: inputPayload }) => {
    const comfortZone = getComfortZoneForInput(inputId, inputPayload, comfortZonesByInput);
    const polygon = [...comfortZone.coolEdge, ...[...comfortZone.warmEdge].reverse()];
    const inputStyle = inputChartStyleById[inputId];
    const inputLabel = inputMetaById[inputId].label;

    if (polygon.length > 0) {
      traces.push({
        type: "scatter",
        mode: "lines",
        name: `${inputLabel} RH comfort zone`,
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
      name: inputLabel,
      x: [roundValue(inputPayload.tdb)],
      y: [roundValue(inputPayload.rh)],
      showlegend: showInputLegend,
      line: {},
      marker: { color: inputStyle.marker, size: 12 },
      hovertemplate: `${inputLabel}<br>Tdb %{x:.1f} C<br>RH %{y:.0f}%<extra></extra>`,
    });

    annotations.push({
      x: roundValue(inputPayload.tdb),
      y: roundValue(inputPayload.rh),
      text: inputMetaById[inputId].shortLabel,
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

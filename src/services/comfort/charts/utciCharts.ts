import { inputChartStyleById, inputDisplayMetaById } from "../../../models/inputSlotPresentation";
import { FieldKey } from "../../../models/fieldKeys";
import { fieldMetaByKey } from "../../../models/fieldMeta";
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
import { UnitSystem, type UnitSystem as UnitSystemType } from "../../../models/units";
import { convertFieldValueFromSi } from "../../units";
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
  unitSystem: UnitSystemType = UnitSystem.SI,
): PlotlyChartResponseDto {
  const inputs = getCompareInputs(payload.inputs);
  const showInputLegend = inputs.length > 1;
  const markerPositions = inputs.length > 1 ? [0.78, 0.5, 0.22] : [0.5];
  const traces: PlotTraceDto[] = [];
  const annotations: PlotAnnotationDto[] = [];
  const temperatureDisplayUnits = fieldMetaByKey[FieldKey.DryBulbTemperature].displayUnits[unitSystem];
  const stressRange: [number, number] = [
    convertFieldValueFromSi(FieldKey.DryBulbTemperature, -50, unitSystem),
    convertFieldValueFromSi(FieldKey.DryBulbTemperature, 55, unitSystem),
  ];

  inputs.forEach(({ inputId, payload: inputPayload }, index) => {
    const result = getUtciResultForInput(inputId, inputPayload, cachedResultsByInput);
    const inputStyle = inputChartStyleById[inputId];
    const inputLabel = inputDisplayMetaById[inputId].label;
    const yPosition = markerPositions[index];
    const displayUtci = roundValue(convertFieldValueFromSi(FieldKey.DryBulbTemperature, result.utci, unitSystem));

    traces.push({
      type: "scatter",
      mode: "markers",
      name: inputLabel,
      x: [displayUtci],
      y: [yPosition],
      showlegend: showInputLegend,
      line: {},
      marker: { color: inputStyle.marker, size: 14 },
      hovertemplate: `${inputLabel}<br>UTCI %{x:.1f} ${temperatureDisplayUnits}<br>${result.stressCategory}<extra></extra>`,
    });

    annotations.push({
      x: displayUtci,
      y: yPosition + 0.12,
      text: `${inputLabel}<br>${result.stressCategory}`,
      showarrow: false,
      font: { size: 12, color: inputStyle.line },
    });
  });

  utciStressBands.forEach((band, index) => {
    annotations.push({
      x: (
        convertFieldValueFromSi(FieldKey.DryBulbTemperature, band.minimum, unitSystem) +
        convertFieldValueFromSi(FieldKey.DryBulbTemperature, band.maximum, unitSystem)
      ) / 2,
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
        title: `UTCI (${temperatureDisplayUnits})`,
        range: stressRange,
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
        x0: convertFieldValueFromSi(FieldKey.DryBulbTemperature, band.minimum, unitSystem),
        x1: convertFieldValueFromSi(FieldKey.DryBulbTemperature, band.maximum, unitSystem),
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
  unitSystem: UnitSystemType = UnitSystem.SI,
): PlotlyChartResponseDto {
  const inputs = getCompareInputs(payload.inputs);
  const showInputLegend = inputs.length > 1;
  const traces: PlotTraceDto[] = [];
  const annotations: PlotAnnotationDto[] = [];
  const temperatureDisplayUnits = fieldMetaByKey[FieldKey.DryBulbTemperature].displayUnits[unitSystem];
  const dryBulbTemperatures = inputs.map(({ payload: inputPayload }) => (
    convertFieldValueFromSi(FieldKey.DryBulbTemperature, inputPayload.tdb, unitSystem)
  ));
  const xRange = getPaddedAxisRange(
    dryBulbTemperatures,
    [
      convertFieldValueFromSi(FieldKey.DryBulbTemperature, -50, unitSystem),
      convertFieldValueFromSi(FieldKey.DryBulbTemperature, 55, unitSystem),
    ],
  );
  const utciAxisRange: [number, number] = [
    convertFieldValueFromSi(FieldKey.DryBulbTemperature, -50, unitSystem),
    convertFieldValueFromSi(FieldKey.DryBulbTemperature, 55, unitSystem),
  ];

  inputs.forEach(({ inputId, payload: inputPayload }) => {
    const result = getUtciResultForInput(inputId, inputPayload, cachedResultsByInput);
    const inputStyle = inputChartStyleById[inputId];
    const inputLabel = inputDisplayMetaById[inputId].label;
    const temperatureOffset = result.utci - inputPayload.tdb;
    const displayDryBulb = roundValue(convertFieldValueFromSi(FieldKey.DryBulbTemperature, inputPayload.tdb, unitSystem));
    const displayUtci = roundValue(convertFieldValueFromSi(FieldKey.DryBulbTemperature, result.utci, unitSystem));

    traces.push({
      type: "scatter",
      mode: "markers",
      name: inputLabel,
      x: [displayDryBulb],
      y: [displayUtci],
      showlegend: showInputLegend,
      line: {},
      marker: { color: inputStyle.marker, size: 13 },
      hovertemplate:
        `${inputLabel}<br>Dry bulb %{x:.1f} ${temperatureDisplayUnits}<br>` +
        `UTCI %{y:.1f} ${temperatureDisplayUnits}<br>` +
        `Offset ${formatSignedTemperature(temperatureOffset, unitSystem)}<br>${result.stressCategory}<extra></extra>`,
    });

    annotations.push({
      x: displayDryBulb,
      y: displayUtci,
      text: `${inputLabel}<br>${formatSignedTemperature(temperatureOffset, unitSystem)}`,
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
        title: `Dry bulb temperature (${temperatureDisplayUnits})`,
        range: xRange,
        gridcolor: "#e2e8f0",
      },
      yaxis: {
        title: `UTCI (${temperatureDisplayUnits})`,
        range: utciAxisRange,
        gridcolor: "#e2e8f0",
      },
      shapes: [
        ...utciStressBands.map((band) => ({
          type: "rect",
          xref: "paper",
          yref: "y",
          x0: 0,
          x1: 1,
          y0: convertFieldValueFromSi(FieldKey.DryBulbTemperature, band.minimum, unitSystem),
          y1: convertFieldValueFromSi(FieldKey.DryBulbTemperature, band.maximum, unitSystem),
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

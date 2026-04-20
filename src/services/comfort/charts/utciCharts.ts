import { FieldKey } from "../../../models/fieldKeys";
import { fieldMetaByKey } from "../../../models/inputFieldsMeta";
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
} from "../../../models/comfortDtos";
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
import { inputDisplayMetaById } from "../../../models/inputSlotPresentation";
import { buildInputAnnotation, buildInputScatterTrace, buildRectangleSelectionShape, buildTextAnnotation } from "./plotlyBuilders";

/**
 * Computes or retrieves pre-computed UTCI model scalars for an input slot.
 *
 * @param inputId The Input reference ID to look up.
 * @param payload The base physical parameters mapped to the slot.
 * @param cachedResultsByInput A dictionary of already completed calculation outputs.
 * @returns The resolved UTCI evaluation wrapper.
 */
function getUtciResultForInput(
  inputId,
  payload: UtciRequestDto,
  cachedResultsByInput: UtciChartResultsByInput,
): UtciResponseDto {
  return cachedResultsByInput[inputId] ?? calculateUtci(payload);
}

/**
 * Displays purely 1-dimensional horizontal plots characterizing UTCI categorized stress scores.
 * The Y position scales multiple inputs distinctly for overlapping values.
 *
 * @param payload Extracted physical parameters array.
 * @param cachedResultsByInput Evaluated scalar models per input.
 * @param unitSystem Standard SI or IP visual mappings context.
 * @returns Generated plotly traces and layout components mapping the stress charts.
 */
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
    const inputLabel = inputDisplayMetaById[inputId].label;
    const yPosition = markerPositions[index];
    const displayUtci = roundValue(convertFieldValueFromSi(FieldKey.DryBulbTemperature, result.utci, unitSystem));

    traces.push(buildInputScatterTrace({
      inputId,
      x: displayUtci,
      y: yPosition,
      showLegend: showInputLegend,
      hovertemplate: `${inputLabel}<br>UTCI %{x:.1f} ${temperatureDisplayUnits}<br>${result.stressCategory}<extra></extra>`,
      markerSize: 14,
    }));

    annotations.push(buildInputAnnotation({
      inputId,
      x: displayUtci,
      y: yPosition + 0.12,
      text: `${inputLabel}<br>${result.stressCategory}`,
      showArrow: false,
      textSize: 12,
    }));
  });

  utciStressBands.forEach((band, index) => {
    annotations.push(buildTextAnnotation({
      x: (
        convertFieldValueFromSi(FieldKey.DryBulbTemperature, band.minimum, unitSystem) +
        convertFieldValueFromSi(FieldKey.DryBulbTemperature, band.maximum, unitSystem)
      ) / 2,
      y: index % 2 === 0 ? 0.05 : 0.16,
      text: utciStressShortLabelByCategory[band.category],
    }));
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
      shapes: utciStressBands.map((band) => buildRectangleSelectionShape({
        xStart: convertFieldValueFromSi(FieldKey.DryBulbTemperature, band.minimum, unitSystem),
        xEnd: convertFieldValueFromSi(FieldKey.DryBulbTemperature, band.maximum, unitSystem),
        yStart: 0,
        yEnd: 1,
        fillColor: band.color,
        opacity: 0.18,
        xref: "x",
        yref: "paper",
      })),
      legend: { orientation: "h", x: 0, y: 1.08 },
      height: 360,
    },
    annotations,
    source: CalculationSource.FrontendGenerated,
  };
}

/**
 * Assembles a scatter chart projecting Air Temperature (X) against UTCI (Y).
 * Allows visually seeing exactly how much thermal burden or cooling the wind+radiation combination shifted.
 *
 * @param payload Extracted physical parameters mapping array.
 * @param cachedResultsByInput Evaluated UTCI output models.
 * @param unitSystem The active unit system mapping context.
 * @returns Plotly layout shapes plotting the UTCI shifts diagrammatically.
 */
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
    const inputLabel = inputDisplayMetaById[inputId].label;
    const temperatureOffset = result.utci - inputPayload.tdb;
    const displayDryBulb = roundValue(convertFieldValueFromSi(FieldKey.DryBulbTemperature, inputPayload.tdb, unitSystem));
    const displayUtci = roundValue(convertFieldValueFromSi(FieldKey.DryBulbTemperature, result.utci, unitSystem));

    traces.push(buildInputScatterTrace({
      inputId,
      x: displayDryBulb,
      y: displayUtci,
      showLegend: showInputLegend,
      hovertemplate: `${inputLabel}<br>Dry bulb %{x:.1f} ${temperatureDisplayUnits}<br>` +
      `UTCI %{y:.1f} ${temperatureDisplayUnits}<br>` +
      `Offset ${formatSignedTemperature(temperatureOffset, unitSystem)}<br>${result.stressCategory}<extra></extra>`,
      markerSize: 13,
    }));

    annotations.push(buildInputAnnotation({
      inputId,
      x: displayDryBulb,
      y: displayUtci,
      text: `${inputLabel}<br>${formatSignedTemperature(temperatureOffset, unitSystem)}`,
      showArrow: true,
      textSize: 11,
    }));
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
      shapes: utciStressBands.map((band) => buildRectangleSelectionShape({
        xStart: 0,
        xEnd: 1,
        yStart: convertFieldValueFromSi(FieldKey.DryBulbTemperature, band.minimum, unitSystem),
        yEnd: convertFieldValueFromSi(FieldKey.DryBulbTemperature, band.maximum, unitSystem),
        fillColor: band.color,
        opacity: 0.12,
        xref: "paper",
        yref: "y",
      })).concat([
        {
          type: "line",
          xref: "x" as const,
          yref: "y" as const,
          x0: xRange[0],
          x1: xRange[1],
          y0: xRange[0],
          y1: xRange[1],
          line: { color: "#94a3b8", width: 1.5, dash: "dash" },
        } as any,
      ]),
      legend: { orientation: "h", x: 0, y: 1.08 },
      height: 380,
    },
    annotations,
    source: CalculationSource.FrontendGenerated,
  };
}

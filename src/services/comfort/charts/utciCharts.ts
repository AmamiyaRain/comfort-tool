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
  UtciChartSourceDto,
} from "../../../models/comfortDtos";
import { InputId as InputIdType } from "../../../models/inputSlots";
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
import { buildInputAnnotation, buildInputScatterTrace, buildRectangleSelectionShape, buildTextAnnotation, buildContourTrace } from "./plotlyBuilders";
import { utci } from "jsthermalcomfort";
import { mapping as utciMapping } from "jsthermalcomfort/src/models/utci";

const UTCI_MIN = -50;
const UTCI_MAX = 55;
const UTCI_RANGE = UTCI_MAX - UTCI_MIN;

function n(val: number) {
  return (val - UTCI_MIN) / UTCI_RANGE;
}

const UTCI_COLORSCALE = [
  [0, "#0f172a"], [n(-40), "#0f172a"], // Extreme cold
  [n(-40), "#1d4ed8"], [n(-27), "#1d4ed8"], // Very strong cold
  [n(-27), "#2563eb"], [n(-13), "#2563eb"], // Strong cold
  [n(-13), "#3b82f6"], [n(0), "#3b82f6"], // Moderate cold
  [n(0), "#7dd3fc"], [n(9), "#7dd3fc"], // Slight cold
  [n(9), "#34d399"], [n(26), "#34d399"], // No thermal stress
  [n(26), "#fbbf24"], [n(32), "#fbbf24"], // Moderate heat
  [n(32), "#fb923c"], [n(38), "#fb923c"], // Strong heat
  [n(38), "#f97316"], [n(46), "#f97316"], // Very strong heat
  [n(46), "#dc2626"], [1, "#dc2626"], // Extreme heat
];

const UTCI_CONTOURS = {
  coloring: "heatmap",
  showlines: false,
};

/**
 * Retrieves or computes the UTCI result for a given input.
 *
 * @param inputId The ID of the input to look up.
 * @param payload the UTCI request payload.
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
 * Displays 1-dimensional horizontal plots characterizing UTCI categorized stress scores.
 * The Y position scales multiple inputs distinctly for overlapping values.
 *
 * @param payload The UTCI chart's inputs request data transfer object (DTO).
 * @param cachedResultsByInput A dictionary of already computed UTCI results for each input.
 * @param unitSystem Standard SI or IP visual mappings context.
 * @returns Generated plotly traces and layout components mapping the stress charts.
 */
export function buildUtciStressChart(
  // UTCI Chart Inputs Request Data Transfer Object (DTO).
  payload: UtciChartInputsRequestDto,
  // Cached UTCI results for each input.
  cachedResultsByInput: UtciChartResultsByInput = {},
  // Unit system (SI or IP).
  unitSystem: UnitSystemType = UnitSystem.SI,
): PlotlyChartResponseDto {
  // Get the inputs for the chart.
  const inputs = getCompareInputs(payload.inputs);
  // Show input legend if there are multiple inputs.
  const showInputLegend = inputs.length > 1;
  // Vertical positions for markers to avoid overlap.
  const markerPositions = inputs.length > 1 ? [0.78, 0.5, 0.22] : [0.5];
  // UTCI chart traces.
  const traces: PlotTraceDto[] = [];
  // UTCI chart annotations.
  const annotations: PlotAnnotationDto[] = [];
  // Get temperature display units.
  const temperatureDisplayUnits = fieldMetaByKey[FieldKey.DryBulbTemperature].displayUnits[unitSystem];
  // Default UTCI range in display units.
  const stressRange: [number, number] = [
    convertFieldValueFromSi(FieldKey.DryBulbTemperature, -50, unitSystem),
    convertFieldValueFromSi(FieldKey.DryBulbTemperature, 55, unitSystem),
  ];

  // Create data points and labels for each input.
  inputs.forEach(({ inputId, payload: inputPayload }, index) => {
    // Get UTCI result for the current input.
    const result = getUtciResultForInput(inputId, inputPayload, cachedResultsByInput);
    // Get input label.
    const inputLabel = inputDisplayMetaById[inputId].label;
    // Get y position.
    const yPosition = markerPositions[index];
    // Convert calculated UTCI (SI) to display units.
    const displayUtci = roundValue(convertFieldValueFromSi(FieldKey.DryBulbTemperature, result.utci, unitSystem));

    // Add the scatter point representing the UTCI value.
    traces.push(buildInputScatterTrace({
      // Input ID.
      inputId,
      // UTCI value (X position).
      x: displayUtci,
      // Y position.
      y: yPosition,
      // Show legend if multiple inputs.
      showLegend: showInputLegend,
      // Tooltip text showing UTCI value and stress category.
      hovertemplate: `${inputLabel}<br>UTCI %{x:.1f} ${temperatureDisplayUnits}<br>${result.stressCategory}<extra></extra>`,
      // Marker size.
      markerSize: 14,
    }));

    // Add the annotation representing the UTCI value.
    annotations.push(buildInputAnnotation({
      // Input ID.
      inputId,
      // UTCI value (X position).
      x: displayUtci,
      // Y position.
      y: yPosition + 0.12,
      // Text showing input label and stress category.
      text: `${inputLabel}<br>${result.stressCategory}`,
      // Show arrow.
      showArrow: false,
      // Text size.
      textSize: 12,
    }));
  });

  // Add text labels for the stress category bands.
  utciStressBands.forEach((band, index) => {
    annotations.push(buildTextAnnotation({
      // Center the label horizontally within the band.
      x: (
        // Minimum UTCI Temperature.
        convertFieldValueFromSi(FieldKey.DryBulbTemperature, band.minimum, unitSystem) +
        // Maximum UTCI Temperature.
        convertFieldValueFromSi(FieldKey.DryBulbTemperature, band.maximum, unitSystem)
      ) / 2,
      // Alternate vertical positions for labels to avoid crowding.
      y: index % 2 === 0 ? 0.05 : 0.16,
      // Text showing the stress category.
      text: utciStressShortLabelByCategory[band.category],
    }));
  });

  // Return the chart traces and layout.
  return {
    traces,
    layout: {
      // Chart title.
      title: "UTCI stress category",
      // Background colors.
      paper_bgcolor: "#ffffff",
      plot_bgcolor: "#f8fafc",
      // Show legend if multiple inputs.
      showlegend: showInputLegend,
      // Margins.
      margin: { l: 40, r: 24, t: 48, b: 80 },
      // X-axis (UTCI value).
      xaxis: {
        // X-axis title.
        title: `UTCI (${temperatureDisplayUnits})`,
        // X-axis range.
        range: stressRange,
        // Grid color.
        gridcolor: "#e2e8f0",
      },
      // Y-axis (Empty, used only for marker positioning).
      yaxis: {
        // Y-axis title.
        title: "",
        // Y-axis range.
        range: [0, 1],
        // Show tick labels.
        showticklabels: false,
        // Grid color.
        gridcolor: "#ffffff",
      },
      // Colored background bands for each stress category.
      shapes: utciStressBands.map((band) => buildRectangleSelectionShape({
        // X-axis start value.
        xStart: convertFieldValueFromSi(FieldKey.DryBulbTemperature, band.minimum, unitSystem),
        // X-axis end value.
        xEnd: convertFieldValueFromSi(FieldKey.DryBulbTemperature, band.maximum, unitSystem),
        // Y-axis start value.
        yStart: 0,
        // Y-axis end value.
        yEnd: 1,
        // Fill color.
        fillColor: band.color,
        // Opacity.
        opacity: 0.18,
        // X-axis reference.
        xref: "x",
        // Y-axis reference.
        yref: "paper",
      })),
      // Legend orientation and position.
      legend: { orientation: "h", x: 0, y: 1.08 },
      // Chart height.
      height: 480,
    },
    // Annotations.
    annotations,
    // The source of the calculation, indicating it was generated directly in the browser.
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
  // UTCI Chart Inputs Request Data Transfer Object (DTO).
  payload: UtciChartInputsRequestDto,
  // Cached UTCI results for each input.
  cachedResultsByInput: UtciChartResultsByInput = {},
  // Unit system (SI or IP).
  unitSystem: UnitSystemType = UnitSystem.SI,
): PlotlyChartResponseDto {
  // Get the inputs for the chart.
  const inputs = getCompareInputs(payload.inputs);
  // Show input legend if there are multiple inputs.
  const showInputLegend = inputs.length > 1;
  // UTCI chart traces.
  const traces: PlotTraceDto[] = [];
  // UTCI chart annotations.
  const annotations: PlotAnnotationDto[] = [];
  // Get temperature display units.
  const temperatureDisplayUnits = fieldMetaByKey[FieldKey.DryBulbTemperature].displayUnits[unitSystem];
  // Extract dry bulb temperatures for determining the X-axis range.
  const dryBulbTemperatures = inputs.map(({ payload: inputPayload }) => (
    convertFieldValueFromSi(FieldKey.DryBulbTemperature, inputPayload.tdb, unitSystem)
  ));
  // Calculate padded ranges for the chart axes.
  const xRange = getPaddedAxisRange(
    // Dry bulb temperatures.
    dryBulbTemperatures,
    // Default range.
    [
      // Minimum UTCI Temperature.
      convertFieldValueFromSi(FieldKey.DryBulbTemperature, -50, unitSystem),
      // Maximum UTCI Temperature.
      convertFieldValueFromSi(FieldKey.DryBulbTemperature, 55, unitSystem),
    ],
  );
  // UTCI axis range.
  const utciAxisRange: [number, number] = [
    // Minimum UTCI Temperature.
    convertFieldValueFromSi(FieldKey.DryBulbTemperature, -50, unitSystem),
    // Maximum UTCI Temperature.
    convertFieldValueFromSi(FieldKey.DryBulbTemperature, 55, unitSystem),
  ];

  // Create data points and labels for each input.
  inputs.forEach(({ inputId, payload: inputPayload }) => {
    // Get UTCI result for the current input.
    const result = getUtciResultForInput(inputId, inputPayload, cachedResultsByInput);
    // Get input label.
    const inputLabel = inputDisplayMetaById[inputId].label;
    // Calculate the temperature shift (UTCI vs Air Temp).
    const temperatureOffset = result.utci - inputPayload.tdb;
    // Convert calculated values to display units.
    const displayDryBulb = roundValue(convertFieldValueFromSi(FieldKey.DryBulbTemperature, inputPayload.tdb, unitSystem));
    const displayUtci = roundValue(convertFieldValueFromSi(FieldKey.DryBulbTemperature, result.utci, unitSystem));

    // Add the scatter point representing the current environment.
    traces.push(buildInputScatterTrace({
      // Input ID.
      inputId,
      // X position.
      x: displayDryBulb,
      // Y position.
      y: displayUtci,
      // Show legend if multiple inputs.
      showLegend: showInputLegend,
      // Tooltip text showing temperatures, offset, and stress category.
      hovertemplate: `${inputLabel}<br>Dry bulb %{x:.1f} ${temperatureDisplayUnits}<br>` +
      `UTCI %{y:.1f} ${temperatureDisplayUnits}<br>` +
      `Offset ${formatSignedTemperature(temperatureOffset, unitSystem)}<br>${result.stressCategory}<extra></extra>`,
      // Marker size.
      markerSize: 13,
    }));

  });


  // Return the chart traces and layout.
  return {
    traces,
    layout: {
      // Chart title.
      title: "UTCI vs air temperature",
      // Background colors.
      paper_bgcolor: "#ffffff",
      plot_bgcolor: "#f8fafc",
      // Show legend if multiple inputs.
      showlegend: showInputLegend,
      // Margins.
      margin: { l: 56, r: 24, t: 48, b: 80 },
      // X-axis (Air temperature).
      xaxis: {
        // X-axis title.
        title: `Dry bulb temperature (${temperatureDisplayUnits})`,
        // X-axis range.
        range: xRange,
        // Grid color.
        gridcolor: "#e2e8f0",
      },
      // Y-axis (UTCI value).
      yaxis: {
        // Y-axis title.
        title: `UTCI (${temperatureDisplayUnits})`,
        // Y-axis range.
        range: utciAxisRange,
        // Grid color.
        gridcolor: "#e2e8f0",
      },
      // Horizontal stress category bands.
      shapes: utciStressBands.map((band) => buildRectangleSelectionShape({
        // X-axis start value.
        xStart: 0,
        // X-axis end value.
        xEnd: 1,
        // Y-axis start value.
        yStart: convertFieldValueFromSi(FieldKey.DryBulbTemperature, band.minimum, unitSystem),
        // Y-axis end value.
        yEnd: convertFieldValueFromSi(FieldKey.DryBulbTemperature, band.maximum, unitSystem),
        // Fill color.
        fillColor: band.color,
        // Opacity.
        opacity: 0.12,
        // X-axis reference.
        xref: "paper",
        // Y-axis reference.
        yref: "y",
      })).concat([
        // Reference line (where UTCI = Air Temp).
        {
          // Line type.
          type: "line",
          // X-axis reference.
          xref: "x" as const,
          // Y-axis reference.
          yref: "y" as const,
          // X-axis start value.
          x0: xRange[0],
          // X-axis end value.
          x1: xRange[1],
          // Y-axis start value.
          y0: xRange[0],
          // Y-axis end value.
          y1: xRange[1],
          // Line styling.
          line: { color: "#94a3b8", width: 1.5, dash: "dash" },
        } as any,
      ]),
      // Legend orientation and position.
      legend: { orientation: "h", x: 0, y: 1.08 },
      // Chart height.
      height: 480,
    },
    // Annotations.
    annotations,
    // The source of the calculation, indicating it was generated directly in the browser.
    source: CalculationSource.FrontendGenerated,
  };
}

/**
 * Builds a dynamic 2D contour chart for the UTCI model based on two user-selected input axes.
 *
 * @param payload The base inputs to use for the non-dynamic axes.
 * @param cachedResultsByInput Cached calculations for the scatter points.
 * @param unitSystem The unit system to use for display.
 * @param dynamicXAxis The field key representing the X axis.
 * @param dynamicYAxis The field key representing the Y axis.
 */
export function buildUtciDynamicChart(
  payload: UtciChartInputsRequestDto,
  cachedResultsByInput: UtciChartResultsByInput = {},
  unitSystem: UnitSystemType = UnitSystem.SI,
  dynamicXAxis?: FieldKey,
  dynamicYAxis?: FieldKey,
  baselineInputId?: string,
): PlotlyChartResponseDto {
  const inputs = getCompareInputs(payload.inputs);
  const showInputLegend = inputs.length > 1;

  if (!dynamicXAxis || !dynamicYAxis || dynamicXAxis === dynamicYAxis) {
    return {
      traces: [],
      layout: {
        title: "Invalid Axes Selection",
        paper_bgcolor: "#ffffff",
        plot_bgcolor: "#f8fafc",
        showlegend: false,
        margin: { l: 64, r: 24, t: 48, b: 64 },
        xaxis: {},
        yaxis: {},
      },
      annotations: [],
      source: CalculationSource.FrontendGenerated,
    };
  }

  const activeInputPayload = (payload.inputs[baselineInputId as any] || inputs[0]?.payload);

  const xMeta = fieldMetaByKey[dynamicXAxis];
  const yMeta = fieldMetaByKey[dynamicYAxis];

  const xMin = convertFieldValueFromSi(dynamicXAxis, xMeta.minValue, unitSystem);
  const xMax = convertFieldValueFromSi(dynamicXAxis, xMeta.maxValue, unitSystem);
  const yMin = convertFieldValueFromSi(dynamicYAxis, yMeta.minValue, unitSystem);
  const yMax = convertFieldValueFromSi(dynamicYAxis, yMeta.maxValue, unitSystem);

  const xPoints = 100;
  const yPoints = 100;
  const xValues: number[] = [];
  const yValues: number[] = [];

  for (let i = 0; i < xPoints; i++) {
    xValues.push(xMin + (xMax - xMin) * (i / (xPoints - 1)));
  }
  for (let i = 0; i < yPoints; i++) {
    yValues.push(yMin + (yMax - yMin) * (i / (yPoints - 1)));
  }

  const zValues: number[][] = [];
  const textValues: string[][] = [];

  if (activeInputPayload) {
    for (let i = 0; i < yPoints; i++) {
      const row: number[] = [];
      const textRow: string[] = [];
      const ySi = dynamicYAxis === FieldKey.RelativeHumidity || dynamicYAxis === FieldKey.RelativeAirSpeed || dynamicYAxis === FieldKey.MetabolicRate || dynamicYAxis === FieldKey.ClothingInsulation || dynamicYAxis === FieldKey.ExternalWork 
                  ? yValues[i]
                  : (unitSystem === UnitSystem.IP ? (yValues[i] - 32) * 5/9 : yValues[i]);

      for (let j = 0; j < xPoints; j++) {
        const xSi = dynamicXAxis === FieldKey.RelativeHumidity || dynamicXAxis === FieldKey.RelativeAirSpeed || dynamicXAxis === FieldKey.MetabolicRate || dynamicXAxis === FieldKey.ClothingInsulation || dynamicXAxis === FieldKey.ExternalWork
                    ? xValues[j]
                    : (unitSystem === UnitSystem.IP ? (xValues[j] - 32) * 5/9 : xValues[j]);

        // Copy baseline inputs
        const pointArgs = {
          ...activeInputPayload,
          [dynamicXAxis]: xSi,
          [dynamicYAxis]: ySi,
        };

        try {
          const result = utci(pointArgs.tdb, pointArgs.tr, pointArgs.v, pointArgs.rh, "SI", true, false);
          if (typeof result === "object" && typeof result.utci === "number") {
            row.push(result.utci);
            textRow.push(utciStressShortLabelByCategory[String(result.stress_category) as any] ?? String(result.stress_category));
          } else {
            row.push(NaN);
            textRow.push("");
          }
        } catch (e) {
          row.push(NaN);
          textRow.push("");
        }
      }
      zValues.push(row);
      textValues.push(textRow);
    }
  }

  const traces: PlotTraceDto[] = [];

  if (zValues.length > 0) {
    traces.push(buildContourTrace({
      name: "UTCI Zones",
      x: xValues,
      y: yValues,
      z: zValues,
      text: textValues,
      colorscale: UTCI_COLORSCALE,
      contours: UTCI_CONTOURS,
      zmin: UTCI_MIN,
      zmax: UTCI_MAX,
      hovertemplate: `${xMeta.label}: %{x:.2f} ${xMeta.displayUnits[unitSystem]}<br>${yMeta.label}: %{y:.2f} ${yMeta.displayUnits[unitSystem]}<br><b>Zone: %{text}</b><br>UTCI: %{z:.1f}<extra></extra>`,
    }));
  }

  inputs.forEach(({ inputId, payload: inputPayload }) => {
    let inputX = inputPayload[dynamicXAxis as keyof typeof inputPayload] as number;
    let inputY = inputPayload[dynamicYAxis as keyof typeof inputPayload] as number;
    
    inputX = convertFieldValueFromSi(dynamicXAxis, inputX, unitSystem);
    inputY = convertFieldValueFromSi(dynamicYAxis, inputY, unitSystem);

    traces.push(buildInputScatterTrace({
      inputId,
      x: roundValue(inputX),
      y: roundValue(inputY),
      showLegend: showInputLegend,
      hovertemplate: `${inputDisplayMetaById[inputId]?.label ?? "Input"}<br>${xMeta.label} %{x:.2f} ${xMeta.displayUnits[unitSystem]}<br>${yMeta.label} %{y:.2f} ${yMeta.displayUnits[unitSystem]}<extra></extra>`,
    }));
  });

  return {
    traces,
    layout: {
      title: `UTCI Dynamic Chart (${xMeta.label} vs ${yMeta.label})`,
      paper_bgcolor: "#ffffff",
      plot_bgcolor: "#f8fafc",
      showlegend: showInputLegend,
      margin: { l: 64, r: 24, t: 48, b: 64 },
      xaxis: {
        title: `${xMeta.label} (${xMeta.displayUnits[unitSystem]})`,
        range: [xMin, xMax],
        gridcolor: "#e2e8f0",
      },
      yaxis: {
        title: `${yMeta.label} (${yMeta.displayUnits[unitSystem]})`,
        range: [yMin, yMax],
        gridcolor: "#e2e8f0",
      },
      legend: { orientation: "h", x: 0, y: 1.1 },
      height: 480,
    },
    annotations: [],
    source: CalculationSource.FrontendGenerated,
  };
}

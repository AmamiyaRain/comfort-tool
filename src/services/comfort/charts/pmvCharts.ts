import { FieldKey } from "../../../models/fieldKeys";
import { fieldMetaByKey } from "../../../models/inputFieldsMeta";
import { CalculationSource } from "../../../models/calculationMetadata";
import { inputDisplayMetaById } from "../../../models/inputSlotPresentation";
import { UnitSystem, type UnitSystem as UnitSystemType } from "../../../models/units";
import type {
  ComfortPointDto,
  PlotlyChartResponseDto,
  PlotTraceDto,
  PmvChartInputsRequestDto,
  PmvChartSourceDto,
} from "../../../models/comfortDtos";
import { InputId as InputIdType } from "../../../models/inputSlots";
import type { FieldKey as FieldKeyType } from "../../../models/fieldKeys";
import {
  convertFieldValueFromSi,
  convertHumidityRatioFromSi,
  getHumidityRatioDisplayMeta,
} from "../../units";
import { calculateComfortZone } from "../comfortZone";
import {
  getCompareInputs,
  roundValue,
  type ComfortZonesByInput,
} from "../helpers";
import { pmv_ppd, psy_ta_rh, p_sat } from "jsthermalcomfort";
import { buildComfortPolygonTrace, buildInputScatterTrace, buildLineTrace, buildContourTrace } from "./plotlyBuilders";

const PMV_COLORSCALE = [
  [0, "#0571b0"], [0.1428, "#0571b0"], // Cold
  [0.1428, "#4c78a8"], [0.2857, "#4c78a8"], // Cool
  [0.2857, "#92c5de"], [0.4285, "#92c5de"], // Slightly Cool
  [0.4285, "#f2f2f2"], [0.5714, "#f2f2f2"], // Neutral
  [0.5714, "#f4a582"], [0.7142, "#f4a582"], // Slightly Warm
  [0.7142, "#e15759"], [0.8571, "#e15759"], // Warm
  [0.8571, "#cc79a7"], [1, "#cc79a7"], // Hot
];

const PMV_CONTOURS = {
  start: -2.5,
  end: 2.5,
  size: 1,
  type: "levels",
  coloring: "fill",
  showlines: true,
  // This tells the rendering engine to mathematically interpolate and soften the edges of the colored zones
  smoothing: 1,
  line: { width: 1, color: "#333333" },
};

/**
 * Applies a light 3-point smoothing pass to X coordinates only.
 * This keeps the first/last points fixed while softening small left/right jitter
 * introduced by the comfort-zone solver sampling.
 */
function smoothComfortZoneXValues(xValues: number[]): number[] {
  if (xValues.length < 3) {
    return xValues;
  }

  return xValues.map((value, index) => (
    index === 0 || index === xValues.length - 1
      ? value
      : Math.round((((xValues[index - 1] + (value * 2) + xValues[index + 1]) / 4) * 1000)) / 1000
  ));
}

/**
 * Maps a PMV value to its corresponding thermal sensation zone name.
 */
function getPmvZoneName(pmv: number): string {
  if (isNaN(pmv)) return "";
  if (pmv <= -2.5) return "Cold";
  if (pmv <= -1.5) return "Cool";
  if (pmv <= -0.5) return "Slightly Cool";
  if (pmv < 0.5) return "Neutral";
  if (pmv < 1.5) return "Slightly Warm";
  if (pmv < 2.5) return "Warm";
  return "Hot";
}

/**
 * Builds a closed comfort-zone polygon while smoothing only the X axis.
 * The Y axis remains untouched so the RH/humidity-ratio sampling stays exact.
 */
export function buildComfortZonePolygon(
  coolEdge: ComfortPointDto[],
  warmEdge: ComfortPointDto[],
  getX: (point: ComfortPointDto) => number,
  getY: (point: ComfortPointDto) => number,
): { polygonX: number[]; polygonY: number[] } {
  const coolX = smoothComfortZoneXValues(coolEdge.map(getX));
  const coolY = coolEdge.map(getY);
  const warmX = smoothComfortZoneXValues(warmEdge.map(getX));
  const warmY = warmEdge.map(getY);

  return {
    polygonX: coolX.concat(warmX.slice().reverse()),
    polygonY: coolY.concat(warmY.slice().reverse()),
  };
}

/**
 * Retrieves or computes the comfort zone polygon boundaries for a given set of PMV inputs.
 *
 * @param inputId The ID of the input being generated.
 * @param payload The canonical PMV inputs for that slot.
 * @param comfortZonesByInput A cache containing previously computed comfort zones.
 * @returns The resolved ComfortZone mapping.
 */
function getComfortZoneForInput(inputId, payload, comfortZonesByInput: ComfortZonesByInput) {
  return comfortZonesByInput[inputId] ?? calculateComfortZone(payload);
}

/**
 * Converts humidity ratio from SI units (kg/kg) to the display units defined by the UnitSystem.
 *
 * @param temperature Air temperature in Celsius (required for conversion).
 * @param relativeHumidity Relative humidity in percent.
 * @param unitSystem The target unit system (SI or IP).
 * @returns Humidity ratio in the display units for the specified system.
 */
function getHumidityRatioDisplayValue(
  temperature: number,
  relativeHumidity: number,
  unitSystem: UnitSystemType,
): number {
  return convertHumidityRatioFromSi(psy_ta_rh(temperature, relativeHumidity).hr, unitSystem);
}

/**
 * Builds the psychrometric chart (Temperature vs Humidity Ratio) specific to the PMV model.
 * Maps out curves, comfort boundary polygons, and scatter points for inputs.
 *
 * @param payload The Chart Inputs structure.
 * @param comfortZonesByInput The computed comfort zones per input.
 * @param unitSystem The UI state representation style.
 * @returns Complete plotly response bindings (traces, annotations, layout).
 */
export function buildComparePsychrometricChart(
  // PMV Chart Inputs Request Data Transfer Object (DTO).
  payload: PmvChartInputsRequestDto,
  // Comfort zones calculated for each input.
  comfortZonesByInput: ComfortZonesByInput = {},
  // Unit system (SI or IP).
  unitSystem: UnitSystemType = UnitSystem.SI,
  // Full chart source context for baseline selection.
  chartSource?: PmvChartSourceDto,
): PlotlyChartResponseDto {
  // Get the inputs for the chart.
  const inputs = getCompareInputs(payload.inputs);
  // Show input legend if there are multiple inputs.
  const showInputLegend = inputs.length > 1;
  // Get chart range and display metadata.
  const { chartRange } = payload;
  const temperatureDisplayUnits = fieldMetaByKey[FieldKey.DryBulbTemperature].displayUnits[unitSystem];
  const humidityRatioMeta = getHumidityRatioDisplayMeta(unitSystem);
  // Generate temperature points for drawing curves.
  const temperatures = Array.from({ length: chartRange.tdbPoints }, (_, index) => (
    chartRange.tdbMin + ((chartRange.tdbMax - chartRange.tdbMin) * index) / (chartRange.tdbPoints - 1)
  ));

  const traces: PlotTraceDto[] = [];

  // Generate a background contour plot for the PMV ranges
  const activeInputPayload = (payload.inputs[chartSource?.baselineInputId as InputIdType] || inputs[0]?.payload);
  if (activeInputPayload) {
    const xPoints = 100;
    const yPoints = 100;
    const xValuesSi: number[] = [];
    const yValuesSi: number[] = [];
    for (let i = 0; i < xPoints; i++) xValuesSi.push(chartRange.tdbMin + (chartRange.tdbMax - chartRange.tdbMin) * (i / (xPoints - 1)));
    for (let i = 0; i < yPoints; i++) yValuesSi.push(chartRange.humidityRatioMin + (chartRange.humidityRatioMax - chartRange.humidityRatioMin) * (i / (yPoints - 1)));

    const zValues: number[][] = [];
    const textValues: string[][] = [];
    for (let i = 0; i < yPoints; i++) {
      const row: number[] = [];
      const textRow: string[] = [];
      const hr = yValuesSi[i];
      for (let j = 0; j < xPoints; j++) {
        const tdb = xValuesSi[j];
        const pAtm = 101325;
        const pVap = (hr * pAtm) / (0.62198 + hr);
        const pSaturation = p_sat(tdb);
        const rh = Math.min(100, Math.max(0, (pVap / pSaturation) * 100));

        try {
          const pmvResult = pmv_ppd(tdb, activeInputPayload.tr, activeInputPayload.vr, rh, activeInputPayload.met, activeInputPayload.clo, activeInputPayload.wme, "ASHRAE", { limit_inputs: false });
          row.push(pmvResult.pmv);
          textRow.push(getPmvZoneName(pmvResult.pmv));
        } catch {
          row.push(NaN);
          textRow.push("");
        }
      }
      zValues.push(row);
      textValues.push(textRow);
    }
    
    const displayXValues = xValuesSi.map(x => convertFieldValueFromSi(FieldKey.DryBulbTemperature, x, unitSystem));
    const displayYValues = yValuesSi.map(y => convertHumidityRatioFromSi(y, unitSystem));
    
    traces.push(buildContourTrace({
      name: "PMV Zones",
      x: displayXValues,
      y: displayYValues,
      z: zValues,
      text: textValues,
      colorscale: PMV_COLORSCALE,
      contours: PMV_CONTOURS,
      // Only show PMV values between -3.5 and 3.5
      zmin: -3.5,
      zmax: 3.5,
      hovertemplate: `Tdb: %{x:.1f} ${temperatureDisplayUnits}<br>Humidity ratio: %{y:.${humidityRatioMeta.decimals}f} ${humidityRatioMeta.displayUnits}<br><b>Zone: %{text}</b><br>PMV: %{z:.2f}<extra></extra>`,
    }));
  }

  // Generate relative humidity (RH) curves.
  payload.rhCurves.forEach((relativeHumidity) => {
    // X-axis values.
    const xValues: number[] = [];
    // Y-axis values.
    const yValues: number[] = [];
    // Generate the curve for the current relative humidity.
    temperatures.forEach((temperature) => {
      const humidityRatioSi = psy_ta_rh(temperature, relativeHumidity).hr;
      const humidityRatio = convertHumidityRatioFromSi(humidityRatioSi, unitSystem);
      // Add the point to the curve if it is within the chart range.
      if (humidityRatioSi >= chartRange.humidityRatioMin && humidityRatioSi <= chartRange.humidityRatioMax) {
        xValues.push(roundValue(convertFieldValueFromSi(FieldKey.DryBulbTemperature, temperature, unitSystem)));
        yValues.push(roundValue(humidityRatio));
      }
    });
    // Add the curve to the traces if it has any points.
    if (xValues.length === 0) {
      return;
    }
    // Add the curve to the traces.
    traces.push(buildLineTrace({
      // Name of the curve.
      name: `RH ${relativeHumidity}%`,
      // X-axis values.
      x: xValues,
      // Y-axis values.
      y: yValues,
      // Color of the curve.
      color: "#94a3b8",
      // Hover template for the curve.
      hovertemplate: `Tdb %{x:.1f} ${temperatureDisplayUnits}<br>` +
      `Humidity ratio %{y:.${humidityRatioMeta.decimals}f} ${humidityRatioMeta.displayUnits}<extra></extra>`,
    }));
  });

  // Generate comfort zones and data points for each input.
  inputs.forEach(({ inputId, payload: inputPayload }) => {
    const comfortZone = getComfortZoneForInput(inputId, inputPayload, comfortZonesByInput);
    const { polygonX, polygonY } =  buildComfortZonePolygon(
      comfortZone.coolEdge || [],
      comfortZone.warmEdge || [],
      (point) => roundValue(convertFieldValueFromSi(FieldKey.DryBulbTemperature, point.tdb, unitSystem)),
      (point) => roundValue(getHumidityRatioDisplayValue(point.tdb, point.rh, unitSystem)),
    );

    if (polygonX.length > 0) {
      // Add the shaded comfort zone polygon.
      traces.push(buildComfortPolygonTrace({
        inputId,
        nameSuffix: "comfort zone",
        polygonX,
        polygonY,
        // Tooltip text for the comfort zone.
        hovertemplate: `Tdb %{x:.1f} ${temperatureDisplayUnits}<br>` +
        `Humidity ratio %{y:.${humidityRatioMeta.decimals}f} ${humidityRatioMeta.displayUnits}<extra></extra>`,
      }));
    }

    // Add the data point for the current conditions.
    traces.push(buildInputScatterTrace({
      inputId,
      // Convert coordinates to display units.
      x: roundValue(convertFieldValueFromSi(FieldKey.DryBulbTemperature, inputPayload.tdb, unitSystem)),
      y: roundValue(getHumidityRatioDisplayValue(inputPayload.tdb, inputPayload.rh, unitSystem)),
      showLegend: showInputLegend,
      // Tooltip text for the data point.
      hovertemplate: `${inputDisplayMetaById[inputId]?.label ?? "Input"}<br>Tdb %{x:.1f} ${temperatureDisplayUnits}<br>` +
      `Humidity ratio %{y:.${humidityRatioMeta.decimals}f} ${humidityRatioMeta.displayUnits}<extra></extra>`,
    }));
  });

  // Return the chart traces and layout.
  return {
    traces,
    layout: {
      // Chart title.
      title: "Psychrometric chart",
      // Background colors.
      paper_bgcolor: "#ffffff",
      plot_bgcolor: "#f8fafc",
      // Show legend if multiple inputs.
      showlegend: showInputLegend,
      // Margins.
      margin: { l: 56, r: 24, t: 48, b: 80 },
      // X-axis (Dry bulb temperature).
      xaxis: {
        title: `Dry bulb temperature (${temperatureDisplayUnits})`,
        range: [
          convertFieldValueFromSi(FieldKey.DryBulbTemperature, chartRange.tdbMin, unitSystem),
          convertFieldValueFromSi(FieldKey.DryBulbTemperature, chartRange.tdbMax, unitSystem),
        ],
        gridcolor: "#e2e8f0",
      },
      // Y-axis (Humidity ratio).
      yaxis: {
        title: `Humidity ratio (${humidityRatioMeta.displayUnits})`,
        range: [
          convertHumidityRatioFromSi(chartRange.humidityRatioMin, unitSystem),
          convertHumidityRatioFromSi(chartRange.humidityRatioMax, unitSystem),
        ],
        gridcolor: "#e2e8f0",
      },
      // Legend and height.
      legend: { orientation: "h", x: 0, y: 1.1 },
      height: 480,
    },
    // Annotations.
    annotations: [],
    // The source of the calculation, indicating it was generated directly in the browser.
    source: CalculationSource.FrontendGenerated,
  };
}

/**
 * Builds a dynamic 2D chart for PMV by evaluating PMV over a grid of X and Y values.
 */
export function buildPmvDynamicChart(
  payload: PmvChartInputsRequestDto,
  dynamicXAxis: FieldKeyType,
  dynamicYAxis: FieldKeyType,
  unitSystem: UnitSystemType = UnitSystem.SI,
  chartSource?: PmvChartSourceDto,
): PlotlyChartResponseDto {
  const inputs = getCompareInputs(payload.inputs);
  const showInputLegend = inputs.length > 1;
  const activeInputPayload = payload.inputs[chartSource?.baselineInputId as InputIdType] || inputs[0]?.payload;

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
      const currentYSi = yValues[i]; // Need to convert back to SI if we want to calculate
      const ySi = dynamicYAxis === FieldKey.RelativeHumidity || dynamicYAxis === FieldKey.RelativeAirSpeed || dynamicYAxis === FieldKey.MetabolicRate || dynamicYAxis === FieldKey.ClothingInsulation || dynamicYAxis === FieldKey.ExternalWork 
                  ? yValues[i] // these don't change between SI and IP usually, or are handled directly
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

        // If Tdb is X and Tr is not selected, we don't automatically link them unless Tr was identical to Tdb originally, but let's just use the current logic.
        try {
          const pmvResult = pmv_ppd(pointArgs.tdb, pointArgs.tr, pointArgs.vr, pointArgs.rh, pointArgs.met, pointArgs.clo, pointArgs.wme, "ASHRAE", { limit_inputs: false });
          row.push(pmvResult.pmv);
          textRow.push(getPmvZoneName(pmvResult.pmv));
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
      name: "PMV",
      x: xValues,
      y: yValues,
      z: zValues,
      text: textValues,
      colorscale: PMV_COLORSCALE,
      contours: PMV_CONTOURS,
      // Only show PMV values between -3.5 and 3.5
      zmin: -3.5,
      zmax: 3.5,
      hovertemplate: `${xMeta.label}: %{x:.2f} ${xMeta.displayUnits[unitSystem]}<br>${yMeta.label}: %{y:.2f} ${yMeta.displayUnits[unitSystem]}<br><b>Zone: %{text}</b><br>PMV: %{z:.2f}<extra></extra>`,
    }));
  }

  inputs.forEach(({ inputId, payload: inputPayload }) => {
    let inputX = inputPayload[dynamicXAxis as keyof typeof inputPayload] as number;
    let inputY = inputPayload[dynamicYAxis as keyof typeof inputPayload] as number;
    
    // We already have generic convert logic
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
      title: `PMV Dynamic Chart (${xMeta.label} vs ${yMeta.label})`,
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

export function buildPmvRelativeHumidityChart(
  payload: PmvChartInputsRequestDto,
  unitSystem: UnitSystemType = UnitSystem.SI,
  chartSource?: PmvChartSourceDto,
): PlotlyChartResponseDto {
  const inputs = getCompareInputs(payload.inputs);
  const showInputLegend = inputs.length > 1;
  const traces: PlotTraceDto[] = [];
  const temperatureDisplayUnits = fieldMetaByKey[FieldKey.DryBulbTemperature].displayUnits[unitSystem];

  const activeInputPayload = (payload.inputs[chartSource?.baselineInputId as InputIdType] || inputs[0]?.payload);
  if (activeInputPayload) {
    const xPoints = 100;
    const yPoints = 100;
    const xValuesSi: number[] = [];
    const yValuesSi: number[] = [];
    for (let i = 0; i < xPoints; i++) xValuesSi.push(10 + (40 - 10) * (i / (xPoints - 1)));
    for (let i = 0; i < yPoints; i++) yValuesSi.push(0 + (100 - 0) * (i / (yPoints - 1)));

    const zValues: number[][] = [];
    const textValues: string[][] = [];
    for (let i = 0; i < yPoints; i++) {
      const row: number[] = [];
      const textRow: string[] = [];
      const rh = yValuesSi[i];
      for (let j = 0; j < xPoints; j++) {
        const tdb = xValuesSi[j];
        const effectiveRh = Math.min(100, Math.max(0, rh));
        try {
          const pmvResult = pmv_ppd(tdb, activeInputPayload.tr, activeInputPayload.vr, effectiveRh, activeInputPayload.met, activeInputPayload.clo, activeInputPayload.wme, "ASHRAE", { limit_inputs: false });
          row.push(pmvResult.pmv);
          textRow.push(getPmvZoneName(pmvResult.pmv));
        } catch {
          row.push(NaN);
          textRow.push("");
        }
      }
      zValues.push(row);
      textValues.push(textRow);
    }
    
    const displayXValues = xValuesSi.map(x => convertFieldValueFromSi(FieldKey.DryBulbTemperature, x, unitSystem));
    const displayYValues = yValuesSi; // RH is always %
    
    traces.push(buildContourTrace({
      name: "PMV Zones",
      x: displayXValues,
      y: displayYValues,
      z: zValues,
      text: textValues,
      colorscale: PMV_COLORSCALE,
      contours: PMV_CONTOURS,
      // Only show PMV values between -3.5 and 3.5
      zmin: -3.5,
      zmax: 3.5,
      hovertemplate: `Tdb: %{x:.1f} ${temperatureDisplayUnits}<br>RH: %{y:.0f}%<br><b>Zone: %{text}</b><br>PMV: %{z:.2f}<extra></extra>`,
    }));
  }

  inputs.forEach(({ inputId, payload: inputPayload }) => {
    traces.push(buildInputScatterTrace({
      inputId,
      x: roundValue(convertFieldValueFromSi(FieldKey.DryBulbTemperature, inputPayload.tdb, unitSystem)),
      y: roundValue(inputPayload.rh),
      showLegend: showInputLegend,
      hovertemplate: `${inputDisplayMetaById[inputId]?.label ?? "Input"}<br>Tdb %{x:.1f} ${temperatureDisplayUnits}<br>RH %{y:.0f}%<extra></extra>`,
    }));
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
        title: `Dry bulb temperature (${temperatureDisplayUnits})`,
        range: [
          convertFieldValueFromSi(FieldKey.DryBulbTemperature, 10, unitSystem),
          convertFieldValueFromSi(FieldKey.DryBulbTemperature, 40, unitSystem),
        ],
        gridcolor: "#e2e8f0",
      },
      yaxis: {
        title: "Relative humidity (%)",
        range: [0, 100],
        gridcolor: "#e2e8f0",
      },
      legend: { orientation: "h", x: 0, y: 1.1 },
      height: 480,
    },
    annotations: [],
    source: CalculationSource.FrontendGenerated,
  };
}

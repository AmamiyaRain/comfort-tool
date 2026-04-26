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
} from "../../../models/comfortDtos";
import {
  convertFieldValueFromSi,
  convertHumidityRatioFromSi,
  getHumidityRatioDisplayMeta,
} from "../../units";
import { calculateComfortZone } from "../comfortZone";
import {
  ensureFiniteValue,
  getCompareInputs,
  roundValue,
  type ComfortZonesByInput,
} from "../helpers";
import { psy_ta_rh } from "jsthermalcomfort/lib/esm/psychrometrics/psy_ta_rh.js";
import { buildComfortPolygonTrace, buildInputScatterTrace, buildLineTrace } from "./plotlyBuilders";

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
 * Calculates the humidity ratio (absolute humidity) in SI units (kg/kg) from air temperature and relative humidity.
 *
 * @param temperature Air temperature in Celsius.
 * @param relativeHumidity Relative humidity in percent.
 * @returns Humidity ratio in kg/kg, or NaN if calculation fails.
 */
function getHumidityRatioSi(
  temperature: number,
  relativeHumidity: number,
): number {
  return ensureFiniteValue(
    "Humidity ratio",
    psy_ta_rh(temperature, relativeHumidity).hr,
  );
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
  return convertHumidityRatioFromSi(getHumidityRatioSi(temperature, relativeHumidity), unitSystem);
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

  // Generate relative humidity (RH) curves.
  payload.rhCurves.forEach((relativeHumidity) => {
    // X-axis values.
    const xValues: number[] = [];
    // Y-axis values.
    const yValues: number[] = [];
    // Generate the curve for the current relative humidity.
    temperatures.forEach((temperature) => {
      const humidityRatioSi = getHumidityRatioSi(temperature, relativeHumidity);
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

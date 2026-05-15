/**
 * @file heatIndex.ts
 * @description Configuration and calculation service for the Heat Index comfort model.
 */

import { heat_index } from "jsthermalcomfort";
import { CalculationSource } from "../models/calculationMetadata";
import { ComfortModel } from "../models/comfortModels";
import { ChartId } from "../models/chartOptions";
import { FieldKey } from "../models/fieldKeys";
import { fieldMetaByKey } from "../models/inputFieldsMeta";
import { InputControlId } from "../models/inputControls";
import { ThermalZone } from "../models/thermalZone";
import type { UnitSystem } from "../models/units";
import type { InputId as InputIdType } from "../models/inputSlots";
import type { CompareInputMap, PlotlyChartResponseDto } from "../models/comfortDtos";
import { createControlBehavior } from "../services/comfort/controls/controlBehaviors";
import { ensureFiniteValue, getHeatIndexCategory, heatIndexZones, HI_CAUTION, HI_EXTREME_CAUTION, HI_DANGER, HI_EXTREME_DANGER } from "../services/comfort/helpers";
import { convertFieldValueToSi, convertFieldValueFromSi, formatDisplayValue } from "../services/units/index";
import { ComfortModelBuilder, isRecord, createEmptyResults, buildResultSection } from "../state/comfortTool/modelConfigs/builder";
import { buildGenericHeatmapRangeChart, buildGenericDynamicHeatmapChart } from "../services/comfort/charts/sharedCharts";
import { roundValue } from "../services/comfort/helpers";

// DTOs for the Heat Index model
export interface HeatIndexRequestDto {
  tdb: number;
  rh: number;
  units: UnitSystem;
}

export interface HeatIndexResponseDto {
  hi: number;
  category: string;
  source: CalculationSource;
}

export interface HeatIndexChartInputsRequestDto {
  inputs: CompareInputMap<HeatIndexRequestDto>;
}

export interface HeatIndexChartSourceDto {
  chartRequest: HeatIndexChartInputsRequestDto;
  dynamicXAxis?: FieldKey;
  dynamicYAxis?: FieldKey;
}

/**
 * Calculates the Heat Index and resolves its associated risk category.
 * @param payload The standardized request inputs.
 * @returns An object containing the calculated Heat Index in SI units and its category.
 */
export function calculateHeatIndex(payload: HeatIndexRequestDto): HeatIndexResponseDto {
  // Compute Heat Index using jsthermalcomfort engine
  const result = heat_index(payload.tdb, payload.rh, { units: payload.units, round: true });
  
  // The Rothfusz regression is only valid above 27°C (80.6°F), returning NaN below this threshold.
  // As such, in cooler conditions, the apparent temperature will fall back to the ambient dry bulb temperature.
  const rawHiSi = convertFieldValueToSi(FieldKey.DryBulbTemperature, result.hi, payload.units);
  const tdbSi = convertFieldValueToSi(FieldKey.DryBulbTemperature, payload.tdb, payload.units);
  // If the raw Heat Index is NaN, use the dry bulb temperature
  const hiSi = isNaN(rawHiSi) ? tdbSi : rawHiSi;
  const category = getHeatIndexCategory(hiSi);

  return {
    hi: hiSi,
    category,
    source: CalculationSource.JsThermalComfort,
  };
}

/**
 * Extracts calculation inputs from UI state for a specific input slot.
 */
function toHeatIndexRequest(state: any, inputId: InputIdType): HeatIndexRequestDto {
  const inputs = state.inputsByInput[inputId];
  return {
    tdb: Number(inputs[FieldKey.DryBulbTemperature]),
    rh: Number(inputs[FieldKey.RelativeHumidity]),
    units: "SI" as const,
  };
}

/**
 * Normalizes external model options safely by returning an empty object if the input is a record, otherwise returns default if not a record.
 */
function normalizeOptions(value: unknown) {
  return isRecord(value) ? value : {};
}

// ── Thermal Zones Definition ─────────────────────────────────────────────────

const heatIndexZonesList = [
  new ThermalZone({ label: "Safe", max: 27, color: "#e2e8f0" }),
  new ThermalZone({ label: "Caution", min: 27, max: 32, color: "#fef08a" }),
  new ThermalZone({ label: "Extreme Caution", min: 32, max: 39, color: "#fde047" }),
  new ThermalZone({ label: "Danger", min: 39, max: 51, color: "#f97316" }),
  new ThermalZone({ label: "Extreme Danger", min: 51, color: "#dc2626" }),
];

// ── Model Configuration Builder ──────────────────────────────────────────────

const heatIndexBuilder = new ComfortModelBuilder<HeatIndexResponseDto, HeatIndexChartSourceDto>(ComfortModel.HeatIndex);


/**
* Registers dropdown metadata for the Heat Index model.
*/
heatIndexBuilder
  .setLabel("Heat Index")
  .setDescription("Combines air temperature and relative humidity to determine the human-perceived equivalent temperature.");

/**
* Registers UI controls for the Heat Index model.
*/
heatIndexBuilder.addControl({
  id: InputControlId.Temperature,
  behavior: createControlBehavior({
    controlId: InputControlId.Temperature,
    fieldKey: FieldKey.DryBulbTemperature,
    // The Rothfusz regression for Heat Index is typically valid for temperatures above 26.7 °C (80 °F).
    minValue: 20,
    maxValue: 50,
  }),
});

heatIndexBuilder.addControl({
  id: InputControlId.Humidity,
  behavior: createControlBehavior({
    controlId: InputControlId.Humidity,
    fieldKey: FieldKey.RelativeHumidity,
  }),
});

/**
 * Registers the calculation logic for the Heat Index model.
 */
heatIndexBuilder.setCalculator((state, visibleInputIds) => {
  const resultsByInput = createEmptyResults<HeatIndexResponseDto>();
  const chartInputs: CompareInputMap<HeatIndexRequestDto> = {};

  visibleInputIds.forEach((inputId) => {
    const request = toHeatIndexRequest(state, inputId);
    resultsByInput[inputId] = calculateHeatIndex(request);
    chartInputs[inputId] = request;
  });

  return {
    resultsByInput,
    chartSource: {
      chartRequest: { inputs: chartInputs },
      dynamicXAxis: state.ui.dynamicXAxis,
      dynamicYAxis: state.ui.dynamicYAxis,
    },
  };
});

heatIndexBuilder.setResultBuilder((results, visibleInputIds, unitSystem) => {
  const temperatureUnits = fieldMetaByKey[FieldKey.DryBulbTemperature].displayUnits[unitSystem];
  return [
    buildResultSection("Heat Index", results, visibleInputIds, (result) => {
      const displayValue = convertFieldValueFromSi(FieldKey.DryBulbTemperature, result.hi, unitSystem);
      const formattedValue = formatDisplayValue(displayValue, fieldMetaByKey[FieldKey.DryBulbTemperature].decimals);

      let tone: any = "default";
      if (result.category === "Extreme Danger") tone = "hiExtremeDanger";
      else if (result.category === "Danger") tone = "hiDanger";
      else if (result.category === "Extreme Caution") tone = "hiExtremeCaution";
      else if (result.category === "Caution") tone = "hiCaution";

      return {
        text: `${formattedValue} ${temperatureUnits}`,
        subtext: result.category,
        tone,
      };
    }),
  ];
});

/**
 * Registers the chart building logic for the Heat Index model.
 */
heatIndexBuilder.setChartBuilder((chartId, chartSource, resultsByInput, unitSystem) => {
  if (!chartSource) return null;
  // Safely cast chartRequest to the shared structure expected by the underlying Plotly renderer
  const sharedChartRequest = chartSource.chartRequest as any;

  // Dynamic heat map chart builder
  if (chartId === ChartId.HeatIndexDynamic) {
    return buildGenericDynamicHeatmapChart(
      sharedChartRequest,
      resultsByInput,
      unitSystem,
      chartSource.dynamicXAxis as FieldKey,
      chartSource.dynamicYAxis as FieldKey,
      {
        title: "Heat Index Dynamic Chart",
        zMax: 4,
        colorscale: [
          [0, heatIndexZones[0].color], [0.2, heatIndexZones[0].color],
          [0.2, heatIndexZones[1].color], [0.4, heatIndexZones[1].color],
          [0.4, heatIndexZones[2].color], [0.6, heatIndexZones[2].color],
          [0.6, heatIndexZones[3].color], [0.8, heatIndexZones[3].color],
          [0.8, heatIndexZones[4].color], [1, heatIndexZones[4].color]
        ],
        getRange: (key: FieldKey) => {
          if (key === FieldKey.DryBulbTemperature) return { min: 20, max: 50 };
          if (key === FieldKey.RelativeHumidity) return { min: 0, max: 100 };
          return { min: 0, max: 100 };
        },
        calculatePoint: (xSi, ySi, dynamicXAxis, dynamicYAxis) => {
          const calcPayload: any = { units: "SI", tdb: 25, rh: 50 };
          if (dynamicXAxis === FieldKey.DryBulbTemperature) calcPayload.tdb = xSi;
          if (dynamicYAxis === FieldKey.DryBulbTemperature) calcPayload.tdb = ySi;
          if (dynamicXAxis === FieldKey.RelativeHumidity) calcPayload.rh = xSi;
          if (dynamicYAxis === FieldKey.RelativeHumidity) calcPayload.rh = ySi;

          const res = heat_index(calcPayload.tdb, calcPayload.rh, { round: true, units: "SI" });
          const hi = res.hi;
          let rangeValue = 0;
          if (hi >= HI_EXTREME_DANGER) rangeValue = 4;
          else if (hi >= HI_DANGER) rangeValue = 3;
          else if (hi >= HI_EXTREME_CAUTION) rangeValue = 2;
          else if (hi >= HI_CAUTION) rangeValue = 1;
          
          return { rangeValue, category: getHeatIndexCategory(hi) };
        },
        getHovertemplateScatter: (label, cached) => `${label}<br>${fieldMetaByKey[chartSource.dynamicXAxis as FieldKey]?.label}: %{x:.1f}<br>${fieldMetaByKey[chartSource.dynamicYAxis as FieldKey]?.label}: %{y:.1f}<br><b>Category: ${cached?.category || ""}</b><br>Heat Index: ${roundValue(convertFieldValueFromSi(FieldKey.DryBulbTemperature, cached?.hi, unitSystem), 1)}${fieldMetaByKey[FieldKey.DryBulbTemperature].displayUnits[unitSystem]}<extra></extra>`
      }
    );
  }

  return buildGenericHeatmapRangeChart(sharedChartRequest, resultsByInput, unitSystem, {
    title: "Heat Index Ranges",
    xKey: FieldKey.RelativeHumidity,
    yKey: FieldKey.DryBulbTemperature,
    xRangeSi: { min: 0, max: 100 },
    yRangeSi: { min: 20, max: 50 },
    zMax: 4,
    colorscale: [
      [0, heatIndexZones[0].color], [0.2, heatIndexZones[0].color],
      [0.2, heatIndexZones[1].color], [0.4, heatIndexZones[1].color],
      [0.4, heatIndexZones[2].color], [0.6, heatIndexZones[2].color],
      [0.6, heatIndexZones[3].color], [0.8, heatIndexZones[3].color],
      [0.8, heatIndexZones[4].color], [1, heatIndexZones[4].color]
    ],
    hovertemplateContour: `${fieldMetaByKey[FieldKey.RelativeHumidity].label}: %{x:.1f}%<br>${fieldMetaByKey[FieldKey.DryBulbTemperature].label}: %{y:.1f}${fieldMetaByKey[FieldKey.DryBulbTemperature].displayUnits[unitSystem]}<br><b>Category: %{text}</b><extra></extra>`,
    getHovertemplateScatter: (label, cached) => `${label}<br>${fieldMetaByKey[FieldKey.RelativeHumidity].label}: %{x:.1f}%<br>${fieldMetaByKey[FieldKey.DryBulbTemperature].label}: %{y:.1f}${fieldMetaByKey[FieldKey.DryBulbTemperature].displayUnits[unitSystem]}<br><b>Category: ${cached?.category || ""}</b><br>Heat Index: ${roundValue(convertFieldValueFromSi(FieldKey.DryBulbTemperature, cached?.hi, unitSystem), 1)}${fieldMetaByKey[FieldKey.DryBulbTemperature].displayUnits[unitSystem]}<extra></extra>`,
    getScatterXSi: (p) => p.rh,
    getScatterYSi: (p) => p.tdb,
    calculatePoint: (xSi, ySi) => {
      const result = heat_index(ySi, xSi, { round: true, units: "SI" });
      const hi = result.hi;
      let rangeValue = 0;
      if (hi >= HI_EXTREME_DANGER) rangeValue = 4;
      else if (hi >= HI_DANGER) rangeValue = 3;
      else if (hi >= HI_EXTREME_CAUTION) rangeValue = 2;
      else if (hi >= HI_CAUTION) rangeValue = 1;
      return { rangeValue, category: getHeatIndexCategory(hi) };
    }
  });
});

/**
 * Registers default chart IDs, dynamic axis fields, and default options for the Heat Index model.
 */
heatIndexBuilder.setDefaultChart(ChartId.HeatIndexRanges, [ChartId.HeatIndexRanges, ChartId.HeatIndexDynamic]);
heatIndexBuilder.setDynamicAxisFields([FieldKey.DryBulbTemperature, FieldKey.RelativeHumidity]);
heatIndexBuilder.setDefaultOptions({});
heatIndexBuilder.setOptionNormalizer(normalizeOptions);
heatIndexBuilder.setZones(heatIndexZonesList);

/**
 * Registers color tones for the Heat Index model.
 */
heatIndexBuilder.setToneToClass({
  hiNoticeable: "text-yellow-400",
  hiCaution: "text-yellow-500",
  hiExtremeCaution: "text-yellow-600",
  hiDanger: "text-orange-500",
  hiExtremeDanger: "text-red-600",
});

/**
 * Builds the final Heat Index model configuration.
 */
export const heatIndexModelConfig = heatIndexBuilder.build();

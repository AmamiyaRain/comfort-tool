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
import { ensureFiniteValue, getHeatIndexCategory } from "../services/comfort/helpers";
import { convertFieldValueToSi, convertFieldValueFromSi, formatDisplayValue } from "../services/units/index";
import { ComfortModelBuilder, isRecord, createEmptyResults, buildResultSection } from "../state/comfortTool/modelConfigs/builder";
import { buildHeatIndexRangesChart, buildThermalIndicesDynamicChart } from "../services/comfort/charts/thermalIndicesCharts";

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
  
  // Categorization expects Celsius values internally
  const hiSi = convertFieldValueToSi(FieldKey.DryBulbTemperature, result.hi, payload.units);
  const category = getHeatIndexCategory(hiSi);

  return {
    hi: ensureFiniteValue("Heat Index", hiSi),
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

  if (chartId === ChartId.HeatIndexDynamic) {
    return buildThermalIndicesDynamicChart(
      ComfortModel.HeatIndex,
      sharedChartRequest,
      resultsByInput,
      unitSystem,
      chartSource.dynamicXAxis,
      chartSource.dynamicYAxis
    );
  }
  return buildHeatIndexRangesChart(sharedChartRequest, resultsByInput, unitSystem);
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

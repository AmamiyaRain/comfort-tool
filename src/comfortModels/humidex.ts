/**
 * @file humidex.ts
 * @description Configuration and calculation service for the Humidex comfort model.
 */

import { humidex } from "jsthermalcomfort";
import { CalculationSource } from "../models/calculationMetadata";
import { ComfortModel } from "../models/comfortModels";
import { ChartId } from "../models/chartOptions";
import { FieldKey } from "../models/fieldKeys";
import { fieldMetaByKey } from "../models/inputFieldsMeta";
import { InputControlId } from "../models/inputControls";
import { ThermalZone } from "../models/thermalZone";
import type { UnitSystem } from "../models/units";
import type { InputId as InputIdType } from "../models/inputSlots";
import type { CompareInputMap } from "../models/comfortDtos";
import { createControlBehavior } from "../services/comfort/controls/controlBehaviors";
import {
  getHumidexDiscomfort,
  humidexZones,
  HUMIDEX_NOTICEABLE,
  HUMIDEX_EVIDENT,
  HUMIDEX_INTENSE,
  HUMIDEX_DANGEROUS,
  HUMIDEX_STROKE_PROBABLE,
  roundValue,
} from "../services/comfort/helpers";
import { buildGenericHeatmapRangeChart, buildGenericDynamicHeatmapChart } from "../services/comfort/charts/sharedCharts";
import { formatDisplayValue } from "../services/units/index";
import { ComfortModelBuilder, isRecord, createEmptyResults, buildResultSection } from "../state/comfortTool/modelConfigs/builder";


// DTOs for the Humidex model
export interface HumidexRequestDto {
  tdb: number;
  rh: number;
  units: UnitSystem;
}

export interface HumidexResponseDto {
  humidex: number;
  humidexDiscomfort: string;
  source: CalculationSource;
}

export interface HumidexChartInputsRequestDto {
  inputs: CompareInputMap<HumidexRequestDto>;
}

export interface HumidexChartSourceDto {
  chartRequest: HumidexChartInputsRequestDto;
  dynamicXAxis?: FieldKey;
  dynamicYAxis?: FieldKey;
}

/**
 * Calculates the Humidex and resolves its associated discomfort category.
 * @param payload The standardized request inputs.
 * @returns An object containing the calculated Humidex and its category.
 */
export function calculateHumidex(payload: HumidexRequestDto): HumidexResponseDto {
  const result = humidex(payload.tdb, payload.rh, { round: true });
  const h = result.humidex;
  const humidexDiscomfort = getHumidexDiscomfort(h);

  return {
    humidex: h,
    humidexDiscomfort,
    source: CalculationSource.JsThermalComfort,
  };
}

/**
 * Extracts calculation inputs from UI state for a specific input slot.
 */
function toHumidexRequest(state: any, inputId: InputIdType): HumidexRequestDto {
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

const humidexZonesList = [
  new ThermalZone({ label: "Little/None", max: 30, color: "#e2e8f0" }),
  new ThermalZone({ label: "Noticeable", min: 30, max: 35, color: "#fef08a" }),
  new ThermalZone({ label: "Evident", min: 35, max: 40, color: "#fde047" }),
  new ThermalZone({ label: "Intense", min: 40, max: 45, color: "#facc15" }),
  new ThermalZone({ label: "Dangerous", min: 45, max: 54, color: "#f97316" }),
  new ThermalZone({ label: "Stroke Probable", min: 54, color: "#dc2626" }),
];

// ── Model Configuration Builder ──────────────────────────────────────────────

const humidexBuilder = new ComfortModelBuilder<HumidexResponseDto, HumidexChartSourceDto>(ComfortModel.Humidex);

/**
 * Registers dropdown metadata for the Humidex model.
 */
humidexBuilder
  .setLabel("Humidex")
  .setDescription("Used by Canadian meteorologists to describe how hot, humid weather feels to the average person.");

/**
 * Registers UI controls for the Humidex model.
 */
humidexBuilder.addControl({
  id: InputControlId.Temperature,
  behavior: createControlBehavior({
    controlId: InputControlId.Temperature,
    fieldKey: FieldKey.DryBulbTemperature,
  }),
});

humidexBuilder.addControl({
  id: InputControlId.Humidity,
  behavior: createControlBehavior({
    controlId: InputControlId.Humidity,
    fieldKey: FieldKey.RelativeHumidity,
  }),
});

/**
 * Registers the calculation logic for the Humidex model.
 */
humidexBuilder.setCalculator((state, visibleInputIds) => {
  const resultsByInput = createEmptyResults<HumidexResponseDto>();
  const chartInputs: CompareInputMap<HumidexRequestDto> = {};

  visibleInputIds.forEach((inputId) => {
    const request = toHumidexRequest(state, inputId);
    resultsByInput[inputId] = calculateHumidex(request);
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

humidexBuilder.setResultBuilder((results, visibleInputIds) => {
  return [
    buildResultSection("Humidex", results, visibleInputIds, (result) => {
      if (!result.humidex) return null;
      const formattedValue = formatDisplayValue(result.humidex, 1);

      let tone: any = "default";
      const h = result.humidex;
      if (h >= HUMIDEX_STROKE_PROBABLE) tone = "hiExtremeDanger";
      else if (h >= HUMIDEX_DANGEROUS) tone = "hiDanger";
      else if (h >= HUMIDEX_INTENSE) tone = "hiExtremeCaution";
      else if (h >= HUMIDEX_EVIDENT) tone = "hiCaution";
      else if (h >= HUMIDEX_NOTICEABLE) tone = "hiNoticeable";

      return {
        text: `${formattedValue}`,
        subtext: result.humidexDiscomfort,
        tone,
      };
    }),
  ];
});

/**
 * Registers the chart building logic for the Humidex model.
 */
humidexBuilder.setChartBuilder((chartId, chartSource, resultsByInput, unitSystem) => {
  if (!chartSource) return null;
  const sharedChartRequest = chartSource.chartRequest as any;

  if (chartId === ChartId.HumidexDynamic) {
    return buildGenericDynamicHeatmapChart(
      sharedChartRequest,
      resultsByInput,
      unitSystem,
      chartSource.dynamicXAxis as FieldKey,
      chartSource.dynamicYAxis as FieldKey,
      {
        title: "Humidex Dynamic Chart",
        zMax: 5,
        colorscale: [
          [0, humidexZones[0].color], [0.166, humidexZones[0].color],
          [0.166, humidexZones[1].color], [0.333, humidexZones[1].color],
          [0.333, humidexZones[2].color], [0.5, humidexZones[2].color],
          [0.5, humidexZones[3].color], [0.666, humidexZones[3].color],
          [0.666, humidexZones[4].color], [0.833, humidexZones[4].color],
          [0.833, humidexZones[5].color], [1, humidexZones[5].color]
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

          const res = humidex(calcPayload.tdb, calcPayload.rh, { round: true });
          const h = res.humidex;
          let rangeValue = 0;
          if (h >= HUMIDEX_STROKE_PROBABLE) rangeValue = 5;
          else if (h >= HUMIDEX_DANGEROUS) rangeValue = 4;
          else if (h >= HUMIDEX_INTENSE) rangeValue = 3;
          else if (h >= HUMIDEX_EVIDENT) rangeValue = 2;
          else if (h >= HUMIDEX_NOTICEABLE) rangeValue = 1;
          
          return { rangeValue, category: getHumidexDiscomfort(h) };
        },
        getHovertemplateScatter: (label, cached) => `${label}<br>${fieldMetaByKey[chartSource.dynamicXAxis as FieldKey]?.label}: %{x:.1f}<br>${fieldMetaByKey[chartSource.dynamicYAxis as FieldKey]?.label}: %{y:.1f}<br><b>Discomfort: ${cached?.category || ""}</b><br>Humidex: ${roundValue(cached?.humidex, 1)}<extra></extra>`
      }
    );
  }

  return buildGenericHeatmapRangeChart(sharedChartRequest, resultsByInput, unitSystem, {
    title: "Humidex Discomfort",
    xKey: FieldKey.RelativeHumidity,
    yKey: FieldKey.DryBulbTemperature,
    xRangeSi: { min: 0, max: 100 },
    yRangeSi: { min: 20, max: 50 },
    zMax: 5,
    colorscale: [
      [0, humidexZones[0].color], [0.166, humidexZones[0].color],
      [0.166, humidexZones[1].color], [0.333, humidexZones[1].color],
      [0.333, humidexZones[2].color], [0.5, humidexZones[2].color],
      [0.5, humidexZones[3].color], [0.666, humidexZones[3].color],
      [0.666, humidexZones[4].color], [0.833, humidexZones[4].color],
      [0.833, humidexZones[5].color], [1, humidexZones[5].color]
    ],
    hovertemplateContour: `${fieldMetaByKey[FieldKey.RelativeHumidity].label}: %{x:.1f}%<br>${fieldMetaByKey[FieldKey.DryBulbTemperature].label}: %{y:.1f}${fieldMetaByKey[FieldKey.DryBulbTemperature].displayUnits[unitSystem]}<br><b>Discomfort: %{text}</b><extra></extra>`,
    getHovertemplateScatter: (label, cached) => `${label}<br>${fieldMetaByKey[FieldKey.RelativeHumidity].label}: %{x:.1f}%<br>${fieldMetaByKey[FieldKey.DryBulbTemperature].label}: %{y:.1f}${fieldMetaByKey[FieldKey.DryBulbTemperature].displayUnits[unitSystem]}<br><b>Discomfort: ${cached?.category || ""}</b><br>Humidex: ${roundValue(cached?.humidex, 1)}<extra></extra>`,
    getScatterXSi: (p) => p.rh,
    getScatterYSi: (p) => p.tdb,
    calculatePoint: (xSi, ySi) => {
      const result = humidex(ySi, xSi, { round: true });
      const h = result.humidex;
      let rangeValue = 0;
      if (h >= HUMIDEX_STROKE_PROBABLE) rangeValue = 5;
      else if (h >= HUMIDEX_DANGEROUS) rangeValue = 4;
      else if (h >= HUMIDEX_INTENSE) rangeValue = 3;
      else if (h >= HUMIDEX_EVIDENT) rangeValue = 2;
      else if (h >= HUMIDEX_NOTICEABLE) rangeValue = 1;
      return { rangeValue, category: getHumidexDiscomfort(h) };
    }
  });
});

/**
 * Registers default chart IDs, dynamic axis fields, and default options for the Humidex model.
 */
humidexBuilder.setDefaultChart(ChartId.Humidex, [ChartId.Humidex, ChartId.HumidexDynamic]);
humidexBuilder.setDynamicAxisFields([FieldKey.DryBulbTemperature, FieldKey.RelativeHumidity]);
humidexBuilder.setDefaultOptions({});
humidexBuilder.setOptionNormalizer(normalizeOptions);
humidexBuilder.setZones(humidexZonesList);

/**
 * Registers color tones for the Humidex model.
 */
humidexBuilder.setToneToClass({
  hiNoticeable: "text-yellow-400",
  hiCaution: "text-yellow-500",
  hiExtremeCaution: "text-yellow-600",
  hiDanger: "text-orange-500",
  hiExtremeDanger: "text-red-600",
});

/**
 * Builds the final Humidex model configuration.
 */
export const humidexModelConfig = humidexBuilder.build();

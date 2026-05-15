/**
 * @file windChill.ts
 * @description Configuration and calculation service for the Wind Chill comfort model.
 */

import { wc } from "jsthermalcomfort";
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
import { buildDefaultPresentation, createControlBehavior, createTemperatureControlBehavior } from "../services/comfort/controls/controlBehaviors";
import { getWindChillZone, windChillZones, WCI_FROSTBITE_30, WCI_FROSTBITE_10, WCI_FROSTBITE_2, roundValue } from "../services/comfort/helpers";
import { buildGenericHeatmapRangeChart, buildGenericDynamicHeatmapChart } from "../services/comfort/charts/sharedCharts";
import { convertFieldValueFromSi, formatDisplayValue } from "../services/units/index";
import { ComfortModelBuilder, isRecord, createEmptyResults, buildResultSection } from "../state/comfortTool/modelConfigs/builder";


// DTOs for the Wind Chill model
export interface WindChillRequestDto {
  tdb: number;
  v: number;
  units: UnitSystem;
}

export interface WindChillResponseDto {
  wci: number;
  wciTemp: number;
  wciZone: string;
  source: CalculationSource;
}

export interface WindChillChartInputsRequestDto {
  inputs: CompareInputMap<WindChillRequestDto>;
}

export interface WindChillChartSourceDto {
  chartRequest: WindChillChartInputsRequestDto;
  dynamicXAxis?: FieldKey;
  dynamicYAxis?: FieldKey;
}

/**
 * Calculates the Wind Chill Index, equivalent temperature, and resolves its frostbite zone.
 * @param payload The standardized request inputs.
 * @returns An object containing the calculated Wind Chill values and risk zone.
 */
export function calculateWindChill(payload: WindChillRequestDto): WindChillResponseDto {
  const tdbSi = payload.tdb;
  const vSi = payload.v;

  // Calculate Wind Chill Index using jsthermalcomfort engine
  const wcResult = wc(tdbSi, vSi, { round: true });
  const wci = wcResult.wci;

  // Calculate equivalent Wind Chill Temperature using formula
  // Only applied if wind speed is greater than 1.33 m/s and temperature is less than or equal to 10 Celsius
  let wciTemp: number | undefined = undefined;
  if (vSi > 1.33 && tdbSi <= 10) {
    wciTemp = 13.12 + 0.6215 * tdbSi - 13.95 * Math.pow(vSi, 0.16) + 0.486 * tdbSi * Math.pow(vSi, 0.16);
  } else {
    wciTemp = tdbSi;
  }

  const wciZone = getWindChillZone(wci);

  return {
    wci,
    wciTemp,
    wciZone,
    source: CalculationSource.JsThermalComfort,
  };
}

/**
 * Extracts calculation inputs from UI state for a specific input slot.
 */
function toWindChillRequest(state: any, inputId: InputIdType): WindChillRequestDto {
  const inputs = state.inputsByInput[inputId];
  const v = inputs[FieldKey.WindSpeed] !== undefined 
    ? Number(inputs[FieldKey.WindSpeed]) 
    : Number(inputs[FieldKey.RelativeAirSpeed]);
    
  return {
    tdb: Number(inputs[FieldKey.DryBulbTemperature]),
    v: isNaN(v) ? 0.1 : v,
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

const windChillZonesList = [
  new ThermalZone({ label: "Safe", max: WCI_FROSTBITE_30, color: "#e0f2fe" }),
  new ThermalZone({ label: "30 mins to frostbite", min: WCI_FROSTBITE_30, max: WCI_FROSTBITE_10, color: "#64b5f5" }),
  new ThermalZone({ label: "10 mins to frostbite", min: WCI_FROSTBITE_10, max: WCI_FROSTBITE_2, color: "#5c6bc0" }),
  new ThermalZone({ label: "2 mins to frostbite", min: WCI_FROSTBITE_2, color: "#8e24aa" }),
];

// ── Model Configuration Builder ──────────────────────────────────────────────

const windChillBuilder = new ComfortModelBuilder<WindChillResponseDto, WindChillChartSourceDto>(ComfortModel.WindChill);

/**
 * Registers dropdown metadata for the Wind Chill model.
 */
windChillBuilder
  .setLabel("Wind Chill")
  .setDescription("Measures the rate of heat loss from exposed skin caused by wind and cold.");

/**
 * Registers UI controls for the Wind Chill model.
 */
windChillBuilder.addControl({
  id: InputControlId.Temperature,
  behavior: createTemperatureControlBehavior(InputControlId.Temperature, {
    // Wind Chill is only valid for cold temperatures (typically below 0 °C / 32 °F).
    minValue: -45,
    maxValue: 0,
  }),
});

windChillBuilder.addControl({
  id: InputControlId.WindSpeed,
  behavior: createControlBehavior({
    controlId: InputControlId.WindSpeed,
    fieldKey: FieldKey.WindSpeed,
    // Wind Chill calculations are typically valid for wind speeds between 1.3 m/s and 20 m/s.
    minValue: 1,
    maxValue: 20,
    getPresentation: (context, meta) => {
      const presentation = buildDefaultPresentation(context, meta, {
        minValue: 1,
        maxValue: 20,
      });
      presentation.step = 1;
      presentation.decimals = 0;
      return presentation;
    },
  }),
});

/**
 * Registers the calculation logic for the Wind Chill model.
 */
windChillBuilder.setCalculator((state, visibleInputIds) => {
  const resultsByInput = createEmptyResults<WindChillResponseDto>();
  const chartInputs: CompareInputMap<WindChillRequestDto> = {};

  visibleInputIds.forEach((inputId) => {
    const request = toWindChillRequest(state, inputId);
    resultsByInput[inputId] = calculateWindChill(request);
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

windChillBuilder.setResultBuilder((results, visibleInputIds, unitSystem) => {
  const temperatureUnits = fieldMetaByKey[FieldKey.DryBulbTemperature].displayUnits[unitSystem];
  return [
    buildResultSection("Wind Chill Index", results, visibleInputIds, (result) => {
      if (result.wci === undefined) return null;
      const formattedValue = formatDisplayValue(result.wci, 0);

      let tone: any = "default";
      if (result.wciZone === "2 mins to frostbite") tone = "wc2min";
      else if (result.wciZone === "10 mins to frostbite") tone = "wc10min";
      else if (result.wciZone === "30 mins to frostbite") tone = "wc30min";

      return {
        text: `${formattedValue} W/m²`,
        subtext: result.wciZone,
        tone,
      };
    }),
    buildResultSection("Wind Chill Temperature", results, visibleInputIds, (result) => {
      if (result.wciTemp === undefined) return null;
      const displayValue = convertFieldValueFromSi(FieldKey.DryBulbTemperature, result.wciTemp, unitSystem);
      const formattedValue = formatDisplayValue(displayValue, 1);

      let tone: any = "default";
      if (result.wciZone === "2 mins to frostbite") tone = "wc2min";
      else if (result.wciZone === "10 mins to frostbite") tone = "wc10min";
      else if (result.wciZone === "30 mins to frostbite") tone = "wc30min";

      return {
        text: `${formattedValue} ${temperatureUnits}`,
        tone,
      };
    }),
  ];
});

/**
 * Registers the chart building logic for the Wind Chill model.
 */
windChillBuilder.setChartBuilder((chartId, chartSource, resultsByInput, unitSystem) => {
  if (!chartSource) return null;
  const sharedChartRequest = chartSource.chartRequest as any;

  if (chartId === ChartId.WindChillDynamic) {
    return buildGenericDynamicHeatmapChart(
      sharedChartRequest,
      resultsByInput,
      unitSystem,
      chartSource.dynamicXAxis as FieldKey,
      chartSource.dynamicYAxis as FieldKey,
      {
        title: "Wind Chill Dynamic Chart",
        zMax: 3,
        colorscale: [
          [0, windChillZones[0].color], [0.25, windChillZones[0].color],
          [0.25, windChillZones[1].color], [0.5, windChillZones[1].color],
          [0.5, windChillZones[2].color], [0.75, windChillZones[2].color],
          [0.75, windChillZones[3].color], [1, windChillZones[3].color]
        ],
        getRange: (key: FieldKey) => {
          if (key === FieldKey.DryBulbTemperature) return { min: -45, max: 0 };
          if (key === FieldKey.RelativeAirSpeed || key === FieldKey.WindSpeed) return { min: 1, max: 20 };
          return { min: 0, max: 100 };
        },
        calculatePoint: (xSi, ySi, dynamicXAxis, dynamicYAxis) => {
          const calcPayload: any = { units: "SI", tdb: -10, v: 5 };
          if (dynamicXAxis === FieldKey.DryBulbTemperature) calcPayload.tdb = xSi;
          if (dynamicYAxis === FieldKey.DryBulbTemperature) calcPayload.tdb = ySi;
          if (dynamicXAxis === FieldKey.RelativeAirSpeed || dynamicXAxis === FieldKey.WindSpeed) calcPayload.v = xSi;
          if (dynamicYAxis === FieldKey.RelativeAirSpeed || dynamicYAxis === FieldKey.WindSpeed) calcPayload.v = ySi;

          const res = wc(calcPayload.tdb, calcPayload.v, { round: true });
          const wci = res.wci;
          let rangeValue = 0;
          if (wci >= WCI_FROSTBITE_2) rangeValue = 3;
          else if (wci >= WCI_FROSTBITE_10) rangeValue = 2;
          else if (wci >= WCI_FROSTBITE_30) rangeValue = 1;
          
          return { rangeValue, category: getWindChillZone(wci) };
        },
        getHovertemplateScatter: (label, cached) => `${label}<br>${fieldMetaByKey[chartSource.dynamicXAxis as FieldKey]?.label}: %{x:.2f}<br>${fieldMetaByKey[chartSource.dynamicYAxis as FieldKey]?.label}: %{y:.2f}<br><b>Frostbite Risk: ${cached?.wciZone || ""}</b><br>Wind Chill Index: ${roundValue(cached?.wci, 0)} W/m²<br>Wind Chill Temperature: ${roundValue(convertFieldValueFromSi(FieldKey.DryBulbTemperature, cached?.wciTemp, unitSystem), 1)}${fieldMetaByKey[FieldKey.DryBulbTemperature].displayUnits[unitSystem]}<extra></extra>`
      }
    );
  }

  return buildGenericHeatmapRangeChart(sharedChartRequest, resultsByInput, unitSystem, {
    title: "Wind Chill Frostbite Risk",
    xKey: FieldKey.WindSpeed,
    yKey: FieldKey.DryBulbTemperature,
    xRangeSi: { min: 1, max: 20 },
    yRangeSi: { min: -45, max: 0 },
    zMax: 3,
    colorscale: [
      [0, windChillZones[0].color], [0.25, windChillZones[0].color],
      [0.25, windChillZones[1].color], [0.5, windChillZones[1].color],
      [0.5, windChillZones[2].color], [0.75, windChillZones[2].color],
      [0.75, windChillZones[3].color], [1, windChillZones[3].color]
    ],
    hovertemplateContour: `${fieldMetaByKey[FieldKey.WindSpeed].label}: %{x:.1f} ${fieldMetaByKey[FieldKey.WindSpeed].displayUnits[unitSystem]}<br>${fieldMetaByKey[FieldKey.DryBulbTemperature].label}: %{y:.1f}${fieldMetaByKey[FieldKey.DryBulbTemperature].displayUnits[unitSystem]}<br><b>Frostbite Risk: %{text}</b><extra></extra>`,
    getHovertemplateScatter: (label, cached) => `${label}<br>${fieldMetaByKey[FieldKey.WindSpeed].label}: %{x:.2f} ${fieldMetaByKey[FieldKey.WindSpeed].displayUnits[unitSystem]}<br>${fieldMetaByKey[FieldKey.DryBulbTemperature].label}: %{y:.1f}${fieldMetaByKey[FieldKey.DryBulbTemperature].displayUnits[unitSystem]}<br><b>Frostbite Risk: ${cached?.wciZone || ""}</b><br>Wind Chill Index: ${roundValue(cached?.wci, 0)} W/m²<br>Wind Chill Temperature: ${roundValue(convertFieldValueFromSi(FieldKey.DryBulbTemperature, cached?.wciTemp, unitSystem), 1)}${fieldMetaByKey[FieldKey.DryBulbTemperature].displayUnits[unitSystem]}<extra></extra>`,
    getScatterXSi: (p) => p.v || 0,
    getScatterYSi: (p) => p.tdb,
    calculatePoint: (xSi, ySi) => {
      const result = wc(ySi, xSi, { round: true });
      const wci = result.wci;
      let rangeValue = 0;
      if (wci >= WCI_FROSTBITE_2) rangeValue = 3;
      else if (wci >= WCI_FROSTBITE_10) rangeValue = 2;
      else if (wci >= WCI_FROSTBITE_30) rangeValue = 1;
      return { rangeValue, category: getWindChillZone(wci) };
    }
  });
});

/**
 * Registers default chart IDs, dynamic axis fields, and default options for the Wind Chill model.
 */
windChillBuilder.setDefaultChart(ChartId.WindChill, [ChartId.WindChill, ChartId.WindChillDynamic]);
windChillBuilder.setDynamicAxisFields([FieldKey.DryBulbTemperature, FieldKey.WindSpeed]);
windChillBuilder.setDefaultOptions({});
windChillBuilder.setOptionNormalizer(normalizeOptions);
windChillBuilder.setZones(windChillZonesList);

/**
 * Registers color tones for the Wind Chill model.
 */
windChillBuilder.setToneToClass({
  wc30min: "text-blue-400",
  wc10min: "text-indigo-500",
  wc2min: "text-purple-600",
});

/**
 * Builds the final Wind Chill model configuration.
 */
export const windChillModelConfig = windChillBuilder.build();

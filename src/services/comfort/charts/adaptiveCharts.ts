/**
 * Adaptive Comfort Chart Services
 * 
 * Provides functions for building Adaptive comfort model charts (ASHRAE 55 and 
 * EN 16798-1). Handles the generation of static comfort polygons and dynamic 
 * heatmaps based on prevailing outdoor conditions and indoor operative temperatures.
 */
import { t_o } from "jsthermalcomfort";
import { FieldKey } from "../../../models/fieldKeys";
import { fieldMetaByKey } from "../../../models/inputFieldsMeta";
import { CalculationSource } from "../../../models/calculationMetadata";
import { inputDisplayMetaById } from "../../../models/inputSlotPresentation";
import { UnitSystem, type UnitSystem as UnitSystemType } from "../../../models/units";
import type {
  PlotlyChartResponseDto,
  PlotTraceDto,
  AdaptiveChartInputsRequestDto,
  AdaptiveResponseDto,
} from "../../../models/comfortDtos";
import { convertFieldValueFromSi, convertFieldValueToSi } from "../../units";
import {
  getCompareInputs,
  roundValue,
  adaptiveAshraeZones,
  adaptiveEnZones,
} from "../helpers";
import { buildComfortPolygonTrace, buildInputScatterTrace, buildContourTrace } from "./plotlyBuilders";
import { AdaptiveStandardMode } from "../../../models/inputModes";
import { getCe, calculateAdaptive } from "../adaptive";
import type { FieldKey as FieldKeyType } from "../../../models/fieldKeys";

// Discrete colorscales for Adaptive ASHRAE 55 Dynamic Chart (Monotonic 1-5).
const ADAPTIVE_ASHRAE_COLORSCALE = [
  adaptiveAshraeZones[0].color, // 1: Too cool (Blue)
  adaptiveAshraeZones[1].color, // 2: 80% Acceptability (Light Green)
  adaptiveAshraeZones[2].color, // 3: 90% Acceptability (Green)
  adaptiveAshraeZones[1].color, // 4: 80% Acceptability (Light Green)
  adaptiveAshraeZones[3].color, // 5: Too warm (Red)
].reduce((acc, color, index, array) => {
  const step = 1 / array.length;
  acc.push([index * step, color]);
  acc.push([(index + 1) * step, color]);
  return acc;
}, [] as [number, string][]);

// Discrete colorscales for Adaptive EN 16798-1 Dynamic Chart (Monotonic 1-7).
const ADAPTIVE_EN_COLORSCALE = [
  adaptiveEnZones[0].color, // 1: Too cool (Blue)
  adaptiveEnZones[1].color, // 2: EN Category III (Yellow)
  adaptiveEnZones[2].color, // 3: EN Category II (Light Green)
  adaptiveEnZones[3].color, // 4: EN Category I (Green)
  adaptiveEnZones[2].color, // 5: EN Category II (Light Green)
  adaptiveEnZones[1].color, // 6: EN Category III (Yellow)
  adaptiveEnZones[4].color, // 7: Too warm (Red)
].reduce((acc, color, index, array) => {
  const step = 1 / array.length;
  acc.push([index * step, color]);
  acc.push([(index + 1) * step, color]);
  return acc;
}, [] as [number, string][]);

// Contours for the Adaptive dynamic chart.
const ADAPTIVE_CONTOURS = {
  coloring: "fill",
  showlines: true,
  type: "levels",
  start: 1.5,
  size: 1,
  smoothing: 1.3,
  line: { width: 1, color: "#333333" },
};

const ADAPTIVE_DYNAMIC_POINTS = 240;
const COOLING_EFFECT_SPEED_BREAKPOINTS = [0.6, 0.9, 1.2];

function isFiniteNumber(value: number | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isTemperatureAxis(field: FieldKeyType): boolean {
  return field === FieldKey.DryBulbTemperature ||
    field === FieldKey.MeanRadiantTemperature ||
    field === FieldKey.OperativeTemperature;
}

function isAirSpeedAxis(field: FieldKeyType): boolean {
  return field === FieldKey.RelativeAirSpeed || field === FieldKey.WindSpeed;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Builds a standardized hover template for Adaptive charts to ensure consistency.
 */
function getAdaptiveHoverTemplate({
  xLabel,
  xUnits,
  yLabel,
  yUnits,
  standard,
  inputLabel,
  isStaticZone = false,
}: {
  xLabel: string;
  xUnits: string;
  yLabel: string;
  yUnits: string;
  standard: AdaptiveStandardMode;
  inputLabel?: string;
  isStaticZone?: boolean;
}): string {
  const isAshrae = standard === AdaptiveStandardMode.Ashrae;
  const parts = [];
  
  if (inputLabel) parts.push(`<b>${inputLabel}</b>`);
  parts.push(`${xLabel}: %{x:.1f} ${xUnits}`);
  parts.push(`${yLabel}: %{y:.1f} ${yUnits}`);
  
  // customdata mapping:
  // [0]: Compliance String
  // [1, 2]: Cat I / 90% range
  // [3, 4]: Cat II / 80% range
  // [5, 6]: Cat III range (EN only)
  
  if (isAshrae) {
    parts.push(`90% Acceptability: %{customdata[3]:.1f} to %{customdata[4]:.1f} °C`);
    parts.push(`80% Acceptability: %{customdata[1]:.1f} to %{customdata[2]:.1f} °C`);
  } else {
    parts.push(`Category I: %{customdata[1]:.1f} to %{customdata[2]:.1f} °C`);
    parts.push(`Category II: %{customdata[3]:.1f} to %{customdata[4]:.1f} °C`);
    parts.push(`Category III: %{customdata[5]:.1f} to %{customdata[6]:.1f} °C`);
  }

  return parts.join("<br>") + "<extra></extra>";
}

/**
 * Calculates hover metadata (compliance and boundaries) for an Adaptive data point.
 */
function getAdaptiveHoverMetadata(
  result: AdaptiveResponseDto, 
  to: number, 
  standard: AdaptiveStandardMode,
  unitSystem: UnitSystemType
): any[] {
  const isAshrae = standard === AdaptiveStandardMode.Ashrae;
  const unit = UnitSystem.SI; // Boundaries are internal SI for now, convert if needed
  
  const conv = (val: number | undefined) => 
    val !== undefined ? roundValue(convertFieldValueFromSi(FieldKey.DryBulbTemperature, val, unitSystem), 1) : NaN;

  if (isAshrae) {
    const isCompliant = result.acceptability_80;
    return [
      isCompliant ? "Compliant" : "Non-Compliant",
      conv(result.tmp_cmf_80_low), conv(result.tmp_cmf_80_up),
      conv(result.tmp_cmf_90_low), conv(result.tmp_cmf_90_up)
    ];
  } else {
    const isCompliant = result.acceptability_cat_iii;
    return [
      isCompliant ? "Compliant" : "Non-Compliant",
      conv(result.tmp_cmf_cat_i_low), conv(result.tmp_cmf_cat_i_up),
      conv(result.tmp_cmf_cat_ii_low), conv(result.tmp_cmf_cat_ii_up),
      conv(result.tmp_cmf_cat_iii_low), conv(result.tmp_cmf_cat_iii_up)
    ];
  }
}

function getFieldValues(field: FieldKeyType, points: number, extraValues: number[] = []): number[] {
  const meta = fieldMetaByKey[field];
  const values = Array.from({ length: points }, (_, index) => (
    meta.minValue + ((meta.maxValue - meta.minValue) * index) / (points - 1)
  ));

  extraValues.forEach((value) => {
    if (value > meta.minValue && value < meta.maxValue) {
      values.push(value);
    }
  });

  return values
    .sort((a, b) => a - b)
    .filter((value, index, array) => index === 0 || Math.abs(value - array[index - 1]) > 1e-6);
}

function getAdaptiveBaseTemperature(trm: number, standardMode: AdaptiveStandardMode): number {
  return standardMode === AdaptiveStandardMode.Ashrae
    ? 0.31 * trm + 17.8
    : 0.33 * trm + 18.8;
}

function withCoolingEffect(v: number, baseUpperBoundary: number): number {
  return baseUpperBoundary + getCe(v, baseUpperBoundary);
}

function addCoolingEffectTransitionPoints(
  standardMode: AdaptiveStandardMode,
  v: number,
  minTrm: number,
  maxTrm: number,
): number[] {
  if (v < 0.6) {
    return [];
  }

  const slope = standardMode === AdaptiveStandardMode.Ashrae ? 0.31 : 0.33;
  const intercept = standardMode === AdaptiveStandardMode.Ashrae ? 17.8 : 18.8;
  const warmOffsets = standardMode === AdaptiveStandardMode.Ashrae ? [2.5, 3.5] : [2, 3, 4];
  const epsilon = 0.001;

  return warmOffsets.flatMap((offset) => {
    const trm = (25 - offset - intercept) / slope;
    return trm > minTrm && trm < maxTrm ? [trm - epsilon, trm + epsilon] : [];
  });
}

function getAdaptiveTemperatureBoundaries(
  trm: number,
  v: number,
  standardMode: AdaptiveStandardMode,
): number[] {
  const tCmf = getAdaptiveBaseTemperature(trm, standardMode);

  if (standardMode === AdaptiveStandardMode.Ashrae) {
    return [
      tCmf - 3.5,
      tCmf - 2.5,
      withCoolingEffect(v, tCmf + 2.5),
      withCoolingEffect(v, tCmf + 3.5),
    ];
  }

  return [
    tCmf - 5,
    tCmf - 4,
    tCmf - 3,
    withCoolingEffect(v, tCmf + 2),
    withCoolingEffect(v, tCmf + 3),
    withCoolingEffect(v, tCmf + 4),
  ];
}

function getOutdoorTemperatureBoundaries(
  to: number,
  v: number,
  standardMode: AdaptiveStandardMode,
): number[] {
  const ce = getCe(v, to);

  if (standardMode === AdaptiveStandardMode.Ashrae) {
    return [
      (to - 3.5 - ce - 17.8) / 0.31,
      (to - 2.5 - ce - 17.8) / 0.31,
      (to + 2.5 - 17.8) / 0.31,
      (to + 3.5 - 17.8) / 0.31,
    ];
  }

  return [
    (to - 4 - ce - 18.8) / 0.33,
    (to - 3 - ce - 18.8) / 0.33,
    (to - 2 - ce - 18.8) / 0.33,
    (to + 3 - 18.8) / 0.33,
    (to + 4 - 18.8) / 0.33,
    (to + 5 - 18.8) / 0.33,
  ];
}

function getTemperatureAxisValueForOperativeTemperature(
  targetTo: number,
  temperatureAxis: FieldKeyType,
  baseline: AdaptiveChartInputsRequestDto["inputs"][keyof AdaptiveChartInputsRequestDto["inputs"]],
  standardMode: AdaptiveStandardMode,
): number {
  if (!baseline || temperatureAxis === FieldKey.OperativeTemperature) {
    return targetTo;
  }

  const standard = standardMode === AdaptiveStandardMode.Ashrae ? "ASHRAE" : "ISO";
  const meta = fieldMetaByKey[temperatureAxis];
  const getTo = (axisValue: number) => {
    const tdb = temperatureAxis === FieldKey.DryBulbTemperature ? axisValue : baseline.tdb;
    const tr = temperatureAxis === FieldKey.MeanRadiantTemperature ? axisValue : baseline.tr;
    return t_o(tdb, tr, baseline.v, standard);
  };
  const minTo = getTo(meta.minValue);
  const maxTo = getTo(meta.maxValue);

  if (Math.abs(maxTo - minTo) < 1e-6) {
    return targetTo;
  }

  return meta.minValue + ((targetTo - minTo) * (meta.maxValue - meta.minValue)) / (maxTo - minTo);
}

const ASHRAE_TEMPERATURE_BANDS = [
  adaptiveAshraeZones[0],
  adaptiveAshraeZones[1],
  adaptiveAshraeZones[2],
  adaptiveAshraeZones[1],
  adaptiveAshraeZones[3],
];

const ASHRAE_OUTDOOR_TEMPERATURE_BANDS = [
  adaptiveAshraeZones[3],
  adaptiveAshraeZones[1],
  adaptiveAshraeZones[2],
  adaptiveAshraeZones[1],
  adaptiveAshraeZones[0],
];

const EN_TEMPERATURE_BANDS = [
  adaptiveEnZones[0],
  adaptiveEnZones[1],
  adaptiveEnZones[2],
  adaptiveEnZones[3],
  adaptiveEnZones[2],
  adaptiveEnZones[1],
  adaptiveEnZones[4],
];

const EN_OUTDOOR_TEMPERATURE_BANDS = [
  adaptiveEnZones[4],
  adaptiveEnZones[1],
  adaptiveEnZones[2],
  adaptiveEnZones[3],
  adaptiveEnZones[2],
  adaptiveEnZones[1],
  adaptiveEnZones[0],
];

function interpolateZoneValue(value: number, lower: number, upper: number, lowerZone: number, upperZone: number): number {
  if (upper <= lower) {
    return lowerZone;
  }

  return lowerZone + ((value - lower) / (upper - lower)) * (upperZone - lowerZone);
}

function mapAdaptiveBoundariesToZoneScale(to: number, boundaries: number[]): number {
  if (boundaries.some((boundary) => !Number.isFinite(boundary))) {
    return NaN;
  }

  if (to < boundaries[0]) {
    return 1.5 - Math.min(0.49, (boundaries[0] - to) / 4);
  }

  for (let index = 0; index < boundaries.length - 1; index += 1) {
    if (to < boundaries[index + 1]) {
      return interpolateZoneValue(to, boundaries[index], boundaries[index + 1], index + 1.5, index + 2.5);
    }
  }

  const lastBoundary = boundaries[boundaries.length - 1];
  const lastBoundaryZone = boundaries.length + 0.5;
  return lastBoundaryZone + Math.min(0.49, Math.max(0, to - lastBoundary) / 4);
}

function getAshraeDynamicZone(result: AdaptiveResponseDto, to: number): { z: number; label: string } {
  const boundaries = [
    result.tmp_cmf_80_low,
    result.tmp_cmf_90_low,
    result.tmp_cmf_90_up,
    result.tmp_cmf_80_up,
  ];

  if (!boundaries.every(isFiniteNumber)) {
    return { z: NaN, label: "" };
  }

  if (result.acceptability_90) {
    return { z: mapAdaptiveBoundariesToZoneScale(to, boundaries), label: adaptiveAshraeZones[2].label };
  }
  if (result.acceptability_80) {
    return { z: mapAdaptiveBoundariesToZoneScale(to, boundaries), label: adaptiveAshraeZones[1].label };
  }

  return {
    z: mapAdaptiveBoundariesToZoneScale(to, boundaries),
    label: to > boundaries[3] ? adaptiveAshraeZones[3].label : adaptiveAshraeZones[0].label,
  };
}

function getEnDynamicZone(result: AdaptiveResponseDto, to: number): { z: number; label: string } {
  const boundaries = [
    result.tmp_cmf_cat_iii_low,
    result.tmp_cmf_cat_ii_low,
    result.tmp_cmf_cat_i_low,
    result.tmp_cmf_cat_i_up,
    result.tmp_cmf_cat_ii_up,
    result.tmp_cmf_cat_iii_up,
  ];

  if (!boundaries.every(isFiniteNumber)) {
    return { z: NaN, label: "" };
  }

  if (result.acceptability_cat_i) {
    return { z: mapAdaptiveBoundariesToZoneScale(to, boundaries), label: adaptiveEnZones[3].label };
  }
  if (result.acceptability_cat_ii) {
    return { z: mapAdaptiveBoundariesToZoneScale(to, boundaries), label: adaptiveEnZones[2].label };
  }
  if (result.acceptability_cat_iii) {
    return { z: mapAdaptiveBoundariesToZoneScale(to, boundaries), label: adaptiveEnZones[1].label };
  }

  return {
    z: mapAdaptiveBoundariesToZoneScale(to, boundaries),
    label: to > boundaries[5] ? adaptiveEnZones[4].label : adaptiveEnZones[0].label,
  };
}
function buildAdaptiveBandTrace(
  name: string,
  color: string,
  polygonX: number[],
  polygonY: number[],
  xMetaLabel: string,
  yMetaLabel: string,
  xUnits: string,
  yUnits: string,
  standard: AdaptiveStandardMode,
  hoverMetadata: any[][],
): PlotTraceDto {
  return {
    type: "scatter",
    mode: "lines",
    name,
    x: polygonX,
    y: polygonY,
    showlegend: false,
    fill: "toself",
    fillcolor: color,
    line: { color: "#334155", width: 0.8 },
    marker: {},
    opacity: 0.72,
    hovertemplate: "",
    hoverinfo: "skip",
    hoverMetadata,
    isZone: true,
  };
}

function buildAdaptiveBandTraces(
  variableValues: number[],
  boundaryCurves: number[][],
  bands: { label: string; color: string }[],
  variableAxis: FieldKeyType,
  boundaryAxis: FieldKeyType,
  dynamicXAxis: FieldKeyType,
  dynamicYAxis: FieldKeyType,
  unitSystem: UnitSystemType,
  standardMode: AdaptiveStandardMode,
  activeInputPayload: any,
): PlotTraceDto[] {
  const boundaryMeta = fieldMetaByKey[boundaryAxis];
  const variableDisplayValues = variableValues.map((value) => convertFieldValueFromSi(variableAxis, value, unitSystem));
  const boundaryMin = boundaryMeta.minValue;
  const boundaryMax = boundaryMeta.maxValue;
  const traces: PlotTraceDto[] = [];

  bands.forEach((band, bandIndex) => {
    const lowerValues = bandIndex === 0
      ? variableValues.map(() => boundaryMin)
      : boundaryCurves[bandIndex - 1];
    const upperValues = bandIndex === boundaryCurves.length
      ? variableValues.map(() => boundaryMax)
      : boundaryCurves[bandIndex];
    const hasVisibleArea = lowerValues.some((lower, index) => lower < boundaryMax && upperValues[index] > boundaryMin);

    if (!hasVisibleArea) {
      return;
    }

    const lowerDisplayValues = lowerValues.map((value) => (
      convertFieldValueFromSi(boundaryAxis, clamp(value, boundaryMin, boundaryMax), unitSystem)
    ));
    const upperDisplayValues = upperValues.map((value) => (
      convertFieldValueFromSi(boundaryAxis, clamp(value, boundaryMin, boundaryMax), unitSystem)
    ));
    const variableIsXAxis = variableAxis === dynamicXAxis;
    const polygonX = variableIsXAxis
      ? variableDisplayValues.concat(variableDisplayValues.slice().reverse())
      : lowerDisplayValues.concat(upperDisplayValues.slice().reverse());
    const polygonY = variableIsXAxis
      ? lowerDisplayValues.concat(upperDisplayValues.slice().reverse())
      : variableDisplayValues.concat(variableDisplayValues.slice().reverse());

    const hoverMetadata: any[][] = [];
    polygonX.forEach((px, i) => {
      const py = polygonY[i];
      const xSi = convertFieldValueToSi(dynamicXAxis, px, unitSystem);
      const ySi = convertFieldValueToSi(dynamicYAxis, py, unitSystem);
      
      const args = { ...activeInputPayload };
      const setVal = (k: string, v: number) => {
        if (k === FieldKey.DryBulbTemperature) args.tdb = v;
        else if (k === FieldKey.MeanRadiantTemperature) args.tr = v;
        else if (k === FieldKey.PrevailingMeanOutdoorTemperature) args.trm = v;
        else if (k === FieldKey.RelativeAirSpeed || k === FieldKey.WindSpeed) args.v = v;
        else if (k === FieldKey.OperativeTemperature) { args.tdb = v; args.tr = v; }
      };
      setVal(dynamicXAxis, xSi);
      setVal(dynamicYAxis, ySi);

      const res = calculateAdaptive(args, standardMode);
      const toVal = t_o(args.tdb, args.tr, args.v, standardMode === AdaptiveStandardMode.Ashrae ? "ASHRAE" : "ISO");
      hoverMetadata.push(getAdaptiveHoverMetadata(res, toVal, standardMode, unitSystem));
    });

    traces.push(buildAdaptiveBandTrace(
      band.label,
      band.color,
      polygonX,
      polygonY,
      fieldMetaByKey[dynamicXAxis].label,
      fieldMetaByKey[dynamicYAxis].label,
      fieldMetaByKey[dynamicXAxis].displayUnits[unitSystem],
      fieldMetaByKey[dynamicYAxis].displayUnits[unitSystem],
      standardMode,
      hoverMetadata,
    ));
  });

  return traces;
}

function buildOutdoorTemperatureDynamicBands(
  activeInputPayload: AdaptiveChartInputsRequestDto["inputs"][keyof AdaptiveChartInputsRequestDto["inputs"]],
  standardMode: AdaptiveStandardMode,
  unitSystem: UnitSystemType,
  dynamicXAxis: FieldKeyType,
  dynamicYAxis: FieldKeyType,
): PlotTraceDto[] {
  if (!activeInputPayload) {
    return [];
  }

  const hasOutdoorXAxis = dynamicXAxis === FieldKey.PrevailingMeanOutdoorTemperature;
  const hasOutdoorYAxis = dynamicYAxis === FieldKey.PrevailingMeanOutdoorTemperature;
  if (!hasOutdoorXAxis && !hasOutdoorYAxis) {
    return [];
  }

  const otherAxis = hasOutdoorXAxis ? dynamicYAxis : dynamicXAxis;
  const isAshrae = standardMode === AdaptiveStandardMode.Ashrae;

  // Helper to build the unified tooltip layer for these bands
  const addTooltipLayer = (traces: PlotTraceDto[], otherField: FieldKeyType) => {
    const xMeta = fieldMetaByKey[dynamicXAxis];
    const yMeta = fieldMetaByKey[dynamicYAxis];
    const gPoints = 40;
    const gX = Array.from({ length: gPoints }, (_, i) => xMeta.minValue + ((xMeta.maxValue - xMeta.minValue) * i) / (gPoints - 1));
    const gY = Array.from({ length: gPoints }, (_, i) => yMeta.minValue + ((yMeta.maxValue - yMeta.minValue) * i) / (gPoints - 1));
    const zValues: number[][] = [];
    const hoverMetadataGrid: any[][][] = [];

    for (let i = 0; i < gPoints; i++) {
      const row: number[] = [];
      const hoverMetadataRow: any[][] = [];
      const ySi = gY[i];
      for (let j = 0; j < gPoints; j++) {
        const xSi = gX[j];
        try {
          const args = { ...activeInputPayload };
          const setVal = (k: string, v: number) => {
            if (k === FieldKey.DryBulbTemperature) args.tdb = v;
            else if (k === FieldKey.MeanRadiantTemperature) args.tr = v;
            else if (k === FieldKey.PrevailingMeanOutdoorTemperature) args.trm = v;
            else if (k === FieldKey.RelativeAirSpeed || k === FieldKey.WindSpeed) args.v = v;
            else if (k === FieldKey.OperativeTemperature) { args.tdb = v; args.tr = v; }
          };
          setVal(dynamicXAxis, xSi);
          setVal(dynamicYAxis, ySi);
          
          const res = calculateAdaptive(args, standardMode);
          const toVal = t_o(args.tdb, args.tr, args.v, isAshrae ? "ASHRAE" : "ISO");
          row.push(1);
          hoverMetadataRow.push(getAdaptiveHoverMetadata(res, toVal, standardMode, unitSystem));
        } catch {
          row.push(NaN);
          hoverMetadataRow.push([NaN]);
        }
      }
      zValues.push(row);
      hoverMetadataGrid.push(hoverMetadataRow);
    }

    const xLabel = dynamicXAxis === FieldKey.PrevailingMeanOutdoorTemperature 
      ? `${isAshrae ? "Prevailing" : "Running"} ${fieldMetaByKey[FieldKey.PrevailingMeanOutdoorTemperature].label.toLowerCase()}`
      : xMeta.label;
    const yLabel = dynamicYAxis === FieldKey.PrevailingMeanOutdoorTemperature
      ? `${isAshrae ? "Prevailing" : "Running"} ${fieldMetaByKey[FieldKey.PrevailingMeanOutdoorTemperature].label.toLowerCase()}`
      : yMeta.label;

    traces.unshift(buildContourTrace({
      name: "Tooltip Layer",
      x: gX.map(x => convertFieldValueFromSi(dynamicXAxis, x, unitSystem)),
      y: gY.map(y => convertFieldValueFromSi(dynamicYAxis, y, unitSystem)),
      z: zValues,
      colorscale: [[0, "rgba(0,0,0,0)"], [1, "rgba(0,0,0,0)"]],
      contours: { coloring: "none", showlines: false },
      showscale: false,
      hovertemplate: getAdaptiveHoverTemplate({
        xLabel,
        xUnits: xMeta.displayUnits[unitSystem],
        yLabel,
        yUnits: yMeta.displayUnits[unitSystem],
        standard: standardMode,
      }),
      hoverMetadata: hoverMetadataGrid,
    }));
  };

  if (isTemperatureAxis(otherAxis)) {
    const trmMeta = fieldMetaByKey[FieldKey.PrevailingMeanOutdoorTemperature];
    const trmValues = getFieldValues(
      FieldKey.PrevailingMeanOutdoorTemperature,
      ADAPTIVE_DYNAMIC_POINTS,
      addCoolingEffectTransitionPoints(standardMode, activeInputPayload.v, trmMeta.minValue, trmMeta.maxValue),
    );
    const firstBoundaries = getAdaptiveTemperatureBoundaries(trmValues[0], activeInputPayload.v, standardMode);
    const boundaryCurves = firstBoundaries.map((_, boundaryIndex) => (
      trmValues.map((trm) => {
        const targetTo = getAdaptiveTemperatureBoundaries(trm, activeInputPayload.v, standardMode)[boundaryIndex];
        return getTemperatureAxisValueForOperativeTemperature(targetTo, otherAxis, activeInputPayload, standardMode);
      })
    ));
    const bands = isAshrae ? ASHRAE_TEMPERATURE_BANDS : EN_TEMPERATURE_BANDS;

    const traces = buildAdaptiveBandTraces(
      trmValues,
      boundaryCurves,
      bands,
      FieldKey.PrevailingMeanOutdoorTemperature,
      otherAxis,
      dynamicXAxis,
      dynamicYAxis,
      unitSystem,
      standardMode,
      activeInputPayload,
    );

    addTooltipLayer(traces, otherAxis);
    return traces;
  }

  if (isAirSpeedAxis(otherAxis)) {
    const speedValues = getFieldValues(otherAxis, ADAPTIVE_DYNAMIC_POINTS, COOLING_EFFECT_SPEED_BREAKPOINTS);
    const standard = isAshrae ? "ASHRAE" : "ISO";
    const firstTo = t_o(activeInputPayload.tdb, activeInputPayload.tr, speedValues[0], standard);
    const firstBoundaries = getOutdoorTemperatureBoundaries(firstTo, speedValues[0], standardMode);
    const boundaryCurves = firstBoundaries.map((_, boundaryIndex) => (
      speedValues.map((speed) => {
        const to = t_o(activeInputPayload.tdb, activeInputPayload.tr, speed, standard);
        return getOutdoorTemperatureBoundaries(to, speed, standardMode)[boundaryIndex];
      })
    ));
    const bands = isAshrae ? ASHRAE_OUTDOOR_TEMPERATURE_BANDS : EN_OUTDOOR_TEMPERATURE_BANDS;

    const traces = buildAdaptiveBandTraces(
      speedValues,
      boundaryCurves,
      bands,
      otherAxis,
      FieldKey.PrevailingMeanOutdoorTemperature,
      dynamicXAxis,
      dynamicYAxis,
      unitSystem,
      standardMode,
      activeInputPayload,
    );

    addTooltipLayer(traces, otherAxis);
    return traces;
  }

  return [];
}

/**
 * Builds the adaptive comfort chart (Prevailing Mean Outdoor Temperature (TRM) vs Operative Temperature (To)).
 * It maps out comfort boundary polygons (80%/90% or Cat I/II/III) and scatter points for inputs.
 *
 * @param payload Adaptive chart's inputs request data transfer object (DTO).
 * @param standardMode The selected standard (ASHRAE 55 or EN 16798-1).
 * @param unitSystem The active unit system (SI or IP).
 * @param baselineInputId Baseline input ID for background comfort zones.
 * @returns Complete plotly response bindings (traces and layout).
 */
export function buildAdaptiveChart(
  payload: AdaptiveChartInputsRequestDto,
  standardMode: AdaptiveStandardMode,
  unitSystem: UnitSystemType = UnitSystem.SI,
  baselineInputId?: string,
): PlotlyChartResponseDto {
  // Get the inputs for the chart.
  const inputs = getCompareInputs(payload.inputs);
  // Show input legend if there are multiple inputs.
  const showInputLegend = inputs.length > 1;
  // Get the temperature's display units.
  const temperatureDisplayUnits = fieldMetaByKey[FieldKey.DryBulbTemperature].displayUnits[unitSystem];
  const traces: PlotTraceDto[] = [];
  const isAshrae = standardMode === AdaptiveStandardMode.Ashrae;
  const trmMin = 10;
  const trmMax = isAshrae ? 33.5 : 30;

  const baselineInput = inputs.find(i => i.inputId === baselineInputId) || inputs[0];
  
  if (baselineInput) {
    const v = baselineInput.payload.v;
    const baseTrmPoints = Array.from({ length: 500 }, (_, i) => trmMin + ((trmMax - trmMin) * i) / 499);
    const trmPoints = [
      ...baseTrmPoints,
      ...addCoolingEffectTransitionPoints(standardMode, v, trmMin, trmMax),
    ].sort((a, b) => a - b);

    let lower80: number[] = [];
    let upper80: number[] = [];
    let lower90: number[] = [];
    let upper90: number[] = [];
    let lowerI: number[] = [];
    let upperI: number[] = [];
    let lowerII: number[] = [];
    let upperII: number[] = [];
    let lowerIII: number[] = [];
    let upperIII: number[] = [];

    trmPoints.forEach((trm) => {
      if (isAshrae) {
        const [boundary80Low, boundary90Low, boundary90Up, boundary80Up] =
          getAdaptiveTemperatureBoundaries(trm, v, AdaptiveStandardMode.Ashrae);
        lower80.push(boundary80Low);
        upper80.push(boundary80Up);
        lower90.push(boundary90Low);
        upper90.push(boundary90Up);
      } else {
        const [boundaryIIILow, boundaryIILow, boundaryILow, boundaryIUp, boundaryIIUp, boundaryIIIUp] =
          getAdaptiveTemperatureBoundaries(trm, v, AdaptiveStandardMode.En);
        lowerI.push(boundaryILow);
        upperI.push(boundaryIUp);
        lowerII.push(boundaryIILow);
        upperII.push(boundaryIIUp);
        lowerIII.push(boundaryIIILow);
        upperIII.push(boundaryIIIUp);
      }
    });

    const addPolygon = (lower: number[], upper: number[], nameSuffix: string) => {
      const polygonX = trmPoints.concat(trmPoints.slice().reverse());
      const polygonY = lower.concat(upper.slice().reverse());
      const xLabel = `${isAshrae ? "Prevailing" : "Running"} ${fieldMetaByKey[FieldKey.PrevailingMeanOutdoorTemperature].label.toLowerCase()}`;
      const yLabel = fieldMetaByKey[FieldKey.OperativeTemperature].label;
      
      const hoverMetadata: any[][] = [];
      polygonX.forEach((trm, i) => {
        const toVal = polygonY[i];
        const res = calculateAdaptive({ tdb: toVal, tr: toVal, trm, v, units: UnitSystem.SI }, standardMode);
        hoverMetadata.push(getAdaptiveHoverMetadata(res, toVal, standardMode, unitSystem));
      });

      const trace = buildComfortPolygonTrace({
        inputId: baselineInput.inputId,
        nameSuffix,
        polygonX: polygonX.map((x) => roundValue(convertFieldValueFromSi(FieldKey.PrevailingMeanOutdoorTemperature, x, unitSystem))),
        polygonY: polygonY.map((y) => roundValue(convertFieldValueFromSi(FieldKey.DryBulbTemperature, y, unitSystem))),
        hovertemplate: "",
        hoverinfo: "skip",
        isZone: true,
      });

      traces.push(trace);
    };

    if (isAshrae) {
      addPolygon(lower80, upper80, "80% Acceptability");
      addPolygon(lower90, upper90, "90% Acceptability");
    } else {
      addPolygon(lowerI, upperI, "Category I");
      addPolygon(lowerII, upperII, "Category II");
      addPolygon(lowerIII, upperIII, "Category III");
    }
  }

  // Add a transparent contour trace for tooltips across the whole background
  const gPoints = 40;
  const gTrm = Array.from({ length: gPoints }, (_, i) => 10 + ((trmMax - 10) * i) / (gPoints - 1));
  const gTo = Array.from({ length: gPoints }, (_, i) => 10 + (30 * i) / (gPoints - 1));
  const zValues: number[][] = [];
  const hoverMetadataGrid: any[][][] = [];
  const v_baseline = baselineInput.payload.v;

  for (let i = 0; i < gPoints; i++) {
    const row: number[] = [];
    const hoverMetadataRow: any[][] = [];
    const toVal = gTo[i];
    for (let j = 0; j < gPoints; j++) {
      const trm = gTrm[j];
      try {
        const res = calculateAdaptive({ tdb: toVal, tr: toVal, trm, v: v_baseline, units: UnitSystem.SI }, standardMode);
        row.push(1);
        hoverMetadataRow.push(getAdaptiveHoverMetadata(res, toVal, standardMode, unitSystem));
      } catch {
        row.push(NaN);
        hoverMetadataRow.push([NaN]);
      }
    }
    zValues.push(row);
    hoverMetadataGrid.push(hoverMetadataRow);
  }

  traces.unshift(buildContourTrace({
    name: "Tooltip Layer",
    x: gTrm.map(x => convertFieldValueFromSi(FieldKey.PrevailingMeanOutdoorTemperature, x, unitSystem)),
    y: gTo.map(y => convertFieldValueFromSi(FieldKey.DryBulbTemperature, y, unitSystem)),
    z: zValues,
    colorscale: [[0, "rgba(0,0,0,0)"], [1, "rgba(0,0,0,0)"]],
    contours: { coloring: "none", showlines: false },
    showscale: false,
    hovertemplate: getAdaptiveHoverTemplate({
      xLabel: `${isAshrae ? "Prevailing" : "Running"} ${fieldMetaByKey[FieldKey.PrevailingMeanOutdoorTemperature].label.toLowerCase()}`,
      xUnits: temperatureDisplayUnits,
      yLabel: fieldMetaByKey[FieldKey.OperativeTemperature].label,
      yUnits: temperatureDisplayUnits,
      standard: standardMode,
    }),
    hoverMetadata: hoverMetadataGrid,
  }));

  inputs.forEach(({ inputId, payload: inputPayload }) => {
    const to = t_o(inputPayload.tdb, inputPayload.tr, inputPayload.v, standardMode === AdaptiveStandardMode.Ashrae ? "ASHRAE" : "ISO");
    const xLabel = `${isAshrae ? "Prevailing" : "Running"} ${fieldMetaByKey[FieldKey.PrevailingMeanOutdoorTemperature].label.toLowerCase()}`;
    const yLabel = fieldMetaByKey[FieldKey.OperativeTemperature].label;
    
    try {
      const adRes = calculateAdaptive({
        tdb: inputPayload.tdb,
        tr: inputPayload.tr,
        trm: inputPayload.trm,
        v: inputPayload.v,
        units: UnitSystem.SI,
      }, standardMode);
      const hoverMetadata = [getAdaptiveHoverMetadata(adRes, to, standardMode, unitSystem)];

      traces.push(buildInputScatterTrace({
        inputId,
        x: roundValue(convertFieldValueFromSi(FieldKey.PrevailingMeanOutdoorTemperature, inputPayload.trm, unitSystem)),
        y: roundValue(convertFieldValueFromSi(FieldKey.DryBulbTemperature, to, unitSystem)),
        showLegend: showInputLegend,
        hovertemplate: getAdaptiveHoverTemplate({
          xLabel,
          xUnits: temperatureDisplayUnits,
          yLabel,
          yUnits: temperatureDisplayUnits,
          standard: standardMode,
          inputLabel: inputDisplayMetaById[inputId]?.label ?? "Input",
        }),
        hoverMetadata,
        markerSize: 14,
      }));
    } catch {
      // Ignore errors for individual points.
    }
  });

  return {
    traces,
    layout: {
      title: isAshrae ? "ASHRAE 55 Adaptive Chart" : "EN 16798-1 Adaptive Chart",
      paper_bgcolor: "#ffffff",
      plot_bgcolor: "#f8fafc",
      showlegend: true,
      margin: { l: 64, r: 24, t: 48, b: 80 },
      xaxis: {
        title: isAshrae
          ? `Prevailing mean outdoor temperature (${temperatureDisplayUnits})`
          : `Running mean outdoor temperature (${temperatureDisplayUnits})`,
        range: [
          convertFieldValueFromSi(FieldKey.PrevailingMeanOutdoorTemperature, 10, unitSystem),
          convertFieldValueFromSi(FieldKey.PrevailingMeanOutdoorTemperature, trmMax, unitSystem),
        ],
        gridcolor: "#e2e8f0",
      },
      yaxis: {
        title: `Operative temperature (${temperatureDisplayUnits})`,
        range: [
          convertFieldValueFromSi(FieldKey.DryBulbTemperature, 10, unitSystem),
          convertFieldValueFromSi(FieldKey.DryBulbTemperature, 40, unitSystem),
        ],
        gridcolor: "#e2e8f0",
      },
      legend: { orientation: "h", x: 0, y: 1.1 },
      height: 480,
    },
    annotations: [],
    source: CalculationSource.FrontendGenerated,
  };
}

/**
 * Builds the adaptive comfort chart with dynamic X and Y axes.
 * 
 * @param payload Adaptive chart's inputs request data transfer object (DTO).
 * @param standardMode The selected standard (ASHRAE 55 or EN 16798-1).
 * @param unitSystem The active unit system (SI or IP).
 * @param dynamicXAxis The X-axis field key.
 * @param dynamicYAxis The Y-axis field key.
 * @param baselineInputId The baseline input ID.
 * @returns Complete plotly response bindings (traces and layout).
 */
export function buildAdaptiveDynamicChart(
  payload: AdaptiveChartInputsRequestDto,
  standardMode: AdaptiveStandardMode,
  unitSystem: UnitSystemType = UnitSystem.SI,
  dynamicXAxis?: FieldKeyType,
  dynamicYAxis?: FieldKeyType,
  baselineInputId?: string,
): PlotlyChartResponseDto {
  const inputs = getCompareInputs(payload.inputs);
  const showInputLegend = inputs.length > 1;

  const traces: PlotTraceDto[] = [];

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

  const outdoorTemperatureBandTraces = buildOutdoorTemperatureDynamicBands(
    activeInputPayload,
    standardMode,
    unitSystem,
    dynamicXAxis,
    dynamicYAxis,
  );

  if (outdoorTemperatureBandTraces.length > 0) {
    traces.push(...outdoorTemperatureBandTraces);

    inputs.forEach(({ inputId, payload: inputPayload }) => {
      const getFieldValue = (key: string): number => {
        if (key === FieldKey.DryBulbTemperature) return inputPayload.tdb;
        if (key === FieldKey.MeanRadiantTemperature) return inputPayload.tr;
        if (key === FieldKey.PrevailingMeanOutdoorTemperature) return inputPayload.trm;
        if (key === FieldKey.RelativeAirSpeed || key === FieldKey.WindSpeed) return inputPayload.v;
        if (key === FieldKey.OperativeTemperature) {
          return t_o(inputPayload.tdb, inputPayload.tr, inputPayload.v, standardMode === AdaptiveStandardMode.Ashrae ? "ASHRAE" : "ISO");
        }
        return 0;
      };

      let inputX = getFieldValue(dynamicXAxis);
      let inputY = getFieldValue(dynamicYAxis);
      inputX = convertFieldValueFromSi(dynamicXAxis, inputX, unitSystem);
      inputY = convertFieldValueFromSi(dynamicYAxis, inputY, unitSystem);

      const hoverMetadata = [getAdaptiveHoverMetadata(
        calculateAdaptive(inputPayload, standardMode),
        getFieldValue(FieldKey.OperativeTemperature),
        standardMode,
        unitSystem
      )];

      traces.push(buildInputScatterTrace({
        inputId,
        x: roundValue(inputX),
        y: roundValue(inputY),
        showLegend: showInputLegend,
        hovertemplate: getAdaptiveHoverTemplate({
          xLabel: xMeta.label,
          xUnits: xMeta.displayUnits[unitSystem],
          yLabel: yMeta.label,
          yUnits: yMeta.displayUnits[unitSystem],
          standard: standardMode,
          inputLabel: inputDisplayMetaById[inputId]?.label ?? "Input",
        }),
        hoverMetadata,
      }));
    });

    return {
      traces,
      layout: {
        title: `Adaptive Dynamic Chart (${xMeta.label} vs ${yMeta.label})`,
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

    const xPoints = 300;
    const yPoints = 300;
    const xValues: number[] = [];
    const yValues: number[] = [];

    for (let i = 0; i < xPoints; i++) xValues.push(xMin + (xMax - xMin) * (i / (xPoints - 1)));
    for (let i = 0; i < yPoints; i++) yValues.push(yMin + (yMax - yMin) * (i / (yPoints - 1)));

    const zValues: number[][] = [];
    const textValues: string[][] = [];
    const hoverMetadata: any[][][] = [];

    for (let i = 0; i < yPoints; i++) {
      const row: number[] = [];
      const textRow: string[] = [];
      const hoverMetadataRow: any[][] = [];
      const ySi = convertFieldValueToSi(dynamicYAxis, yValues[i], unitSystem);
      
      for (let j = 0; j < xPoints; j++) {
        const xSi = convertFieldValueToSi(dynamicXAxis, xValues[j], unitSystem);
        
        let tdb = activeInputPayload.tdb;
        let tr = activeInputPayload.tr;
        let trm = activeInputPayload.trm;
        let v = activeInputPayload.v;

        // Override values based on the selected dynamic axes.
        const updateParams = (key: string, val: number) => {
          if (key === FieldKey.DryBulbTemperature) { tdb = val; }
          else if (key === FieldKey.MeanRadiantTemperature) { tr = val; }
          else if (key === FieldKey.OperativeTemperature) { tdb = val; tr = val; } // Simplified for heatmap
          else if (key === FieldKey.PrevailingMeanOutdoorTemperature) { trm = val; }
          else if (key === FieldKey.RelativeAirSpeed || key === FieldKey.WindSpeed) { v = val; }
        };

        updateParams(dynamicXAxis, xSi);
        updateParams(dynamicYAxis, ySi);

        // Perform the adaptive calculation.
        try {
          const result = calculateAdaptive({
            tdb,
            tr,
            trm,
            v,
            units: UnitSystem.SI,
          }, standardMode);
          const to = t_o(tdb, tr, v, standardMode === AdaptiveStandardMode.Ashrae ? "ASHRAE" : "ISO");

          if (standardMode === AdaptiveStandardMode.Ashrae) {
            const zone = getAshraeDynamicZone(result, to);
            row.push(zone.z);
            textRow.push(zone.label);
          } else {
            const zone = getEnDynamicZone(result, to);
            row.push(zone.z);
            textRow.push(zone.label);
          }
          
          hoverMetadataRow.push(getAdaptiveHoverMetadata(result, to, standardMode, unitSystem));
        } catch {
          row.push(NaN);
          textRow.push("");
          hoverMetadataRow.push([NaN]);
        }
      }
      zValues.push(row);
      textValues.push(textRow);
      hoverMetadata.push(hoverMetadataRow);
    }

    // Add the contour trace to the traces.
    traces.push(buildContourTrace({
      name: "Acceptability Zones",
      x: xValues,
      y: yValues,
      z: zValues,
      text: textValues,
      colorscale: standardMode === AdaptiveStandardMode.Ashrae ? ADAPTIVE_ASHRAE_COLORSCALE : ADAPTIVE_EN_COLORSCALE,
      contours: {
        ...ADAPTIVE_CONTOURS,
        end: standardMode === AdaptiveStandardMode.Ashrae ? 4.5 : 6.5,
      },
      showscale: false,
      hovertemplate: getAdaptiveHoverTemplate({
        xLabel: xMeta.label,
        xUnits: xMeta.displayUnits[unitSystem],
        yLabel: yMeta.label,
        yUnits: yMeta.displayUnits[unitSystem],
        standard: standardMode,
      }),
      hoverMetadata,
      zmin: 1,
      zmax: standardMode === AdaptiveStandardMode.Ashrae ? 5 : 7,
      opacity: 0.8,
      isZone: true,
    }));

    // Add the scatter points for each input.
    inputs.forEach(({ inputId, payload: inputPayload }) => {
      const getFieldValue = (key: string): number => {
        if (key === FieldKey.DryBulbTemperature) return inputPayload.tdb;
        if (key === FieldKey.MeanRadiantTemperature) return inputPayload.tr;
        if (key === FieldKey.PrevailingMeanOutdoorTemperature) return inputPayload.trm;
        if (key === FieldKey.RelativeAirSpeed || key === FieldKey.WindSpeed) return inputPayload.v;
        if (key === FieldKey.OperativeTemperature) {
          return t_o(inputPayload.tdb, inputPayload.tr, inputPayload.v, standardMode === AdaptiveStandardMode.Ashrae ? "ASHRAE" : "ISO");
        }
        return 0;
      };

      let inputX = getFieldValue(dynamicXAxis);
      let inputY = getFieldValue(dynamicYAxis);
      
      inputX = convertFieldValueFromSi(dynamicXAxis as FieldKey, inputX, unitSystem);
      inputY = convertFieldValueFromSi(dynamicYAxis as FieldKey, inputY, unitSystem);

      // Calculate Adaptive zone for the scatter dot.
      let adaptiveText = "";
      try {
        const adRes = calculateAdaptive({
          tdb: inputPayload.tdb,
          tr: inputPayload.tr,
          trm: inputPayload.trm,
          v: inputPayload.v,
          units: UnitSystem.SI,
        }, standardMode);
        const to = t_o(inputPayload.tdb, inputPayload.tr, inputPayload.v, standardMode === AdaptiveStandardMode.Ashrae ? "ASHRAE" : "ISO");
             let zoneLabel = "";
        if (standardMode === AdaptiveStandardMode.Ashrae) {
          if (adRes.acceptability_90) zoneLabel = "90% Acceptability";
          else if (adRes.acceptability_80) zoneLabel = "80% Acceptability";
          else zoneLabel = to > adRes.tmp_cmf_80_up! ? "Too Warm" : "Too Cool";
        } else {
          if (adRes.acceptability_cat_i) zoneLabel = "Category I";
          else if (adRes.acceptability_cat_ii) zoneLabel = "Category II";
          else if (adRes.acceptability_cat_iii) zoneLabel = "Category III";
          else zoneLabel = to > adRes.tmp_cmf_cat_iii_up! ? "Too Warm" : "Too Cool";
        }

        const hoverMetadata = [getAdaptiveHoverMetadata(adRes, to, standardMode, unitSystem)];

        traces.push(buildInputScatterTrace({
          inputId,
          x: roundValue(inputX),
          y: roundValue(inputY),
          showLegend: showInputLegend,
          hovertemplate: getAdaptiveHoverTemplate({
            xLabel: xMeta.label,
            xUnits: xMeta.displayUnits[unitSystem],
            yLabel: yMeta.label,
            yUnits: yMeta.displayUnits[unitSystem],
            standard: standardMode,
            inputLabel: inputDisplayMetaById[inputId]?.label ?? "Input",
          }),
          hoverMetadata,
        }));
      } catch {
        // Ignore errors.
      }
    });

    // Return the traces and layout.
    return {
      traces,
      layout: {
        title: `Adaptive Dynamic Chart (${xMeta.label} vs ${yMeta.label})`,
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

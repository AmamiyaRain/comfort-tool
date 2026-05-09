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

    const trmPoints: number[] = [...baseTrmPoints];
    if (!isAshrae) {
      const findTransitionTrm = (limit: number) => {
        const offset = 18.8;
        const slope = 0.33;
        return (25.0 - limit - offset) / slope;
      };
      const tI = findTransitionTrm(2.0);
      const tII = findTransitionTrm(3.0);
      const tIII = findTransitionTrm(4.0);
      if (tI && tI > trmMin && tI < trmMax) trmPoints.push(tI - 0.0001, tI + 0.0001);
      if (tII && tII > trmMin && tII < trmMax) trmPoints.push(tII - 0.0001, tII + 0.0001);
      if (tIII && tIII > trmMin && tIII < trmMax) trmPoints.push(tIII - 0.0001, tIII + 0.0001);
    }
    trmPoints.sort((a, b) => a - b);

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
        const neutralOperativeTemperature = 24;
        const baseResult = calculateAdaptive(
          {
            ...baselineInput.payload,
            tdb: neutralOperativeTemperature,
            tr: neutralOperativeTemperature,
            trm,
            v,
            units: UnitSystem.SI,
          },
          AdaptiveStandardMode.Ashrae,
        );
        const upper80Result = calculateAdaptive(
          {
            ...baselineInput.payload,
            tdb: baseResult.tmp_cmf_80_up,
            tr: baseResult.tmp_cmf_80_up,
            trm,
            v,
            units: UnitSystem.SI,
          },
          AdaptiveStandardMode.Ashrae,
        );
        const upper90Result = calculateAdaptive(
          {
            ...baselineInput.payload,
            tdb: baseResult.tmp_cmf_90_up,
            tr: baseResult.tmp_cmf_90_up,
            trm,
            v,
            units: UnitSystem.SI,
          },
          AdaptiveStandardMode.Ashrae,
        );
        lower80.push(baseResult.tmp_cmf_80_low);
        upper80.push(upper80Result.tmp_cmf_80_up);
        lower90.push(baseResult.tmp_cmf_90_low);
        upper90.push(upper90Result.tmp_cmf_90_up);
      } else {
        const t_cmf = 0.33 * trm + 18.8;
        const upI_base = t_cmf + 2.0;
        const upI = upI_base > 25.0 ? upI_base + getCe(v, upI_base + getCe(v, 25.1)) : upI_base;
        const upII_base = t_cmf + 3.0;
        const upII = upII_base > 25.0 ? upII_base + getCe(v, upII_base + getCe(v, 25.1)) : upII_base;
        const upIII_base = t_cmf + 4.0;
        const upIII = upIII_base > 25.0 ? upIII_base + getCe(v, upIII_base + getCe(v, 25.1)) : upIII_base;
        lowerI.push(t_cmf - 3.0);
        upperI.push(upI);
        lowerII.push(t_cmf - 4.0);
        upperII.push(upII);
        lowerIII.push(t_cmf - 5.0);
        upperIII.push(upIII);
      }
    });

    const addPolygon = (lower: number[], upper: number[], nameSuffix: string) => {
      const polygonX = trmPoints.concat(trmPoints.slice().reverse());
      const polygonY = lower.concat(upper.slice().reverse());
      const xLabel = `${isAshrae ? "Prevailing" : "Running"} ${fieldMetaByKey[FieldKey.PrevailingMeanOutdoorTemperature].label.toLowerCase()}`;
      const yLabel = fieldMetaByKey[FieldKey.OperativeTemperature].label;
      traces.push(buildComfortPolygonTrace({
        inputId: baselineInput.inputId,
        nameSuffix,
        polygonX: polygonX.map((x) => roundValue(convertFieldValueFromSi(FieldKey.PrevailingMeanOutdoorTemperature, x, unitSystem))),
        polygonY: polygonY.map((y) => roundValue(convertFieldValueFromSi(FieldKey.DryBulbTemperature, y, unitSystem))),
        hovertemplate: `${xLabel}: %{x:.1f} ${temperatureDisplayUnits}<br>${yLabel}: %{y:.1f} ${temperatureDisplayUnits}<extra></extra>`,
        isZone: true,
      }));
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

  inputs.forEach(({ inputId, payload: inputPayload }) => {
    const to = t_o(inputPayload.tdb, inputPayload.tr, inputPayload.v, standardMode === AdaptiveStandardMode.Ashrae ? "ASHRAE" : "ISO");
      const xLabel = `${isAshrae ? "Prevailing" : "Running"} ${fieldMetaByKey[FieldKey.PrevailingMeanOutdoorTemperature].label.toLowerCase()}`;
      const yLabel = fieldMetaByKey[FieldKey.OperativeTemperature].label;
      traces.push(buildInputScatterTrace({
        inputId,
        x: roundValue(convertFieldValueFromSi(FieldKey.PrevailingMeanOutdoorTemperature, inputPayload.trm, unitSystem)),
        y: roundValue(convertFieldValueFromSi(FieldKey.DryBulbTemperature, to, unitSystem)),
        showLegend: showInputLegend,
        hovertemplate: `${inputDisplayMetaById[inputId]?.label ?? "Input"}<br>` +
          `${xLabel}: %{x:.1f} ${temperatureDisplayUnits}<br>` +
          `${yLabel}: %{y:.1f} ${temperatureDisplayUnits}<extra></extra>`,
        markerSize: 14,
      }));
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

    const xPoints = 300;
    const yPoints = 300;
    const xValues: number[] = [];
    const yValues: number[] = [];

    for (let i = 0; i < xPoints; i++) xValues.push(xMin + (xMax - xMin) * (i / (xPoints - 1)));
    for (let i = 0; i < yPoints; i++) yValues.push(yMin + (yMax - yMin) * (i / (yPoints - 1)));

    const zValues: (number | null)[][] = [];
    const textValues: string[][] = [];

    for (let i = 0; i < yPoints; i++) {
      const row: (number | null)[] = [];
      const textRow: string[] = [];
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

          if (standardMode === AdaptiveStandardMode.Ashrae) {
            const isWarm = tdb > result.t_cmf;

            if (result.acceptability_90) {
              row.push(3);
              textRow.push(adaptiveAshraeZones[2].label);
            } else if (result.acceptability_80) {
              row.push(isWarm ? 4 : 2);
              textRow.push(adaptiveAshraeZones[1].label);
            } else {
              row.push(isWarm ? 5 : 1);
              textRow.push(isWarm ? adaptiveAshraeZones[3].label : adaptiveAshraeZones[0].label);
            }
          } else {
            const t_cmf = 0.33 * trm + 18.8;
            const isWarm = tdb > t_cmf;

            if (result.acceptability_cat_i) {
              row.push(4);
              textRow.push(adaptiveEnZones[3].label);
            } else if (result.acceptability_cat_ii) {
              row.push(isWarm ? 5 : 3);
              textRow.push(adaptiveEnZones[2].label);
            } else if (result.acceptability_cat_iii) {
              row.push(isWarm ? 6 : 2);
              textRow.push(adaptiveEnZones[1].label);
            } else {
              row.push(isWarm ? 7 : 1);
              textRow.push(isWarm ? adaptiveEnZones[4].label : adaptiveEnZones[0].label);
            }
          }
        } catch {
          row.push(null);
          textRow.push("Error");
        }
      }
      zValues.push(row);
      textValues.push(textRow);
    }

    // Add the contour trace to the traces.
    traces.push(buildContourTrace({
      name: "Acceptability Zones",
      x: xValues,
      y: yValues,
      z: zValues as any,
      text: textValues,
      colorscale: standardMode === AdaptiveStandardMode.Ashrae ? ADAPTIVE_ASHRAE_COLORSCALE : ADAPTIVE_EN_COLORSCALE,
      contours: {
        ...ADAPTIVE_CONTOURS,
        end: standardMode === AdaptiveStandardMode.Ashrae ? 4.5 : 6.5,
      },
      showscale: false,
      hovertemplate: `${xMeta.label}: %{x:.2f} ${xMeta.displayUnits[unitSystem]}<br>${yMeta.label}: %{y:.2f} ${yMeta.displayUnits[unitSystem]}<br><b>Zone: %{text}</b><extra></extra>`,
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
        
        let zoneLabel = "";
        if (standardMode === AdaptiveStandardMode.Ashrae) {
          if (adRes.acceptability_90) zoneLabel = "90% Acceptability";
          else if (adRes.acceptability_80) zoneLabel = "80% Acceptability";
          else zoneLabel = inputPayload.tdb > adRes.t_cmf ? "Too Warm" : "Too Cool";
        } else {
          if (adRes.acceptability_cat_i) zoneLabel = "Category I";
          else if (adRes.acceptability_cat_ii) zoneLabel = "Category II";
          else if (adRes.acceptability_cat_iii) zoneLabel = "Category III";
          else zoneLabel = inputPayload.tdb > (0.33 * inputPayload.trm + 18.8) ? "Too Warm" : "Too Cool";
        }
        adaptiveText = `<br><b>Zone: ${zoneLabel}</b>`;
      } catch {
        // Ignore errors.
      }

      traces.push(buildInputScatterTrace({
        inputId,
        x: roundValue(inputX),
        y: roundValue(inputY),
        showLegend: showInputLegend,
        hovertemplate: `${inputDisplayMetaById[inputId]?.label ?? "Input"}<br>${xMeta.label}: %{x:.2f} ${xMeta.displayUnits[unitSystem]}<br>${yMeta.label}: %{y:.2f} ${yMeta.displayUnits[unitSystem]}${adaptiveText}<extra></extra>`,
      }));
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

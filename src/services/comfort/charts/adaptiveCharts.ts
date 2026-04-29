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
  AdaptiveRequestDto,
} from "../../../models/comfortDtos";
import { convertFieldValueFromSi, convertFieldValueToSi } from "../../units";
import { getCompareInputs, roundValue } from "../helpers";
import { buildComfortPolygonTrace, buildInputScatterTrace, buildContourTrace } from "./plotlyBuilders";
import { AdaptiveStandardMode } from "../../../models/inputModes";
import { getCe, calculateAdaptive } from "../adaptive";
import { InputId as InputIdType } from "../../../models/inputSlots";
import type { FieldKey as FieldKeyType } from "../../../models/fieldKeys";

// Discrete colorscales for Adaptive Dynamic Chart (Option A)
const ADAPTIVE_ASHRAE_COLORSCALE = [
  [0, "#3b82f6"],     // 1: Too cool (Blue)
  [0.25, "#3b82f6"],
  [0.25, "#86efac"],  // 2: 80% Acceptability (Light Green)
  [0.5, "#86efac"],
  [0.5, "#22c55e"],   // 3: 90% Acceptability (Green)
  [0.75, "#22c55e"],
  [0.75, "#ef4444"],  // 4: Too warm (Red)
  [1, "#ef4444"],
];

const ADAPTIVE_EN_COLORSCALE = [
  [0, "#3b82f6"],     // 1: Too cool (Blue)
  [0.2, "#3b82f6"],
  [0.2, "#fde047"],   // 2: Category III (Yellow)
  [0.4, "#fde047"],
  [0.4, "#86efac"],   // 3: Category II (Light Green)
  [0.6, "#86efac"],
  [0.6, "#22c55e"],   // 4: Category I (Green)
  [0.8, "#22c55e"],
  [0.8, "#ef4444"],   // 5: Too warm (Red)
  [1, "#ef4444"],
];

/**
 * Builds the adaptive comfort chart (Prevailing Mean Outdoor Temperature (TRM) vs Operative Temperature (To)).
 * It maps out comfort boundary polygons (80%/90% or Cat I/II/III) and scatter points for inputs.
 *
 * @param payload Adaptive chart's inputs request data transfer object (DTO).
 * @param standardMode The selected standard (ASHRAE 55 or EN 16798-1).
 * @param unitSystem The active unit system (SI or IP).
 * @returns Complete plotly response bindings (traces and layout).
 */
export function buildAdaptiveChart(
  // Adaptive Chart's Inputs Request Data Transfer Object (DTO).
  payload: AdaptiveChartInputsRequestDto,
  // Adaptive Chart's Standard Mode.
  standardMode: AdaptiveStandardMode,
  // Adaptive Chart's Unit System.
  unitSystem: UnitSystemType = UnitSystem.SI,
): PlotlyChartResponseDto {
  // Get the inputs for the chart.
  const inputs = getCompareInputs(payload.inputs);
  // Show input legend if there are multiple inputs.
  const showInputLegend = inputs.length > 1;
  // Get the temperature's display units.
  const temperatureDisplayUnits = fieldMetaByKey[FieldKey.DryBulbTemperature].displayUnits[unitSystem];
  // Create traces.
  const traces: PlotTraceDto[] = [];
  // Check if the standard is ASHRAE.
  const isAshrae = standardMode === AdaptiveStandardMode.Ashrae;
  // Set prevailing mean outdoor temperature (TRM) limits.
  const trmMin = 10;
  const trmMax = isAshrae ? 33.5 : 30;

  // Build the background comfort zones and data points for each input.
  inputs.forEach(({ inputId, payload: inputPayload }) => {
    const v = inputPayload.v;
    // Generate more points along the TRM axis for smoother boundary curves and sharp steps.
    const baseTrmPoints = Array.from({ length: 200 }, (_, i) => trmMin + ((trmMax - trmMin) * i) / 199);
    
    // Find transition TRM values where the boundary crosses 25°C.
    const findTransitionTrm = (limit: number) => {
      // T_cmf + limit = 25
      // 0.3x * trm + offset + limit = 25
      const offset = isAshrae ? 17.8 : 18.8;
      const slope = isAshrae ? 0.31 : 0.33;
      
      // The TRM where the base boundary hits 25.0
      return (25.0 - limit - offset) / slope;
    };

    const trmPoints: number[] = [...baseTrmPoints];
    if (isAshrae) {
      const t80 = findTransitionTrm(3.5);
      const t90 = findTransitionTrm(2.5);
      if (t80 && t80 > trmMin && t80 < trmMax) trmPoints.push(t80 - 0.0001, t80 + 0.0001);
      if (t90 && t90 > trmMin && t90 < trmMax) trmPoints.push(t90 - 0.0001, t90 + 0.0001);
    } else {
      const tI = findTransitionTrm(2.0);
      const tII = findTransitionTrm(3.0);
      const tIII = findTransitionTrm(4.0);
      if (tI && tI > trmMin && tI < trmMax) trmPoints.push(tI - 0.0001, tI + 0.0001);
      if (tII && tII > trmMin && tII < trmMax) trmPoints.push(tII - 0.0001, tII + 0.0001);
      if (tIII && tIII > trmMin && tIII < trmMax) trmPoints.push(tIII - 0.0001, tIII + 0.0001);
    }
    trmPoints.sort((a, b) => a - b);

    // ASHRAE acceptability limits arrays.
    let lower80: number[] = [];
    let upper80: number[] = [];
    let lower90: number[] = [];
    let upper90: number[] = [];

    // EN 16798-1 category limits arrays.
    let lowerI: number[] = [];
    let upperI: number[] = [];
    let lowerII: number[] = [];
    let upperII: number[] = [];
    let lowerIII: number[] = [];
    let upperIII: number[] = [];

    trmPoints.forEach((trm) => {
      if (isAshrae) {
        // ASHRAE 55 neutral temperature formula.
        const t_cmf = 0.31 * trm + 17.8;
        
        const up80_base = t_cmf + 3.5;
        const up80 = up80_base > 25.0 ? up80_base + getCe(v, up80_base + getCe(v, 25.1)) : up80_base;

        const up90_base = t_cmf + 2.5;
        const up90 = up90_base > 25.0 ? up90_base + getCe(v, up90_base + getCe(v, 25.1)) : up90_base;

        lower80.push(t_cmf - 3.5);
        upper80.push(up80);
        lower90.push(t_cmf - 2.5);
        upper90.push(up90);
      } else {
        // EN 16798-1 neutral temperature formula.
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

    /*
    This is a helper to create a shaded polygon area between two boundary lines.
    To create a closed polygon, we go from left to right along the lower limit
    and then from right to left along the upper limit to close the polygon.
    */
    const addPolygon = (lower: number[], upper: number[], nameSuffix: string) => {
      // Horizontal coordinates: Prevailing mean outdoor temperature (TRM) loop.
      const polygonX = trmPoints.concat(trmPoints.slice().reverse());
      // Vertical coordinates: Adaptive comfort limits loop.
      const polygonY = lower.concat(upper.slice().reverse());

      // Build the polygon and add it to chart.
      traces.push(buildComfortPolygonTrace({
        // Input ID.
        inputId,
        // Name suffix.
        nameSuffix,
        // Horizontal coordinates (TRM) converted to display units.
        polygonX: polygonX.map((x) => roundValue(convertFieldValueFromSi(FieldKey.PrevailingMeanOutdoorTemperature, x, unitSystem))),
        // Vertical coordinates (Adaptive comfort limits) converted to display units.
        polygonY: polygonY.map((y) => roundValue(convertFieldValueFromSi(FieldKey.DryBulbTemperature, y, unitSystem))),
        // Tooltip text shown when hovering over the shaded comfort zone.
        hovertemplate: `Trm %{x:.1f} ${temperatureDisplayUnits}<br>To %{y:.1f} ${temperatureDisplayUnits}<extra></extra>`,
      }));
    };
    // Create the comfort zones.
    if (isAshrae) {
      // Create the comfort zones for ASHRAE (80% and 90% acceptability).
      addPolygon(lower80, upper80, "80% Acceptability");
      addPolygon(lower90, upper90, "90% Acceptability");
    } else {
      // Create the comfort zones for EN 16798-1 (Categories I, II, and III).
      addPolygon(lowerIII, upperIII, "Category III");
      addPolygon(lowerII, upperII, "Category II");
      addPolygon(lowerI, upperI, "Category I");
    }

    // Calculate current indoor operative temperature (To) for the scatter point.
    const to = t_o(inputPayload.tdb, inputPayload.tr, inputPayload.v, standardMode === AdaptiveStandardMode.Ashrae ? "ASHRAE" : "ISO");
    // Convert calculated values (SI) to display units (SI or IP) for the chart axes.
    const toConverted = convertFieldValueFromSi(FieldKey.DryBulbTemperature, to, unitSystem);
    const trmConverted = convertFieldValueFromSi(FieldKey.PrevailingMeanOutdoorTemperature, inputPayload.trm, unitSystem);

    // Add the data point representing the current environment.
    traces.push(buildInputScatterTrace({
      // Input ID.
      inputId,
      // X-coordinate: Prevailing mean outdoor temperature (TRM) converted to display units.
      x: roundValue(trmConverted),
      // Y-coordinate: Indoor operative temperature (To) converted to display units.
      y: roundValue(toConverted),
      // Show legend if there are multiple inputs.
      showLegend: showInputLegend,
      // Tooltip text shown when hovering over the shaded comfort zone.
      hovertemplate: `${inputDisplayMetaById[inputId]?.label ?? "Input"}<br>Trm %{x:.1f} ${temperatureDisplayUnits}<br>To %{y:.1f} ${temperatureDisplayUnits}<extra></extra>`,
    }));
  });

  // Return the chart traces and layout.
  return {
    traces,
    layout: {
      // Chart title.
      title: isAshrae ? "ASHRAE 55 Adaptive Chart" : "EN 16798-1 Adaptive Chart",
      // Background color.
      paper_bgcolor: "#ffffff",
      plot_bgcolor: "#f8fafc",
      // Show legend.
      showlegend: true,
      // Margin around the chart.
      margin: { l: 64, r: 24, t: 48, b: 80 },
      // X-axis settings.
      xaxis: {
        // X-axis title. Displays first string if ASHRAE-55, or second string if EN 16798-1.
        title: isAshrae
          ? `Prevailing mean outdoor temperature (${temperatureDisplayUnits})`
          : `Running mean outdoor temperature (${temperatureDisplayUnits})`,
        // X-axis range.
        range: [
          convertFieldValueFromSi(FieldKey.PrevailingMeanOutdoorTemperature, 10, unitSystem),
          convertFieldValueFromSi(FieldKey.PrevailingMeanOutdoorTemperature, trmMax, unitSystem),
        ],
        // X-axis grid color.
        gridcolor: "#e2e8f0",
      },
      // Y-axis settings.
      yaxis: {
        // Y-axis title. 
        title: `Operative temperature (${temperatureDisplayUnits})`,
        // Y-axis range.
        range: [
          convertFieldValueFromSi(FieldKey.DryBulbTemperature, 10, unitSystem),
          convertFieldValueFromSi(FieldKey.DryBulbTemperature, 40, unitSystem),
        ],
        // Y-axis grid color.
        gridcolor: "#e2e8f0",
      },
      // Legend settings.
      legend: { orientation: "h", x: 0, y: 1.1 },
      // Chart height.
      height: 480,
    },
    // Annotations.
    annotations: [],
    // The source of the calculation, indicating it was generated directly in the browser.
    source: CalculationSource.FrontendGenerated,
  };
}

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
    const xPoints = 50;
    const yPoints = 50;
    const xValues: number[] = [];
    const yValues: number[] = [];

    for (let i = 0; i < xPoints; i++) xValues.push(xMin + (xMax - xMin) * (i / (xPoints - 1)));
    for (let i = 0; i < yPoints; i++) yValues.push(yMin + (yMax - yMin) * (i / (yPoints - 1)));

    const zValues: (number | null)[][] = [];
    const textValues: string[][] = [];

    const isAshrae = standardMode === AdaptiveStandardMode.Ashrae;

    if (activeInputPayload) {
      const xKey = (dynamicXAxis === FieldKey.RelativeAirSpeed ? "v" : dynamicXAxis) as string;
      const yKey = (dynamicYAxis === FieldKey.RelativeAirSpeed ? "v" : dynamicYAxis) as string;

      for (let i = 0; i < yPoints; i++) {
        const row: (number | null)[] = [];
        const textRow: string[] = [];
        const ySi = convertFieldValueToSi(dynamicYAxis, yValues[i], unitSystem);

        for (let j = 0; j < xPoints; j++) {
          const xSi = convertFieldValueToSi(dynamicXAxis, xValues[j], unitSystem);

          const pointArgs = {
            ...activeInputPayload,
            [xKey]: xSi,
            [yKey]: ySi,
          } as AdaptiveRequestDto;

          // Skip calculation if any core parameter is NaN to avoid library hangs.
          if (Number.isNaN(pointArgs.tdb) || Number.isNaN(pointArgs.tr) || Number.isNaN(pointArgs.trm) || Number.isNaN(pointArgs.v)) {
            row.push(null);
            textRow.push("Out of range");
            continue;
          }

          try {
            const result = calculateAdaptive(pointArgs, standardMode);
            
            if (isAshrae) {
              if (result.acceptability_90) {
                row.push(3);
                textRow.push("90% Acceptability");
              } else if (result.acceptability_80) {
                row.push(2);
                textRow.push("80% Acceptability");
              } else if (result.status_80 === "Too cool") {
                row.push(1);
                textRow.push("Too cool");
              } else {
                row.push(4);
                textRow.push("Too warm");
              }
            } else {
              if (result.acceptability_cat_i) {
                row.push(4);
                textRow.push("Category I");
              } else if (result.acceptability_cat_ii) {
                row.push(3);
                textRow.push("Category II");
              } else if (result.acceptability_cat_iii) {
                row.push(2);
                textRow.push("Category III");
              } else if (result.status_cat_iii === "Too cool") {
                row.push(1);
                textRow.push("Too cool");
              } else {
                row.push(5);
                textRow.push("Too warm");
              }
            }
          } catch (e) {
            row.push(null);
            textRow.push("Out of range");
          }
        }
        zValues.push(row);
        textValues.push(textRow);
      }
    }

    const traces: PlotTraceDto[] = [];

    if (zValues.length > 0) {
      const ashraeColorScale: any = [
        [0, "#3b82f6"], // Too cool (Value 1)
        [0.25, "#3b82f6"],
        [0.25, "#86efac"], // 80% Acceptability (Value 2)
        [0.5, "#86efac"],
        [0.5, "#16a34a"], // 90% Acceptability (Value 3)
        [0.75, "#16a34a"],
        [0.75, "#ef4444"], // Too warm (Value 4)
        [1, "#ef4444"],
      ];

      const enColorScale: any = [
        [0, "#3b82f6"], // Too cool (Value 1)
        [0.2, "#3b82f6"],
        [0.2, "#86efac"], // Category III (Value 2)
        [0.4, "#86efac"],
        [0.4, "#4ade80"], // Category II (Value 3)
        [0.6, "#4ade80"],
        [0.6, "#16a34a"], // Category I (Value 4)
        [0.8, "#16a34a"],
        [0.8, "#ef4444"], // Too warm (Value 5)
        [1, "#ef4444"],
      ];

      traces.push({
        type: "heatmap",
        name: "Adaptive Zones",
        x: xValues,
        y: yValues,
        z: zValues,
        text: textValues as any,
        colorscale: isAshrae ? ashraeColorScale : enColorScale,
        showscale: false,
        zmin: 1,
        zmax: isAshrae ? 4 : 5,
        hoverinfo: "text",
        hovertemplate: `${xMeta.label}: %{x:.2f} ${xMeta.displayUnits[unitSystem]}<br>${yMeta.label}: %{y:.2f} ${yMeta.displayUnits[unitSystem]}<br><b>Zone: %{text}</b><extra></extra>`,
      } as any);
    }

  inputs.forEach(({ inputId, payload: inputPayload }) => {
    const xKey = (dynamicXAxis === FieldKey.RelativeAirSpeed ? "v" : dynamicXAxis) as string;
    const yKey = (dynamicYAxis === FieldKey.RelativeAirSpeed ? "v" : dynamicYAxis) as string;

    let inputX = inputPayload[xKey as keyof typeof inputPayload] as number;
    let inputY = inputPayload[yKey as keyof typeof inputPayload] as number;
    
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
      title: `${isAshrae ? 'ASHRAE 55' : 'EN 16798-1'} Adaptive Dynamic Chart (${xMeta.label} vs ${yMeta.label})`,
      paper_bgcolor: "#ffffff",
      plot_bgcolor: "#f8fafc",
      showlegend: true,
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

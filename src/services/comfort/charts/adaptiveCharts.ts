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
import { convertFieldValueFromSi } from "../../units";
import { getCompareInputs, roundValue } from "../helpers";
import { buildComfortPolygonTrace, buildInputScatterTrace } from "./plotlyBuilders";
import { AdaptiveStandardMode } from "../../../models/inputModes";
import { getCe } from "../adaptive";

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
    // Generate 24 points along the TRM axis for smooth boundary curves.
    const trmPoints = Array.from({ length: 24 }, (_, i) => trmMin + ((trmMax - trmMin) * i) / 23);

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
        // Calculate upper bounds including potential Cooling Effect (CE).
        let up80_no_ce = t_cmf + 3.5;
        let ce80 = getCe(v, up80_no_ce);
        let up80 = up80_no_ce + ce80;

        let up90_no_ce = t_cmf + 2.5;
        let ce90 = getCe(v, up90_no_ce);
        let up90 = up90_no_ce + ce90;

        lower80.push(t_cmf - 3.5);
        upper80.push(up80);
        lower90.push(t_cmf - 2.5);
        upper90.push(up90);
      } else {
        // EN 16798-1 neutral temperature formula.
        const t_cmf = 0.33 * trm + 18.8;
        let upI_no_ce = t_cmf + 2.0;
        let ceI = getCe(v, upI_no_ce);
        let upI = upI_no_ce + ceI;

        let upII_no_ce = t_cmf + 3.0;
        let ceII = getCe(v, upII_no_ce);
        let upII = upII_no_ce + ceII;

        let upIII_no_ce = t_cmf + 4.0;
        let ceIII = getCe(v, upIII_no_ce);
        let upIII = upIII_no_ce + ceIII;

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
      // Show legend if there are multiple inputs.
      showlegend: showInputLegend,
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

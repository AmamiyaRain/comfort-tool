import { inputChartStyleById, inputDisplayMetaById } from "../../../models/inputSlotPresentation";
import type { InputId as InputIdType } from "../../../models/inputSlots";
import type { PlotAnnotationDto, PlotTraceDto } from "../../../models/comfortDtos";

/**
 * Builds a trace for plotting an input as a scatter marker on the chart.
 * Automatically injects the correct styling logic for the assigned `InputId`.
 * This builder is heavily utilized throughout `pmvCharts.ts`, `utciCharts.ts`, and `sharedCharts.ts` to seamlessly project user inputs.
 *
 * @param inputId The source input identifier to style this marker for.
 * @param xValue The x-coordinate location.
 * @param yValue The y-coordinate location.
 * @param showLegend Whether to show this trace in the legend.
 * @param hovertemplate The hover formatting string for this marker.
 * @param markerSize Optional marker size (defaults to 12).
 * @returns A Scatter trace PlotTraceDto representing the input.
 */
export function buildInputScatterTrace(
  inputId: InputIdType,
  xValue: number,
  yValue: number,
  showLegend: boolean,
  hovertemplate: string,
  markerSize: number = 12,
): PlotTraceDto {
  const inputStyle = inputChartStyleById[inputId];
  const inputLabel = inputDisplayMetaById[inputId].label;

  return {
    type: "scatter",
    mode: "markers",
    name: inputLabel,
    x: [xValue],
    y: [yValue],
    showlegend: showLegend,
    line: {},
    marker: { color: inputStyle.marker, size: markerSize },
    hovertemplate,
  };
}

/**
 * Builds a visual polygon trace representing an input's comfort bounds.
 * Automatically attaches the layout aesthetics correctly matched to the given `InputId`.
 * This is primarily consumed by `pmvCharts.ts` and `sharedCharts.ts` whenever drawing spatial thresholds for PMV and Relative Humidity models.
 *
 * @param inputId The assigned Input identifier generating this comfort zone.
 * @param nameSuffix A text suffix to append to the input name for the trace name.
 * @param polygonX An array of X-coordinates tracing the polygon boundary.
 * @param polygonY An array of Y-coordinates tracing the polygon boundary.
 * @param hovertemplate Optional hover formatting inside the zone.
 * @returns A filled Scatter trace PlotTraceDto representing the comfort polygon.
 */
export function buildComfortPolygonTrace(
  inputId: InputIdType,
  nameSuffix: string,
  polygonX: number[],
  polygonY: number[],
  hovertemplate: string,
): PlotTraceDto {
  const inputStyle = inputChartStyleById[inputId];
  const inputLabel = inputDisplayMetaById[inputId].label;

  return {
    type: "scatter",
    mode: "lines",
    name: `${inputLabel} ${nameSuffix}`,
    x: polygonX,
    y: polygonY,
    showlegend: false,
    fill: "toself",
    fillcolor: inputStyle.fill,
    line: { color: inputStyle.line, width: 1.5 },
    marker: {},
    hovertemplate,
  };
}

/**
 * A generic helper for plotting simple line boundaries, such as relative humidity curves.
 * This is typically used in `pmvCharts.ts` to map baseline curves representing 10% step increments over psychrometric limits.
 *
 * @param name Name of the trace.
 * @param xValues Array of X-coordinates.
 * @param yValues Array of Y-coordinates.
 * @param color The hex/css string color of the line.
 * @param hovertemplate Standard Plotly hovertext template.
 * @returns A line mode Scatter trace PlotTraceDto.
 */
export function buildLineTrace(
  name: string,
  xValues: number[],
  yValues: number[],
  color: string,
  hovertemplate: string,
): PlotTraceDto {
  return {
    type: "scatter",
    mode: "lines",
    name,
    x: xValues,
    y: yValues,
    showlegend: false,
    line: { color, width: 1.2 },
    marker: {},
    hovertemplate,
  };
}

/**
 * Builds an annotation marker placed near an input dot to describe it, styled sequentially.
 * This serves as the universal label connector in all models (`pmvCharts.ts`, `utciCharts.ts`, `sharedCharts.ts`), binding descriptive text to active data points.
 *
 * @param inputId The identifier from which specific styling logic is sourced.
 * @param xValue The exact X coordinate of the target element.
 * @param yValue The exact Y coordinate of the target element.
 * @param text The inner HTML or text string for the annotation.
 * @param showArrow Boolean tracking if an arrow pointing to the x/y string is shown.
 * @param textSize Font size assigned to the text, integer defaults to 11.
 * @returns A generic PlotAnnotationDto.
 */
export function buildInputAnnotation(
  inputId: InputIdType,
  xValue: number,
  yValue: number,
  text: string,
  showArrow: boolean,
  textSize: number = 11,
): PlotAnnotationDto {
  const inputStyle = inputChartStyleById[inputId];

  return {
    x: xValue,
    y: yValue,
    text,
    showarrow: showArrow,
    font: { size: textSize, color: inputStyle.line },
  };
}

/**
 * Builds a generic text annotation without a particular Input styling.
 * Useful for marking universal axes points, thresholds, etc.
 * It is directly leveraged by `utciCharts.ts` to append standard global label overlays such as 'no thermal stress' onto fixed stress tier bands.
 *
 * @param xValue The X coordinate to stamp the annotation.
 * @param yValue The Y coordinate to stamp the annotation.
 * @param text The HTML/string text inside the markup.
 * @param textSize Font size mapping.
 * @param color Color hex/string for text markup.
 * @returns The formed PlotAnnotationDto.
 */
export function buildTextAnnotation(
  xValue: number,
  yValue: number,
  text: string,
  textSize: number = 8,
  color: string = "#1f2937",
): PlotAnnotationDto {
  return {
    x: xValue,
    y: yValue,
    text,
    showarrow: false,
    font: { size: textSize, color },
  };
}

/**
 * Assembles a background boundary layer shape object, normally applied
 * to mark thresholds (e.g. UTCI Stress Band horizontal strips).
 * This tool is fundamentally necessary for `utciCharts.ts`, enabling declarative plotting of fixed threshold rectangles for visual compliance mapping.
 *
 * @param x0 Left edge (X0 constraint).
 * @param x1 Right edge (X1 constraint).
 * @param y0 Bottom edge (Y0 constraint).
 * @param y1 Top edge (Y1 constraint).
 * @param fillColor The hex background color mapping over the rectangle geometry.
 * @param opacity Total opacity (alpha layer, typically 0.0 ~ 1.0).
 * @param xref Plotly axis constraint mapping ("x" absolute mapping or "paper" relative mapping). Defaults to 'x'.
 * @param yref Plotly axis constraint mapping ("y" absolute mapping or "paper" relative mapping). Defaults to 'paper'.
 * @returns Assmbled shape definitions ready to pass into the Plotly layout config.
 */
export function buildRectangleSelectionShape(
  x0: number,
  x1: number,
  y0: number,
  y1: number,
  fillColor: string,
  opacity: number,
  xref: "x" | "paper" = "x",
  yref: "y" | "paper" = "paper",
) {
  return {
    type: "rect" as const,
    xref,
    yref,
    x0,
    x1,
    y0,
    y1,
    fillcolor: fillColor,
    line: { width: 0 },
    opacity,
  };
}

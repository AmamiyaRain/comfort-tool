import { inputChartStyleById, inputDisplayMetaById } from "../../../models/inputSlotPresentation";
import type { InputId as InputIdType } from "../../../models/inputSlots";
import type { PlotAnnotationDto, PlotTraceDto } from "../../../models/comfortDtos";

export interface InputScatterTraceOptions {
  inputId: InputIdType;
  x: number;
  y: number;
  showLegend: boolean;
  hovertemplate: string;
  markerSize?: number;
  color?: string;
}

/**
 * Builds a trace for plotting an input as a scatter marker on the chart.
 * Automatically injects the correct styling logic for the assigned `InputId`.
 * This builder is heavily utilized throughout `pmvCharts.ts`, `utciCharts.ts`, and `sharedCharts.ts` to seamlessly project user inputs.
 *
 * @param options configuration object defining the marker location and metadata.
 * @returns A Scatter trace PlotTraceDto representing the input.
 */
export function buildInputScatterTrace({
  inputId,
  x,
  y,
  showLegend,
  hovertemplate,
  markerSize = 12,
  color,
}: InputScatterTraceOptions): PlotTraceDto {
  const inputStyle = inputChartStyleById[inputId];
  const inputLabel = inputDisplayMetaById[inputId].label;
  const markerColor = color ?? inputStyle.marker;

  return {
    type: "scatter",
    mode: "markers",
    name: inputLabel,
    x: [x],
    y: [y],
    showlegend: showLegend,
    line: {},
    marker: { color: markerColor, size: markerSize, line: { color: "#000000", width: 1.5 } },
    hovertemplate,
  };
}

export interface ComfortPolygonTraceOptions {
  inputId: InputIdType;
  nameSuffix: string;
  polygonX: number[];
  polygonY: number[];
  hovertemplate: string;
}

/**
 * Builds a visual polygon trace representing an input's comfort bounds.
 * Automatically attaches the layout aesthetics correctly matched to the given `InputId`.
 * This is primarily consumed by `pmvCharts.ts` and `sharedCharts.ts` whenever drawing spatial thresholds for PMV and Relative Humidity models.
 *
 * @param options configuration object defining the geometry and styling.
 * @returns A filled Scatter trace PlotTraceDto representing the comfort polygon.
 */
export function buildComfortPolygonTrace({
  inputId,
  nameSuffix,
  polygonX,
  polygonY,
  hovertemplate,
}: ComfortPolygonTraceOptions): PlotTraceDto {
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

export interface LineTraceOptions {
  name: string;
  x: number[];
  y: number[];
  color: string;
  hovertemplate: string;
}

/**
 * A generic helper for plotting simple line boundaries, such as relative humidity curves.
 * This is typically used in `pmvCharts.ts` to map baseline curves representing 10% step increments over psychrometric limits.
 *
 * @param options configuration object defining the line series.
 * @returns A line mode Scatter trace PlotTraceDto.
 */
export function buildLineTrace({
  name,
  x,
  y,
  color,
  hovertemplate,
}: LineTraceOptions): PlotTraceDto {
  return {
    type: "scatter",
    mode: "lines",
    name,
    x,
    y,
    showlegend: false,
    line: { color, width: 1.2 },
    marker: {},
    hovertemplate,
  };
}

export interface InputAnnotationOptions {
  inputId: InputIdType;
  x: number;
  y: number;
  text: string;
  showArrow: boolean;
  textSize?: number;
}

/**
 * Builds an annotation marker placed near an input dot to describe it, styled sequentially.
 * This serves as the universal label connector in all models (`pmvCharts.ts`, `utciCharts.ts`, `sharedCharts.ts`), binding descriptive text to active data points.
 *
 * @param options configuration object defining the annotation geometry and text.
 * @returns A generic PlotAnnotationDto.
 */
export function buildInputAnnotation({
  inputId,
  x,
  y,
  text,
  showArrow,
  textSize = 11,
}: InputAnnotationOptions): PlotAnnotationDto {
  const inputStyle = inputChartStyleById[inputId];

  return {
    x,
    y,
    text,
    showarrow: showArrow,
    font: { size: textSize, color: inputStyle.line },
  };
}

export interface TextAnnotationOptions {
  x: number;
  y: number;
  text: string;
  textSize?: number;
  color?: string;
}

/**
 * Builds a generic text annotation without a particular Input styling.
 * Useful for marking universal axes points, thresholds, etc.
 * It is directly leveraged by `utciCharts.ts` to append standard global label overlays such as 'no thermal stress' onto fixed stress tier bands.
 *
 * @param options configuration object defining the text placement.
 * @returns The formed PlotAnnotationDto.
 */
export function buildTextAnnotation({
  x,
  y,
  text,
  textSize = 8,
  color = "#1f2937",
}: TextAnnotationOptions): PlotAnnotationDto {
  return {
    x,
    y,
    text,
    showarrow: false,
    font: { size: textSize, color },
  };
}

export interface RectangleSelectionShapeOptions {
  xStart: number;
  xEnd: number;
  yStart: number;
  yEnd: number;
  fillColor: string;
  opacity: number;
  xref?: "x" | "paper";
  yref?: "y" | "paper";
}

/**
 * Assembles a background boundary layer shape object, normally applied
 * to mark thresholds (e.g. UTCI Stress Band horizontal strips).
 * This tool is fundamentally necessary for `utciCharts.ts`, enabling
 * declarative plotting of fixed threshold rectangles for visual compliance mapping.
 *
 * @param options configuration object defining the rectangle geometry and reference frame.
 * @returns Assembled shape definitions ready to pass into the Plotly layout config.
 */
export function buildRectangleSelectionShape({
  xStart,
  xEnd,
  yStart,
  yEnd,
  fillColor,
  opacity,
  xref = "x",
  yref = "paper",
}: RectangleSelectionShapeOptions) {
  return {
    type: "rect" as const,
    xref,
    yref,
    x0: xStart,
    x1: xEnd,
    y0: yStart,
    y1: yEnd,
    fillcolor: fillColor,
    line: { width: 0 },
    opacity,
  };
}

export interface ContourTraceOptions {
  name: string;
  x: number[];
  y: number[];
  z: number[][];
  text?: string[][];
  colorscale: any[];
  contours: any;
  hovertemplate: string;
  showscale?: boolean;
  zmin?: number;
  zmax?: number;
  colorbar?: any;
  opacity?: number;
}

/**
 * Builds a contour trace to visualize multi-zone comfort boundaries.
 *
 * @param options configuration object defining the contour ranges and styling.
 * @returns A PlotTraceDto for the contour plot.
 */
export function buildContourTrace({
  name,
  x,
  y,
  z,
  text,
  colorscale,
  contours,
  hovertemplate,
  showscale = false,
  zmin,
  zmax,
  colorbar,
  opacity,
}: ContourTraceOptions): PlotTraceDto {
  return {
    type: "contour",
    name,
    x,
    y,
    z,
    text,
    colorscale,
    contours,
    showscale,
    zmin,
    zmax,
    colorbar,
    opacity,
    hoverinfo: "all",
    hovertemplate,
  };
}

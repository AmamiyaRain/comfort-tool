import type { UnitSystem } from "./units";

export interface PmvRequestDto {
  tdb: number;
  tr: number;
  vr: number;
  rh: number;
  met: number;
  clo: number;
  wme: number;
  units: UnitSystem;
}

export interface PmvResponseDto {
  pmv: number;
  ppd: number;
  acceptable_80: boolean;
  standard: string;
  source: string;
}

export interface ComfortPointDto {
  tdb: number;
  rh: number;
}

export interface ComfortZoneRequestDto extends PmvRequestDto {
  rh_min: number;
  rh_max: number;
  rh_points: number;
}

export interface ComfortZoneResponseDto {
  cool_edge: ComfortPointDto[];
  warm_edge: ComfortPointDto[];
  source: string;
}

export interface UtciRequestDto {
  tdb: number;
  tr: number;
  v: number;
  rh: number;
  units: UnitSystem;
}

export interface UtciResponseDto {
  utci: number;
  stress_category: string;
  source: string;
}

export interface ChartRangeDto {
  tdb_min: number;
  tdb_max: number;
  tdb_points: number;
  humidity_ratio_min: number;
  humidity_ratio_max: number;
}

export interface PsychrometricChartRequestDto extends ComfortZoneRequestDto {
  chart_range: ChartRangeDto;
  rh_curves: number[];
}

export interface PmvCompareChartRequestDto {
  case_a: ComfortZoneRequestDto;
  case_b: ComfortZoneRequestDto | null;
  case_c: ComfortZoneRequestDto | null;
  chart_range: ChartRangeDto;
  rh_curves: number[];
}

export interface RelativeHumidityChartRequestDto extends PmvCompareChartRequestDto {}

export interface UtciStressChartRequestDto {
  case_a: UtciRequestDto;
  case_b: UtciRequestDto | null;
  case_c: UtciRequestDto | null;
}

export interface PlotTraceDto {
  type: "scatter";
  mode: string;
  name: string;
  x: number[];
  y: number[];
  showlegend?: boolean | null;
  fill?: string | null;
  fillcolor?: string | null;
  line: Record<string, string | number>;
  marker: Record<string, string | number>;
  hovertemplate?: string | null;
}

export interface PlotAnnotationDto {
  x: number;
  y: number;
  text: string;
  showarrow: boolean;
  font: Record<string, string | number>;
}

export interface PlotLayoutDto {
  title: string;
  paper_bgcolor: string;
  plot_bgcolor: string;
  showlegend: boolean;
  margin: Record<string, number>;
  xaxis: Record<string, unknown>;
  yaxis: Record<string, unknown>;
  shapes?: Record<string, unknown>[];
  legend?: Record<string, unknown> | null;
  height?: number | null;
}

export interface PlotlyChartResponseDto {
  traces: PlotTraceDto[];
  layout: PlotLayoutDto;
  annotations: PlotAnnotationDto[];
  source: string;
}

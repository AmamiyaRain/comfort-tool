import type { CalculationSource, ComfortStandard } from "./calculationMetadata";
import type { InputId as InputIdType } from "./inputSlots";
import type { UtciStressCategory } from "./utciStress";
import type { UnitSystem } from "./units";
import type { FieldKey } from "./fieldKeys";

export interface PmvRequestDto {
  tdb: number;
  tr: number;
  vr: number;
  rh: number;
  met: number;
  clo: number;
  wme: number;
  occupantHasAirSpeedControl: boolean;
  units: UnitSystem;
}

export interface PmvResponseDto {
  pmv: number;
  ppd: number;
  vr: number;
  isCompliant: boolean;
  standard: ComfortStandard;
  source: CalculationSource;
}

export interface ComfortPointDto {
  tdb: number;
  rh: number;
}

export interface ComfortZoneRequestDto extends PmvRequestDto {
  rhMin: number;
  rhMax: number;
  rhPoints: number;
}

export interface ComfortZoneResponseDto {
  coolEdge: ComfortPointDto[];
  warmEdge: ComfortPointDto[];
  source: CalculationSource;
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
  stressCategory: UtciStressCategory;
  source: CalculationSource;
}

export interface AdaptiveRequestDto {
  tdb: number;
  tr: number;
  trm: number;
  v: number;
  units: UnitSystem;
}

export interface AdaptiveResponseDto {
  t_cmf: number;
  acceptability_80?: boolean;
  acceptability_90?: boolean;
  acceptability_cat_i?: boolean;
  acceptability_cat_ii?: boolean;
  acceptability_cat_iii?: boolean;
  status_80?: string;
  status_90?: string;
  status_cat_i?: string;
  status_cat_ii?: string;
  status_cat_iii?: string;
  tmp_cmf_80_low?: number;
  tmp_cmf_80_up?: number;
  tmp_cmf_90_low?: number;
  tmp_cmf_90_up?: number;
  tmp_cmf_cat_i_low?: number;
  tmp_cmf_cat_i_up?: number;
  tmp_cmf_cat_ii_low?: number;
  tmp_cmf_cat_ii_up?: number;
  tmp_cmf_cat_iii_low?: number;
  tmp_cmf_cat_iii_up?: number;
  isCompliant: boolean;
  standard: ComfortStandard;
  source: CalculationSource;
}

interface ChartRangeDto {
  tdbMin: number;
  tdbMax: number;
  tdbPoints: number;
  humidityRatioMin: number;
  humidityRatioMax: number;
}

export type CompareInputMap<T> = Partial<Record<InputIdType, T>>;

export interface PmvChartInputsRequestDto {
  inputs: CompareInputMap<ComfortZoneRequestDto>;
  chartRange: ChartRangeDto;
  rhCurves: number[];
}

export interface PmvChartSourceDto {
  chartRequest: PmvChartInputsRequestDto;
  comfortZonesByInput: CompareInputMap<ComfortZoneResponseDto>;
  dynamicXAxis?: string;
  dynamicYAxis?: string;
  baselineInputId?: InputIdType;
}

export interface RelativeHumidityChartRequestDto extends PmvChartInputsRequestDto {}

export interface UtciChartInputsRequestDto {
  inputs: CompareInputMap<UtciRequestDto>;
}

export interface UtciChartSourceDto {
  chartRequest: UtciChartInputsRequestDto;
  dynamicXAxis?: FieldKey;
  dynamicYAxis?: FieldKey;
  baselineInputId?: InputIdType;
}

export interface AdaptiveChartInputsRequestDto {
  inputs: CompareInputMap<AdaptiveRequestDto>;
}

export interface AdaptiveChartSourceDto {
  chartRequest: AdaptiveChartInputsRequestDto;
  resultsByInput: CompareInputMap<AdaptiveResponseDto>;
  standardMode: string;
}

export interface PlotTraceDto {
  type: "scatter" | "contour";
  mode?: string;
  name: string;
  x: number[];
  y: number[];
  z?: number[][];
  text?: string[] | string[][];
  showlegend?: boolean | null;
  fill?: string | null;
  fillcolor?: string | null;
  line?: Record<string, string | number>;
  marker?: Record<string, string | number>;
  colorscale?: any[];
  contours?: any;
  zmin?: number;
  zmax?: number;
  showscale?: boolean;
  hoverinfo?: string;
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
  source: CalculationSource;
}

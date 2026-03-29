import type { CalculationSource, ComfortStandard } from "./calculationMetadata";
import type { InputId as InputIdType } from "./inputSlots";
import type { UtciStressCategory } from "./utciStress";
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
  acceptable80: boolean;
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

export interface ChartRangeDto {
  tdbMin: number;
  tdbMax: number;
  tdbPoints: number;
  humidityRatioMin: number;
  humidityRatioMax: number;
}

export interface PsychrometricChartRequestDto extends ComfortZoneRequestDto {
  chartRange: ChartRangeDto;
  rhCurves: number[];
}

export type CompareInputMap<T> = Partial<Record<InputIdType, T>>;

export interface PmvChartInputsRequestDto {
  inputs: CompareInputMap<ComfortZoneRequestDto>;
  chartRange: ChartRangeDto;
  rhCurves: number[];
}

export interface RelativeHumidityChartRequestDto extends PmvChartInputsRequestDto {}

export interface UtciChartInputsRequestDto {
  inputs: CompareInputMap<UtciRequestDto>;
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
  source: CalculationSource;
}

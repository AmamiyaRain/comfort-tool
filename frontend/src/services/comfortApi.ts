import type {
  ComfortZoneRequestDto,
  ComfortZoneResponseDto,
  PlotAnnotationDto,
  PlotLayoutDto,
  PlotlyChartResponseDto,
  PlotTraceDto,
  PmvCompareChartRequestDto,
  PmvRequestDto,
  PmvResponseDto,
  PsychrometricChartRequestDto,
  RelativeHumidityChartRequestDto,
  UtciRequestDto,
  UtciResponseDto,
  UtciStressChartRequestDto,
} from "../models/dto";

const DEFAULT_API_BASE_URL = "http://localhost:8000";
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? DEFAULT_API_BASE_URL;

async function postJson<TResponse>(path: string, payload: object, signal?: AbortSignal): Promise<TResponse> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    signal,
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed: ${path}`);
  }
  return response.json() as Promise<TResponse>;
}

export function getHealthUrl(): string {
  return `${apiBaseUrl}/api/health`;
}

export function requestPmv(payload: PmvRequestDto, signal?: AbortSignal): Promise<PmvResponseDto> {
  return postJson<PmvResponseDto>("/api/ashrae55/pmv", payload, signal);
}

export function requestComfortZone(
  payload: ComfortZoneRequestDto,
  signal?: AbortSignal,
): Promise<ComfortZoneResponseDto> {
  return postJson<ComfortZoneResponseDto>("/api/ashrae55/comfort-zone", payload, signal);
}

export function requestPsychrometricChart(
  payload: PsychrometricChartRequestDto,
  signal?: AbortSignal,
): Promise<PlotlyChartResponseDto> {
  return postJson<PlotlyChartResponseDto>("/api/ashrae55/psychrometric-chart", payload, signal);
}

export function requestComparePsychrometricChart(
  payload: PmvCompareChartRequestDto,
  signal?: AbortSignal,
): Promise<PlotlyChartResponseDto> {
  return postJson<PlotlyChartResponseDto>("/api/ashrae55/psychrometric-compare-chart", payload, signal);
}

export function requestRelativeHumidityChart(
  payload: RelativeHumidityChartRequestDto,
  signal?: AbortSignal,
): Promise<PlotlyChartResponseDto> {
  return postJson<PlotlyChartResponseDto>("/api/ashrae55/relative-humidity-chart", payload, signal);
}

export function requestUtci(payload: UtciRequestDto, signal?: AbortSignal): Promise<UtciResponseDto> {
  return postJson<UtciResponseDto>("/api/utci", payload, signal);
}

export function requestUtciStressChart(
  payload: UtciStressChartRequestDto,
  signal?: AbortSignal,
): Promise<PlotlyChartResponseDto> {
  return postJson<PlotlyChartResponseDto>("/api/utci/stress-chart", payload, signal);
}

export function toPlotlyFigure(chart: PlotlyChartResponseDto): {
  data: PlotTraceDto[];
  layout: PlotLayoutDto & { annotations: PlotAnnotationDto[] };
  config: Record<string, boolean | string>;
} {
  return {
    data: chart.traces,
    layout: {
      ...chart.layout,
      annotations: chart.annotations,
    },
    config: {
      responsive: true,
      displaylogo: false,
    },
  };
}

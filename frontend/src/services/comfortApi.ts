import type {
  ComfortZoneRequestDto,
  ComfortZoneResponseDto,
  PlotAnnotationDto,
  PlotLayoutDto,
  PlotTraceDto,
  PmvRequestDto,
  PmvResponseDto,
  PsychrometricChartRequestDto,
  PsychrometricChartResponseDto,
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
): Promise<PsychrometricChartResponseDto> {
  return postJson<PsychrometricChartResponseDto>("/api/ashrae55/psychrometric-chart", payload, signal);
}

export function toPlotlyFigure(chart: PsychrometricChartResponseDto): {
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

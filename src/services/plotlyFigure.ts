import type {
  PlotAnnotationDto,
  PlotLayoutDto,
  PlotlyChartResponseDto,
  PlotTraceDto,
} from "../models/comfortDtos";

type PlotlyAxisTitle = string | { text: string; standoff?: number };

type PlotlyFigureLayout = Omit<PlotLayoutDto, "title" | "xaxis" | "yaxis"> & {
  title?: string | { text: string };
  xaxis: Record<string, unknown> & { title?: PlotlyAxisTitle };
  yaxis: Record<string, unknown> & { title?: PlotlyAxisTitle };
  annotations: PlotAnnotationDto[];
};

export function toPlotlyFigure(chart: PlotlyChartResponseDto): {
  data: PlotTraceDto[];
  layout: PlotlyFigureLayout;
  config: Record<string, unknown>;
} {
  const xaxis: PlotlyFigureLayout["xaxis"] = { ...chart.layout.xaxis };
  const yaxis: PlotlyFigureLayout["yaxis"] = { ...chart.layout.yaxis };

  if (typeof xaxis.title === "string") {
    xaxis.title = { text: xaxis.title, standoff: 12 };
  }

  if (typeof yaxis.title === "string") {
    yaxis.title = { text: yaxis.title, standoff: 12 };
  }

  return {
    data: chart.traces,
    layout: {
      ...chart.layout,
      title: chart.layout.title ? { text: chart.layout.title } : chart.layout.title,
      xaxis,
      yaxis,
      annotations: chart.annotations,
    },
    config: {
      responsive: true,
      displaylogo: false,
      displayModeBar: false,
    },
  };
}

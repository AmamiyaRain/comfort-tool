import type {
  PlotAnnotationDto,
  PlotLayoutDto,
  PlotlyChartResponseDto,
  PlotTraceDto,
} from "../models/dto";

export function toPlotlyFigure(chart: PlotlyChartResponseDto): {
  data: PlotTraceDto[];
  layout: PlotLayoutDto & { annotations: PlotAnnotationDto[] };
  config: Record<string, unknown>;
} {
  const xaxis = { ...chart.layout.xaxis };
  const yaxis = { ...chart.layout.yaxis };

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

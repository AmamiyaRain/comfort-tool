import { describe, expect, it } from "vitest";

import { CalculationSource } from "../models/calculationMetadata";
import { toPlotlyFigure } from "./plotlyFigure";

describe("plotlyFigure", () => {
  it("maps chart DTOs into Plotly figure objects", () => {
    const figure = toPlotlyFigure({
      traces: [
        {
          type: "scatter",
          mode: "lines",
          name: "RH 50%",
          x: [20, 25],
          y: [7, 10],
          line: { color: "#94a3b8", width: 1.2 },
          marker: {},
          hovertemplate: "demo",
        },
      ],
      layout: {
        title: "Psychrometric chart",
        paper_bgcolor: "#fff",
        plot_bgcolor: "#f8fafc",
        showlegend: false,
        margin: { l: 10, r: 10, t: 10, b: 10 },
        xaxis: { title: "X" },
        yaxis: { title: "Y" },
        shapes: [],
        legend: null,
        height: 320,
      },
      annotations: [{ x: 25, y: 10, text: "50%", showarrow: false, font: { size: 11 } }],
      source: CalculationSource.FrontendGenerated,
    });

    expect(figure.data).toHaveLength(1);
    expect(figure.layout.annotations).toHaveLength(1);
    expect(figure.layout.title).toEqual({ text: "Psychrometric chart" });
    expect(figure.layout.xaxis).toMatchObject({ title: { text: "X", standoff: 12 } });
    expect(figure.layout.yaxis).toMatchObject({ title: { text: "Y", standoff: 12 } });
    expect(figure.config.responsive).toBe(true);
    expect(figure.config.displaylogo).toBe(false);
    expect(figure.config.displayModeBar).toBe(false);
  });
});

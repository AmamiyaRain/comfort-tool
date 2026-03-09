import { describe, expect, it } from "vitest";

import { toPlotlyFigure } from "./comfortApi";

describe("comfortApi helpers", () => {
  it("maps backend chart responses into Plotly figure objects", () => {
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
      },
      annotations: [{ x: 25, y: 10, text: "50%", showarrow: false, font: { size: 11 } }],
      current_point: { tdb: 25, humidity_ratio: 10 },
      source: "backend-generated",
    });

    expect(figure.data).toHaveLength(1);
    expect(figure.layout.annotations).toHaveLength(1);
    expect(figure.config.responsive).toBe(true);
  });
});

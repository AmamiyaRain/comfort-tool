from __future__ import annotations

import math

from app.schemas.chart import (
    PlotlyChartResponseDto,
    PlotAnnotationDto,
    PlotLayoutDto,
    PlotTraceDto,
    PmvCompareChartRequestDto,
    PsychrometricChartRequestDto,
    RelativeHumidityChartRequestDto,
)
from app.services.comfort_service import calculate_comfort_zone
from app.services.utci_service import UTCI_STRESS_BANDS, calculate_utci
from app.schemas.utci import UtciCompareChartRequestDto

ATM_PRESSURE_PA = 101325.0
CASE_STYLES = {
    "A": {
        "line": "#0f766e",
        "fill": "rgba(15, 118, 110, 0.18)",
        "marker": "#0f766e",
    },
    "B": {
        "line": "#b45309",
        "fill": "rgba(180, 83, 9, 0.14)",
        "marker": "#b45309",
    },
    "C": {
        "line": "#1d4ed8",
        "fill": "rgba(29, 78, 216, 0.12)",
        "marker": "#1d4ed8",
    },
}
UTCI_STRESS_SHORT_LABELS = {
    "extreme cold stress": "Ext.<br>cold",
    "very strong cold stress": "V strong<br>cold",
    "strong cold stress": "Strong<br>cold",
    "moderate cold stress": "Moderate<br>cold",
    "slight cold stress": "Slight<br>cold",
    "no thermal stress": "No<br>stress",
    "moderate heat stress": "Moderate<br>heat",
    "strong heat stress": "Strong<br>heat",
    "very strong heat stress": "V strong<br>heat",
    "extreme heat stress": "Ext.<br>heat",
}


def _iter_compare_cases(payload: PmvCompareChartRequestDto | RelativeHumidityChartRequestDto | UtciCompareChartRequestDto):
    cases: list[tuple[str, object]] = [("A", payload.case_a)]
    if payload.case_b is not None:
        cases.append(("B", payload.case_b))
    case_c = getattr(payload, "case_c", None)
    if case_c is not None:
        cases.append(("C", case_c))
    return cases


def saturation_pressure_pa(temperature_c: float) -> float:
    return 611.21 * math.exp((18.678 - temperature_c / 234.5) * (temperature_c / (257.14 + temperature_c)))


def humidity_ratio_gkg(temperature_c: float, relative_humidity_percent: float) -> float:
    saturation_pressure = saturation_pressure_pa(temperature_c)
    rh_ratio = max(0.0, min(1.0, relative_humidity_percent / 100.0))
    vapor_pressure = rh_ratio * saturation_pressure
    if vapor_pressure >= ATM_PRESSURE_PA:
        return 0.0
    return (0.62198 * vapor_pressure) / (ATM_PRESSURE_PA - vapor_pressure) * 1000.0


def build_psychrometric_chart(
    payload: PsychrometricChartRequestDto,
) -> PlotlyChartResponseDto:
    return build_compare_psychrometric_chart(
        PmvCompareChartRequestDto(
            case_a=payload,
            case_b=None,
            chart_range=payload.chart_range,
            rh_curves=payload.rh_curves,
        )
    )


def build_compare_psychrometric_chart(
    payload: PmvCompareChartRequestDto,
) -> PlotlyChartResponseDto:
    chart_range = payload.chart_range
    cases = _iter_compare_cases(payload)
    show_case_legend = len(cases) > 1
    temp_points = [
        chart_range.tdb_min
        + index * (chart_range.tdb_max - chart_range.tdb_min) / (chart_range.tdb_points - 1)
        for index in range(chart_range.tdb_points)
    ]

    traces: list[PlotTraceDto] = []
    annotations: list[PlotAnnotationDto] = []
    for rh_curve in payload.rh_curves:
        x_values: list[float] = []
        y_values: list[float] = []
        for temperature in temp_points:
            humidity_ratio = humidity_ratio_gkg(temperature, rh_curve)
            if chart_range.humidity_ratio_min <= humidity_ratio <= chart_range.humidity_ratio_max:
                x_values.append(round(temperature, 3))
                y_values.append(round(humidity_ratio, 3))
        if not x_values:
            continue
        traces.append(
            PlotTraceDto(
                mode="lines",
                name=f"RH {rh_curve}%",
                x=x_values,
                y=y_values,
                showlegend=False,
                line={"color": "#94a3b8", "width": 1.2},
                hovertemplate="Tdb %{x:.1f} C<br>Humidity ratio %{y:.1f} g/kg<extra></extra>",
            )
        )
    for case_label, case_payload in cases:
        comfort_zone = calculate_comfort_zone(case_payload)
        cool_edge = comfort_zone.cool_edge
        warm_edge = list(reversed(comfort_zone.warm_edge))
        if cool_edge and warm_edge:
            polygon = [*cool_edge, *warm_edge]
            traces.append(
                PlotTraceDto(
                    mode="lines",
                    name=f"Case {case_label} comfort zone",
                    x=[round(point.tdb, 3) for point in polygon],
                    y=[round(humidity_ratio_gkg(point.tdb, point.rh), 3) for point in polygon],
                    showlegend=False,
                    fill="toself",
                    fillcolor=CASE_STYLES[case_label]["fill"],
                    line={"color": CASE_STYLES[case_label]["line"], "width": 1.5},
                    hovertemplate="Tdb %{x:.1f} C<br>Humidity ratio %{y:.1f} g/kg<extra></extra>",
                )
            )

        current_humidity_ratio = round(humidity_ratio_gkg(case_payload.tdb, case_payload.rh), 3)
        traces.append(
            PlotTraceDto(
                mode="markers",
                name=f"Case {case_label}",
                x=[round(case_payload.tdb, 3)],
                y=[current_humidity_ratio],
                showlegend=show_case_legend,
                marker={"color": CASE_STYLES[case_label]["marker"], "size": 12},
                line={},
                hovertemplate=f"Case {case_label}<br>Tdb %{{x:.1f}} C<br>Humidity ratio %{{y:.1f}} g/kg<extra></extra>",
            )
        )

    layout = PlotLayoutDto(
        title="Psychrometric chart",
        paper_bgcolor="#ffffff",
        plot_bgcolor="#f8fafc",
        showlegend=show_case_legend,
        margin={"l": 56, "r": 24, "t": 48, "b": 56},
        xaxis={
            "title": "Dry bulb temperature (C)",
            "range": [chart_range.tdb_min, chart_range.tdb_max],
            "gridcolor": "#e2e8f0",
        },
        yaxis={
            "title": "Humidity ratio (g/kg)",
            "range": [chart_range.humidity_ratio_min, chart_range.humidity_ratio_max],
            "gridcolor": "#e2e8f0",
        },
        legend={"orientation": "h", "x": 0.0, "y": 1.1},
        height=440,
    )
    return PlotlyChartResponseDto(
        traces=traces,
        layout=layout,
        annotations=annotations,
    )


def build_relative_humidity_chart(
    payload: RelativeHumidityChartRequestDto,
) -> PlotlyChartResponseDto:
    traces: list[PlotTraceDto] = []
    annotations: list[PlotAnnotationDto] = []
    cases = _iter_compare_cases(payload)
    show_case_legend = len(cases) > 1

    for case_label, case_payload in cases:
        comfort_zone = calculate_comfort_zone(case_payload)
        cool_edge = comfort_zone.cool_edge
        warm_edge = list(reversed(comfort_zone.warm_edge))
        if cool_edge and warm_edge:
            polygon = [*cool_edge, *warm_edge]
            traces.append(
                PlotTraceDto(
                    mode="lines",
                    name=f"Case {case_label} RH comfort zone",
                    x=[round(point.tdb, 3) for point in polygon],
                    y=[round(point.rh, 3) for point in polygon],
                    showlegend=False,
                    fill="toself",
                    fillcolor=CASE_STYLES[case_label]["fill"],
                    line={"color": CASE_STYLES[case_label]["line"], "width": 1.5},
                    hovertemplate="Tdb %{x:.1f} C<br>RH %{y:.0f}%<extra></extra>",
                )
            )
        traces.append(
            PlotTraceDto(
                mode="markers",
                name=f"Case {case_label}",
                x=[round(case_payload.tdb, 3)],
                y=[round(case_payload.rh, 3)],
                showlegend=show_case_legend,
                marker={"color": CASE_STYLES[case_label]["marker"], "size": 12},
                line={},
                hovertemplate=f"Case {case_label}<br>Tdb %{{x:.1f}} C<br>RH %{{y:.0f}}%<extra></extra>",
            )
        )
        annotations.append(
            PlotAnnotationDto(
                x=round(case_payload.tdb, 3),
                y=round(case_payload.rh, 3),
                text=case_label,
                showarrow=True,
                font={"size": 11, "color": CASE_STYLES[case_label]["line"]},
            )
        )

    layout = PlotLayoutDto(
        title="Relative humidity chart",
        paper_bgcolor="#ffffff",
        plot_bgcolor="#f8fafc",
        showlegend=show_case_legend,
        margin={"l": 56, "r": 24, "t": 48, "b": 56},
        xaxis={"title": "Dry bulb temperature (C)", "range": [10, 40], "gridcolor": "#e2e8f0"},
        yaxis={"title": "Relative humidity (%)", "range": [0, 100], "gridcolor": "#e2e8f0"},
        legend={"orientation": "h", "x": 0.0, "y": 1.1},
        height=420,
    )
    return PlotlyChartResponseDto(traces=traces, layout=layout, annotations=annotations)


def build_utci_stress_chart(payload: UtciCompareChartRequestDto) -> PlotlyChartResponseDto:
    traces: list[PlotTraceDto] = []
    annotations: list[PlotAnnotationDto] = []
    cases = _iter_compare_cases(payload)
    show_case_legend = len(cases) > 1
    marker_positions = [0.78, 0.5, 0.22] if len(cases) > 1 else [0.5]

    for case_index, (case_label, case_payload) in enumerate(cases):
        result = calculate_utci(case_payload)
        y_position = marker_positions[case_index]
        traces.append(
            PlotTraceDto(
                mode="markers",
                name=f"Case {case_label}",
                x=[round(result.utci, 3)],
                y=[y_position],
                showlegend=show_case_legend,
                marker={"color": CASE_STYLES[case_label]["marker"], "size": 14},
                line={},
                hovertemplate=(
                    f"Case {case_label}<br>UTCI %{{x:.1f}} C<br>{result.stress_category}<extra></extra>"
                ),
            )
        )
        annotations.append(
            PlotAnnotationDto(
                x=round(result.utci, 3),
                y=y_position + 0.12,
                text=f"Case {case_label}<br>{result.stress_category}",
                showarrow=False,
                font={"size": 12, "color": CASE_STYLES[case_label]["line"]},
            )
        )

    shapes = []
    for band_index, band in enumerate(UTCI_STRESS_BANDS):
        shapes.append(
            {
                "type": "rect",
                "xref": "x",
                "yref": "paper",
                "x0": band["minimum"],
                "x1": band["maximum"],
                "y0": 0,
                "y1": 1,
                "fillcolor": band["color"],
                "line": {"width": 0},
                "opacity": 0.18,
            }
        )
        midpoint = (band["minimum"] + band["maximum"]) / 2
        annotations.append(
            PlotAnnotationDto(
                x=midpoint,
                y=0.05 if band_index % 2 == 0 else 0.16,
                text=UTCI_STRESS_SHORT_LABELS[str(band["category"])],
                showarrow=False,
                font={"size": 8, "color": "#1f2937"},
            )
        )

    layout = PlotLayoutDto(
        title="UTCI stress category",
        paper_bgcolor="#ffffff",
        plot_bgcolor="#f8fafc",
        showlegend=show_case_legend,
        margin={"l": 40, "r": 24, "t": 48, "b": 96},
        xaxis={"title": "UTCI (C)", "range": [-50, 55], "gridcolor": "#e2e8f0"},
        yaxis={"title": "", "range": [0, 1], "showticklabels": False, "gridcolor": "#ffffff"},
        shapes=shapes,
        legend={"orientation": "h", "x": 0.0, "y": 1.08},
        height=360,
    )
    return PlotlyChartResponseDto(traces=traces, layout=layout, annotations=annotations)

from __future__ import annotations

import math

from app.schemas.chart import (
    PlotAnnotationDto,
    PlotLayoutDto,
    PlotTraceDto,
    PsychrometricChartRequestDto,
    PsychrometricChartResponseDto,
)
from app.services.comfort_service import calculate_comfort_zone

ATM_PRESSURE_PA = 101325.0


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
) -> PsychrometricChartResponseDto:
    chart_range = payload.chart_range
    comfort_zone = calculate_comfort_zone(payload)
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
                line={"color": "#94a3b8", "width": 1.2},
                hovertemplate="Tdb %{x:.1f} C<br>Humidity ratio %{y:.1f} g/kg<extra></extra>",
            )
        )
        annotations.append(
            PlotAnnotationDto(
                x=x_values[-1],
                y=y_values[-1],
                text=f"{rh_curve}%",
                font={"size": 11, "color": "#64748b"},
            )
        )

    cool_edge = comfort_zone.cool_edge
    warm_edge = list(reversed(comfort_zone.warm_edge))
    if cool_edge and warm_edge:
        polygon = [*cool_edge, *warm_edge]
        traces.append(
            PlotTraceDto(
                mode="lines",
                name="ASHRAE 55 comfort zone",
                x=[round(point.tdb, 3) for point in polygon],
                y=[round(humidity_ratio_gkg(point.tdb, point.rh), 3) for point in polygon],
                fill="toself",
                fillcolor="rgba(13, 148, 136, 0.18)",
                line={"color": "#0f766e", "width": 1.5},
                hovertemplate="Tdb %{x:.1f} C<br>Humidity ratio %{y:.1f} g/kg<extra></extra>",
            )
        )

    current_humidity_ratio = round(humidity_ratio_gkg(payload.tdb, payload.rh), 3)
    traces.append(
        PlotTraceDto(
            mode="markers",
            name="Current point",
            x=[round(payload.tdb, 3)],
            y=[current_humidity_ratio],
            marker={"color": "#b45309", "size": 10},
            hovertemplate="Current<br>Tdb %{x:.1f} C<br>Humidity ratio %{y:.1f} g/kg<extra></extra>",
        )
    )

    layout = PlotLayoutDto(
        title="Psychrometric chart",
        paper_bgcolor="#ffffff",
        plot_bgcolor="#f8fafc",
        showlegend=False,
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
    )
    return PsychrometricChartResponseDto(
        traces=traces,
        layout=layout,
        annotations=annotations,
        current_point={"tdb": round(payload.tdb, 3), "humidity_ratio": current_humidity_ratio},
    )

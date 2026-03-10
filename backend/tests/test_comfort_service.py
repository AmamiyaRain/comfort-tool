from app.schemas.chart import PlotlyChartResponseDto, PmvCompareChartRequestDto, PsychrometricChartRequestDto, RelativeHumidityChartRequestDto
from app.schemas.comfort import ComfortZoneRequestDto, PmvRequestDto, PmvSeriesRequestDto
from app.schemas.utci import UtciCompareChartRequestDto, UtciRequestDto
from app.services.chart_service import (
    build_compare_psychrometric_chart,
    build_psychrometric_chart,
    build_relative_humidity_chart,
    build_utci_stress_chart,
    humidity_ratio_gkg,
)
from app.services.comfort_service import calculate_comfort_zone, calculate_pmv, calculate_pmv_series
from app.services.utci_service import calculate_utci


def test_calculate_pmv_returns_expected_shape() -> None:
    result = calculate_pmv(PmvRequestDto())
    assert result.standard == "ASHRAE 55 (PMV/PPD)"
    assert result.source == "pythermalcomfort"
    assert -3.0 <= result.pmv <= 3.0
    assert 0.0 <= result.ppd <= 100.0


def test_calculate_pmv_series_uses_requested_points() -> None:
    result = calculate_pmv_series(PmvSeriesRequestDto(points=7))
    assert len(result.points) == 7
    assert result.points[0].tdb < result.points[-1].tdb


def test_calculate_comfort_zone_returns_ordered_edges() -> None:
    result = calculate_comfort_zone(ComfortZoneRequestDto(rh_points=7))
    assert len(result.cool_edge) == len(result.warm_edge)
    assert result.cool_edge[0].rh <= result.cool_edge[-1].rh


def test_psychrometric_chart_returns_plotly_payload() -> None:
    chart = build_psychrometric_chart(PsychrometricChartRequestDto())
    assert chart.source == "backend-generated"
    assert chart.layout.title == "Psychrometric chart"
    assert any(trace.name == "Case A" for trace in chart.traces)


def test_compare_psychrometric_chart_returns_two_case_overlays() -> None:
    chart = build_compare_psychrometric_chart(
        PmvCompareChartRequestDto(case_b=ComfortZoneRequestDto(tdb=28.0, rh=60.0))
    )
    assert isinstance(chart, PlotlyChartResponseDto)
    assert any(trace.name == "Case B" for trace in chart.traces)


def test_compare_psychrometric_chart_supports_three_cases_without_rh_legend() -> None:
    chart = build_compare_psychrometric_chart(
        PmvCompareChartRequestDto(
            case_b=ComfortZoneRequestDto(tdb=28.0, rh=60.0),
            case_c=ComfortZoneRequestDto(tdb=23.0, rh=45.0),
        )
    )
    legend_trace_names = [trace.name for trace in chart.traces if trace.showlegend]
    assert "Case C" in legend_trace_names
    assert all(not name.startswith("RH ") for name in legend_trace_names)


def test_relative_humidity_chart_returns_plotly_payload() -> None:
    chart = build_relative_humidity_chart(RelativeHumidityChartRequestDto())
    assert chart.layout.title == "Relative humidity chart"
    assert chart.layout.xaxis["title"] == "Dry bulb temperature (C)"
    assert chart.layout.yaxis["title"] == "Relative humidity (%)"
    assert any("comfort zone" in trace.name for trace in chart.traces)


def test_calculate_utci_returns_expected_shape() -> None:
    result = calculate_utci(UtciRequestDto())
    assert isinstance(result.utci, float)
    assert result.stress_category


def test_utci_stress_chart_returns_markers() -> None:
    chart = build_utci_stress_chart(
        UtciCompareChartRequestDto(
            case_b=UtciRequestDto(tdb=32.0, tr=32.0),
            case_c=UtciRequestDto(tdb=18.0, tr=18.0),
        )
    )
    assert chart.layout.title == "UTCI stress category"
    assert any(trace.name == "Case A" for trace in chart.traces)
    assert any(trace.name == "Case B" for trace in chart.traces)
    assert any(trace.name == "Case C" for trace in chart.traces)

from app.schemas.chart import PsychrometricChartRequestDto
from app.schemas.comfort import ComfortZoneRequestDto, PmvRequestDto, PmvSeriesRequestDto
from app.services.chart_service import build_psychrometric_chart, humidity_ratio_gkg
from app.services.comfort_service import calculate_comfort_zone, calculate_pmv, calculate_pmv_series


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
    assert any(trace.name == "Current point" for trace in chart.traces)
    assert chart.current_point["humidity_ratio"] == round(humidity_ratio_gkg(25.0, 50.0), 3)

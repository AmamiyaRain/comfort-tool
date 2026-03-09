from fastapi import APIRouter

from app.schemas.chart import (
    PlotlyChartResponseDto,
    PmvCompareChartRequestDto,
    PsychrometricChartRequestDto,
    RelativeHumidityChartRequestDto,
)
from app.schemas.comfort import (
    ComfortZoneRequestDto,
    ComfortZoneResponseDto,
    PmvRequestDto,
    PmvResponseDto,
    PmvSeriesRequestDto,
    PmvSeriesResponseDto,
)
from app.schemas.utci import UtciCompareChartRequestDto, UtciRequestDto, UtciResponseDto
from app.services.chart_service import (
    build_compare_psychrometric_chart,
    build_psychrometric_chart,
    build_relative_humidity_chart,
    build_utci_stress_chart,
)
from app.services.comfort_service import calculate_comfort_zone, calculate_pmv, calculate_pmv_series
from app.services.utci_service import calculate_utci

router = APIRouter(prefix="/api")


@router.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@router.post("/ashrae55/pmv", response_model=PmvResponseDto)
def calculate_pmv_route(payload: PmvRequestDto) -> PmvResponseDto:
    return calculate_pmv(payload)


@router.post("/ashrae55/pmv-series", response_model=PmvSeriesResponseDto)
def calculate_pmv_series_route(payload: PmvSeriesRequestDto) -> PmvSeriesResponseDto:
    return calculate_pmv_series(payload)


@router.post("/ashrae55/comfort-zone", response_model=ComfortZoneResponseDto)
def calculate_comfort_zone_route(payload: ComfortZoneRequestDto) -> ComfortZoneResponseDto:
    return calculate_comfort_zone(payload)


@router.post("/ashrae55/psychrometric-chart", response_model=PlotlyChartResponseDto)
def psychrometric_chart_route(
    payload: PsychrometricChartRequestDto,
) -> PlotlyChartResponseDto:
    return build_psychrometric_chart(payload)


@router.post("/ashrae55/psychrometric-compare-chart", response_model=PlotlyChartResponseDto)
def psychrometric_compare_chart_route(payload: PmvCompareChartRequestDto) -> PlotlyChartResponseDto:
    return build_compare_psychrometric_chart(payload)


@router.post("/ashrae55/relative-humidity-chart", response_model=PlotlyChartResponseDto)
def relative_humidity_chart_route(payload: RelativeHumidityChartRequestDto) -> PlotlyChartResponseDto:
    return build_relative_humidity_chart(payload)


@router.post("/utci", response_model=UtciResponseDto)
def calculate_utci_route(payload: UtciRequestDto) -> UtciResponseDto:
    return calculate_utci(payload)


@router.post("/utci/stress-chart", response_model=PlotlyChartResponseDto)
def utci_stress_chart_route(payload: UtciCompareChartRequestDto) -> PlotlyChartResponseDto:
    return build_utci_stress_chart(payload)

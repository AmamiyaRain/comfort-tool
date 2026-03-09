from fastapi import APIRouter

from app.schemas.chart import PsychrometricChartRequestDto, PsychrometricChartResponseDto
from app.schemas.comfort import (
    ComfortZoneRequestDto,
    ComfortZoneResponseDto,
    PmvRequestDto,
    PmvResponseDto,
    PmvSeriesRequestDto,
    PmvSeriesResponseDto,
)
from app.services.chart_service import build_psychrometric_chart
from app.services.comfort_service import calculate_comfort_zone, calculate_pmv, calculate_pmv_series

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


@router.post("/ashrae55/psychrometric-chart", response_model=PsychrometricChartResponseDto)
def psychrometric_chart_route(
    payload: PsychrometricChartRequestDto,
) -> PsychrometricChartResponseDto:
    return build_psychrometric_chart(payload)

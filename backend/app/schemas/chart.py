from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

from app.schemas.comfort import ComfortZoneRequestDto
from app.schemas.utci import UtciCompareChartRequestDto


class ChartRangeDto(BaseModel):
    tdb_min: float = Field(10.0)
    tdb_max: float = Field(40.0)
    tdb_points: int = Field(121, ge=21, le=301)
    humidity_ratio_min: float = Field(0.0)
    humidity_ratio_max: float = Field(30.0)


class PsychrometricChartRequestDto(ComfortZoneRequestDto):
    chart_range: ChartRangeDto = Field(default_factory=ChartRangeDto)
    rh_curves: list[int] = Field(default_factory=lambda: [10, 20, 30, 40, 50, 60, 70, 80, 90, 100])


class PmvCompareChartRequestDto(BaseModel):
    case_a: ComfortZoneRequestDto = Field(default_factory=ComfortZoneRequestDto)
    case_b: ComfortZoneRequestDto | None = None
    case_c: ComfortZoneRequestDto | None = None
    chart_range: ChartRangeDto = Field(default_factory=ChartRangeDto)
    rh_curves: list[int] = Field(default_factory=lambda: [10, 20, 30, 40, 50, 60, 70, 80, 90, 100])


class RelativeHumidityChartRequestDto(PmvCompareChartRequestDto):
    pass


class PlotTraceDto(BaseModel):
    type: Literal["scatter"] = "scatter"
    mode: str
    name: str
    x: list[float]
    y: list[float]
    showlegend: bool | None = None
    fill: str | None = None
    fillcolor: str | None = None
    line: dict[str, str | float | int] = Field(default_factory=dict)
    marker: dict[str, str | float | int] = Field(default_factory=dict)
    hovertemplate: str | None = None


class PlotAnnotationDto(BaseModel):
    x: float
    y: float
    text: str
    showarrow: bool = False
    font: dict[str, str | float | int] = Field(default_factory=dict)


class PlotLayoutDto(BaseModel):
    title: str
    paper_bgcolor: str
    plot_bgcolor: str
    showlegend: bool
    margin: dict[str, int]
    xaxis: dict[str, object]
    yaxis: dict[str, object]
    shapes: list[dict[str, object]] = Field(default_factory=list)
    legend: dict[str, object] | None = None
    height: int | None = None


class PlotlyChartResponseDto(BaseModel):
    traces: list[PlotTraceDto]
    layout: PlotLayoutDto
    annotations: list[PlotAnnotationDto]
    source: Literal["backend-generated"] = "backend-generated"

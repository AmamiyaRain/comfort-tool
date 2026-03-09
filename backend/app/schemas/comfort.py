from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class PmvRequestDto(BaseModel):
    tdb: float = Field(25.0, description="Dry bulb air temperature")
    tr: float = Field(25.0, description="Mean radiant temperature")
    vr: float = Field(0.1, ge=0.0, description="Relative air speed")
    rh: float = Field(50.0, ge=0.0, le=100.0, description="Relative humidity")
    met: float = Field(1.2, gt=0.0, description="Metabolic rate")
    clo: float = Field(0.5, ge=0.0, description="Clothing insulation")
    wme: float = Field(0.0, ge=0.0, description="External work")
    units: Literal["SI", "IP"] = "SI"


class PmvResponseDto(BaseModel):
    pmv: float
    ppd: float
    acceptable_80: bool
    standard: str = "ASHRAE 55 (PMV/PPD)"
    source: Literal["pythermalcomfort"] = "pythermalcomfort"


class PmvSeriesRequestDto(PmvRequestDto):
    tdb_min: float | None = Field(None, description="Minimum dry bulb temperature for sweep")
    tdb_max: float | None = Field(None, description="Maximum dry bulb temperature for sweep")
    points: int = Field(21, ge=5, le=121, description="Number of points in sweep")


class PmvSeriesPointDto(BaseModel):
    tdb: float
    pmv: float
    ppd: float


class PmvSeriesResponseDto(BaseModel):
    points: list[PmvSeriesPointDto]
    source: Literal["pythermalcomfort"] = "pythermalcomfort"


class ComfortZoneRequestDto(PmvRequestDto):
    rh_min: float = Field(20.0, ge=0.0, le=100.0)
    rh_max: float = Field(80.0, ge=0.0, le=100.0)
    rh_points: int = Field(13, ge=5, le=61)


class ComfortPointDto(BaseModel):
    tdb: float
    rh: float


class ComfortZoneResponseDto(BaseModel):
    cool_edge: list[ComfortPointDto]
    warm_edge: list[ComfortPointDto]
    source: Literal["pythermalcomfort"] = "pythermalcomfort"

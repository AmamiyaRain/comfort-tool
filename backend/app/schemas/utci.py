from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


UtciStressCategory = Literal[
    "extreme cold stress",
    "very strong cold stress",
    "strong cold stress",
    "moderate cold stress",
    "slight cold stress",
    "no thermal stress",
    "moderate heat stress",
    "strong heat stress",
    "very strong heat stress",
    "extreme heat stress",
]


class UtciRequestDto(BaseModel):
    tdb: float = Field(25.0, description="Dry bulb air temperature")
    tr: float = Field(25.0, description="Mean radiant temperature")
    v: float = Field(1.0, ge=0.0, description="Wind speed")
    rh: float = Field(50.0, ge=0.0, le=100.0, description="Relative humidity")
    units: Literal["SI", "IP"] = "SI"


class UtciResponseDto(BaseModel):
    utci: float
    stress_category: UtciStressCategory
    source: Literal["pythermalcomfort"] = "pythermalcomfort"


class UtciCompareChartRequestDto(BaseModel):
    case_a: UtciRequestDto = Field(default_factory=UtciRequestDto)
    case_b: UtciRequestDto | None = None
    case_c: UtciRequestDto | None = None

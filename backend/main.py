from __future__ import annotations

from typing import Literal

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

try:
    from pythermalcomfort.models import pmv_ppd_ashrae  # type: ignore
except Exception:
    pmv_ppd_ashrae = None


class PMVRequest(BaseModel):
    tdb: float = Field(25.0, description="Dry bulb air temperature")
    tr: float = Field(25.0, description="Mean radiant temperature")
    vr: float = Field(0.1, ge=0.0, description="Relative air speed")
    rh: float = Field(50.0, ge=0.0, le=100.0, description="Relative humidity")
    met: float = Field(1.2, gt=0.0, description="Metabolic rate")
    clo: float = Field(0.5, ge=0.0, description="Clothing insulation")
    wme: float = Field(0.0, ge=0.0, description="External work")
    units: Literal["SI", "IP"] = "SI"


class PMVResponse(BaseModel):
    pmv: float
    ppd: float
    acceptable_80: bool
    standard: str = "ASHRAE 55 (PMV/PPD)"
    source: Literal["pythermalcomfort"]


class PMVSeriesRequest(PMVRequest):
    tdb_min: float | None = Field(None, description="Minimum dry bulb temperature for sweep")
    tdb_max: float | None = Field(None, description="Maximum dry bulb temperature for sweep")
    points: int = Field(21, ge=5, le=121, description="Number of points in sweep")


class PMVSeriesPoint(BaseModel):
    tdb: float
    pmv: float
    ppd: float


class PMVSeriesResponse(BaseModel):
    points: list[PMVSeriesPoint]
    source: Literal["pythermalcomfort"]


class ComfortZoneRequest(PMVRequest):
    rh_min: float = Field(20.0, ge=0.0, le=100.0)
    rh_max: float = Field(80.0, ge=0.0, le=100.0)
    rh_points: int = Field(13, ge=5, le=61)


class ComfortPoint(BaseModel):
    tdb: float
    rh: float


class ComfortZoneResponse(BaseModel):
    cool_edge: list[ComfortPoint]
    warm_edge: list[ComfortPoint]
    source: Literal["pythermalcomfort"]


app = FastAPI(
    title="CBE Thermal Comfort Demo API",
    description="Minimal ASHRAE 55 PMV/PPD endpoint for a Svelte + FastAPI demo.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:4173",
        "http://127.0.0.1:4173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


def _extract_result_value(result: object, key: str) -> float:
    if isinstance(result, dict):
        return float(result[key])
    return float(getattr(result, key))


def _calculate_single_pmv(payload: PMVRequest) -> tuple[float, float]:
    if pmv_ppd_ashrae is None:
        raise HTTPException(status_code=503, detail="pythermalcomfort is not available on backend")
    try:
        result = pmv_ppd_ashrae(
            tdb=payload.tdb,
            tr=payload.tr,
            vr=payload.vr,
            rh=payload.rh,
            met=payload.met,
            clo=payload.clo,
            wme=payload.wme,
            units=payload.units,
            model="55-2023",
            round_output=False,
            limit_inputs=False,
        )
    except TypeError:
        result = pmv_ppd_ashrae(
            tdb=payload.tdb,
            tr=payload.tr,
            vr=payload.vr,
            rh=payload.rh,
            met=payload.met,
            clo=payload.clo,
            wme=payload.wme,
            units=payload.units,
        )
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"pythermalcomfort calculation failed: {exc}") from exc
    pmv = _extract_result_value(result, "pmv")
    ppd = _extract_result_value(result, "ppd")
    return pmv, ppd


def _solve_tdb_for_target_pmv(
    target_pmv: float, rh: float, payload: ComfortZoneRequest
) -> float | None:
    lo = 10.0
    hi = 40.0

    pmv_lo, _ = _calculate_single_pmv(
        PMVRequest(
            tdb=lo,
            tr=payload.tr,
            vr=payload.vr,
            rh=rh,
            met=payload.met,
            clo=payload.clo,
            wme=payload.wme,
            units=payload.units,
        )
    )
    pmv_hi, _ = _calculate_single_pmv(
        PMVRequest(
            tdb=hi,
            tr=payload.tr,
            vr=payload.vr,
            rh=rh,
            met=payload.met,
            clo=payload.clo,
            wme=payload.wme,
            units=payload.units,
        )
    )

    f_lo = pmv_lo - target_pmv
    f_hi = pmv_hi - target_pmv
    if f_lo * f_hi > 0:
        return None

    for _ in range(45):
        mid = (lo + hi) / 2.0
        pmv_mid, _ = _calculate_single_pmv(
            PMVRequest(
                tdb=mid,
                tr=payload.tr,
                vr=payload.vr,
                rh=rh,
                met=payload.met,
                clo=payload.clo,
                wme=payload.wme,
                units=payload.units,
            )
        )
        f_mid = pmv_mid - target_pmv
        if abs(f_mid) < 5e-4:
            return mid
        if f_lo * f_mid <= 0:
            hi = mid
        else:
            lo = mid
            f_lo = f_mid
    return (lo + hi) / 2.0


@app.post("/api/ashrae55/pmv", response_model=PMVResponse)
def calculate_pmv(payload: PMVRequest) -> PMVResponse:
    pmv, ppd = _calculate_single_pmv(payload)
    return PMVResponse(
        pmv=pmv,
        ppd=ppd,
        acceptable_80=abs(pmv) <= 0.5,
        source="pythermalcomfort",
    )


@app.post("/api/ashrae55/pmv-series", response_model=PMVSeriesResponse)
def calculate_pmv_series(payload: PMVSeriesRequest) -> PMVSeriesResponse:
    tdb_min = payload.tdb_min if payload.tdb_min is not None else payload.tdb - 5.0
    tdb_max = payload.tdb_max if payload.tdb_max is not None else payload.tdb + 5.0
    if tdb_min > tdb_max:
        tdb_min, tdb_max = tdb_max, tdb_min

    step = (tdb_max - tdb_min) / (payload.points - 1)
    points: list[PMVSeriesPoint] = []

    for i in range(payload.points):
        tdb_value = tdb_min + i * step
        point_payload = PMVRequest(
            tdb=tdb_value,
            tr=payload.tr,
            vr=payload.vr,
            rh=payload.rh,
            met=payload.met,
            clo=payload.clo,
            wme=payload.wme,
            units=payload.units,
        )
        pmv, ppd = _calculate_single_pmv(point_payload)
        points.append(PMVSeriesPoint(tdb=tdb_value, pmv=pmv, ppd=ppd))

    return PMVSeriesResponse(points=points, source="pythermalcomfort")


@app.post("/api/ashrae55/comfort-zone", response_model=ComfortZoneResponse)
def calculate_comfort_zone(payload: ComfortZoneRequest) -> ComfortZoneResponse:
    rh_min = min(payload.rh_min, payload.rh_max)
    rh_max = max(payload.rh_min, payload.rh_max)
    if payload.rh_points == 1:
        rh_values = [rh_min]
    else:
        step = (rh_max - rh_min) / (payload.rh_points - 1)
        rh_values = [rh_min + i * step for i in range(payload.rh_points)]

    cool_edge: list[ComfortPoint] = []
    warm_edge: list[ComfortPoint] = []
    for rh in rh_values:
        cool_tdb = _solve_tdb_for_target_pmv(-0.5, rh, payload)
        warm_tdb = _solve_tdb_for_target_pmv(0.5, rh, payload)
        if cool_tdb is None or warm_tdb is None:
            continue
        cool_edge.append(ComfortPoint(tdb=cool_tdb, rh=rh))
        warm_edge.append(ComfortPoint(tdb=warm_tdb, rh=rh))

    return ComfortZoneResponse(
        cool_edge=cool_edge,
        warm_edge=warm_edge,
        source="pythermalcomfort",
    )

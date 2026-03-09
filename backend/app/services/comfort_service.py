from __future__ import annotations

from fastapi import HTTPException

from app.schemas.comfort import (
    ComfortPointDto,
    ComfortZoneRequestDto,
    ComfortZoneResponseDto,
    PmvRequestDto,
    PmvResponseDto,
    PmvSeriesPointDto,
    PmvSeriesRequestDto,
    PmvSeriesResponseDto,
)

try:
    from pythermalcomfort.models import pmv_ppd_ashrae  # type: ignore
except Exception:
    pmv_ppd_ashrae = None


PMV_COMFORT_LIMIT = 0.5


def _extract_result_value(result: object, key: str) -> float:
    if isinstance(result, dict):
        return float(result[key])
    return float(getattr(result, key))


def _calculate_single_pmv(payload: PmvRequestDto) -> tuple[float, float]:
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
    return _extract_result_value(result, "pmv"), _extract_result_value(result, "ppd")


def _clone_payload(payload: PmvRequestDto, **overrides: float) -> PmvRequestDto:
    return PmvRequestDto(**{**payload.model_dump(), **overrides})


def _solve_tdb_for_target_pmv(
    target_pmv: float,
    rh: float,
    payload: ComfortZoneRequestDto,
) -> float | None:
    lo = 10.0
    hi = 40.0

    pmv_lo, _ = _calculate_single_pmv(_clone_payload(payload, tdb=lo, rh=rh))
    pmv_hi, _ = _calculate_single_pmv(_clone_payload(payload, tdb=hi, rh=rh))

    f_lo = pmv_lo - target_pmv
    f_hi = pmv_hi - target_pmv
    if f_lo * f_hi > 0:
        return None

    for _ in range(45):
        mid = (lo + hi) / 2.0
        pmv_mid, _ = _calculate_single_pmv(_clone_payload(payload, tdb=mid, rh=rh))
        f_mid = pmv_mid - target_pmv
        if abs(f_mid) < 5e-4:
            return mid
        if f_lo * f_mid <= 0:
            hi = mid
        else:
            lo = mid
            f_lo = f_mid
    return (lo + hi) / 2.0


def calculate_pmv(payload: PmvRequestDto) -> PmvResponseDto:
    pmv, ppd = _calculate_single_pmv(payload)
    return PmvResponseDto(pmv=pmv, ppd=ppd, acceptable_80=abs(pmv) <= PMV_COMFORT_LIMIT)


def calculate_pmv_series(payload: PmvSeriesRequestDto) -> PmvSeriesResponseDto:
    tdb_min = payload.tdb_min if payload.tdb_min is not None else payload.tdb - 5.0
    tdb_max = payload.tdb_max if payload.tdb_max is not None else payload.tdb + 5.0
    if tdb_min > tdb_max:
        tdb_min, tdb_max = tdb_max, tdb_min

    step = (tdb_max - tdb_min) / (payload.points - 1)
    points = []
    for index in range(payload.points):
        tdb_value = tdb_min + index * step
        pmv, ppd = _calculate_single_pmv(_clone_payload(payload, tdb=tdb_value))
        points.append(PmvSeriesPointDto(tdb=tdb_value, pmv=pmv, ppd=ppd))
    return PmvSeriesResponseDto(points=points)


def calculate_comfort_zone(payload: ComfortZoneRequestDto) -> ComfortZoneResponseDto:
    rh_min = min(payload.rh_min, payload.rh_max)
    rh_max = max(payload.rh_min, payload.rh_max)
    if payload.rh_points == 1:
        rh_values = [rh_min]
    else:
        step = (rh_max - rh_min) / (payload.rh_points - 1)
        rh_values = [rh_min + index * step for index in range(payload.rh_points)]

    cool_edge: list[ComfortPointDto] = []
    warm_edge: list[ComfortPointDto] = []
    for rh_value in rh_values:
        cool_tdb = _solve_tdb_for_target_pmv(-PMV_COMFORT_LIMIT, rh_value, payload)
        warm_tdb = _solve_tdb_for_target_pmv(PMV_COMFORT_LIMIT, rh_value, payload)
        if cool_tdb is None or warm_tdb is None:
            continue
        cool_edge.append(ComfortPointDto(tdb=cool_tdb, rh=rh_value))
        warm_edge.append(ComfortPointDto(tdb=warm_tdb, rh=rh_value))
    return ComfortZoneResponseDto(cool_edge=cool_edge, warm_edge=warm_edge)

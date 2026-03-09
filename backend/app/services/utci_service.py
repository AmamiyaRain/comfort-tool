from __future__ import annotations

from fastapi import HTTPException

from app.schemas.utci import UtciRequestDto, UtciResponseDto, UtciStressCategory

try:
    from pythermalcomfort.models import utci as utci_model  # type: ignore
except Exception:
    utci_model = None


UTCI_STRESS_CATEGORY_ORDER: tuple[UtciStressCategory, ...] = (
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
)

UTCI_STRESS_BANDS = (
    {"minimum": -50.0, "maximum": -40.0, "category": "extreme cold stress", "color": "#0f172a"},
    {"minimum": -40.0, "maximum": -27.0, "category": "very strong cold stress", "color": "#1d4ed8"},
    {"minimum": -27.0, "maximum": -13.0, "category": "strong cold stress", "color": "#2563eb"},
    {"minimum": -13.0, "maximum": 0.0, "category": "moderate cold stress", "color": "#3b82f6"},
    {"minimum": 0.0, "maximum": 9.0, "category": "slight cold stress", "color": "#7dd3fc"},
    {"minimum": 9.0, "maximum": 26.0, "category": "no thermal stress", "color": "#34d399"},
    {"minimum": 26.0, "maximum": 32.0, "category": "moderate heat stress", "color": "#fbbf24"},
    {"minimum": 32.0, "maximum": 38.0, "category": "strong heat stress", "color": "#fb923c"},
    {"minimum": 38.0, "maximum": 46.0, "category": "very strong heat stress", "color": "#f97316"},
    {"minimum": 46.0, "maximum": 55.0, "category": "extreme heat stress", "color": "#dc2626"},
)


def _normalize_stress_category(value: str) -> UtciStressCategory:
    for category in UTCI_STRESS_CATEGORY_ORDER:
        if value == category:
            return category
    raise HTTPException(status_code=502, detail=f"Unexpected UTCI stress category: {value}")


def calculate_utci(payload: UtciRequestDto) -> UtciResponseDto:
    if utci_model is None:
        raise HTTPException(status_code=503, detail="pythermalcomfort is not available on backend")
    try:
        result = utci_model(
            tdb=payload.tdb,
            tr=payload.tr,
            v=payload.v,
            rh=payload.rh,
            units=payload.units,
            limit_inputs=False,
            round_output=False,
        )
    except TypeError:
        result = utci_model(
            tdb=payload.tdb,
            tr=payload.tr,
            v=payload.v,
            rh=payload.rh,
            units=payload.units,
        )
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"pythermalcomfort UTCI calculation failed: {exc}") from exc

    return UtciResponseDto(
        utci=float(result.utci),
        stress_category=_normalize_stress_category(str(result.stress_category)),
    )

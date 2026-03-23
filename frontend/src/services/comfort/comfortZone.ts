import { CalculationSource } from "../../models/calculationMetadata";
import type {
  ComfortPointDto,
  ComfortZoneRequestDto,
  ComfortZoneResponseDto,
} from "../../models/dto";
import { PMV_COMFORT_LIMIT } from "./helpers";
import { solveDryBulbForTargetPmv } from "./pmv";

export function calculateComfortZone(payload: ComfortZoneRequestDto): ComfortZoneResponseDto {
  const rhMinimum = Math.min(payload.rh_min, payload.rh_max);
  const rhMaximum = Math.max(payload.rh_min, payload.rh_max);
  const rhValues =
    payload.rh_points === 1
      ? [rhMinimum]
      : Array.from({ length: payload.rh_points }, (_, index) => (
          rhMinimum + ((rhMaximum - rhMinimum) * index) / (payload.rh_points - 1)
        ));

  const coolEdge: ComfortPointDto[] = [];
  const warmEdge: ComfortPointDto[] = [];

  rhValues.forEach((relativeHumidity) => {
    const coolTemperature = solveDryBulbForTargetPmv(-PMV_COMFORT_LIMIT, relativeHumidity, payload);
    const warmTemperature = solveDryBulbForTargetPmv(PMV_COMFORT_LIMIT, relativeHumidity, payload);

    if (coolTemperature === null || warmTemperature === null) {
      return;
    }

    coolEdge.push({
      tdb: coolTemperature,
      rh: relativeHumidity,
    });
    warmEdge.push({
      tdb: warmTemperature,
      rh: relativeHumidity,
    });
  });

  return {
    cool_edge: coolEdge,
    warm_edge: warmEdge,
    source: CalculationSource.FrontendGenerated,
  };
}

import { wc, wind_chill_temperature } from "jsthermalcomfort";

const METERS_PER_SECOND_TO_KILOMETERS_PER_HOUR = 3.6;

export function calculateWindChillIndex(
  tdb: number,
  windSpeedMps: number,
  roundOutput = true,
): number {
  return wc(tdb, windSpeedMps, { round: roundOutput }).wci;
}

export function calculateWindChillTemperature(
  tdb: number,
  windSpeedMps: number,
  roundOutput = true,
): number {
  return wind_chill_temperature(
    tdb,
    windSpeedMps * METERS_PER_SECOND_TO_KILOMETERS_PER_HOUR,
    roundOutput,
  ).wct;
}

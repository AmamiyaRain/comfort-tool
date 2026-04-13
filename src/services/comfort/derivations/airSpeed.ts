import { v_relative } from "jsthermalcomfort/lib/esm/utilities/utilities.js";

/**
 * Calculates the measured air speed given the relative air speed and metabolic rate.
 * @param relativeAirSpeed The air speed relative to the moving body.
 * @param metabolicRate The metabolic rate (met).
 * @returns The absolute measured air speed.
 */
export function deriveMeasuredAirSpeedFromRelative(relativeAirSpeed: number, metabolicRate: number): number {
  if (metabolicRate <= 1) {
    return relativeAirSpeed;
  }

  return Math.max(0, relativeAirSpeed - 0.3 * (metabolicRate - 1));
}

export function deriveRelativeAirSpeedFromMeasured(measuredAirSpeed: number, metabolicRate: number): number {
  return v_relative(measuredAirSpeed, metabolicRate);
}

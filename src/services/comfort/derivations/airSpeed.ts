
/**
 * Calculates the relative air speed (vr) from the measured air speed (v) and metabolic rate (met).
 * vr is the sum of the average air speed measured by the sensor plus the activity-generated air speed.
 * Formula: vr = v + 0.3 * (met - 1) if met > 1, else v.
 */
export function deriveRelativeAirSpeedFromMeasured(v: number, met: number): number {
  let vr = v;
  if (met > 1) {
    vr = v + 0.3 * (met - 1);
  }
  // Match pythermalcomfort np.around(..., 3) for the SI calculation
  return Math.round(vr * 1000) / 1000;
}

/**
 * Calculates the measured air speed (v) from the relative air speed (vr) and metabolic rate (met).
 * This is the inverse of the relative air speed formula.
 * Formula: v = vr - 0.3 * (met - 1) if met > 1, else vr.
 */
export function deriveMeasuredAirSpeedFromRelative(vr: number, met: number): number {
  let v = vr;
  if (met > 1) {
    v = vr - 0.3 * (met - 1);
  }
  return v;
}

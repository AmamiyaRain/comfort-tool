import { t_o } from "jsthermalcomfort/lib/esm/psychrometrics/t_o.js";

export function deriveOperativeTemperature(
  dryBulbTemperature: number,
  meanRadiantTemperature: number,
  airSpeed: number,
): number {
  return t_o(dryBulbTemperature, meanRadiantTemperature, airSpeed, "ASHRAE");
}

/**
 * @file resultTones.ts
 * @description Centralized definitions for UI result cell color coding.
 */

// Shared base tone indicators across all components
export type BaseTone = "default" | "success" | "danger" | "warning";

// PMV (ASHRAE/ISO) specific tones corresponding to the 7-point thermal sensation scale
export type PmvTone =
  | "pmvCold"
  | "pmvCool"
  | "pmvSlightlyCool"
  | "pmvNeutral"
  | "pmvSlightlyWarm"
  | "pmvWarm"
  | "pmvHot";

// UTCI thermal stress specific tones covering the entire range of thermal stress categories
export type UtciTone =
  | "utciExtremeCold"
  | "utciVeryStrongCold"
  | "utciStrongCold"
  | "utciModerateCold"
  | "utciSlightCold"
  | "utciNoStress"
  | "utciModerateHeat"
  | "utciStrongHeat"
  | "utciVeryStrongHeat"
  | "utciExtremeHeat";

// Heat Index and Humidex specific risk category tones
export type HeatIndexTone =
  | "hiNoticeable"
  | "hiCaution"
  | "hiExtremeCaution"
  | "hiDanger"
  | "hiExtremeDanger";

// Humidex shares the same visual risk categorizations as Heat Index
export type HumidexTone = HeatIndexTone;

// Wind Chill frostbite specific risk category tones
export type WindChillTone =
  | "wcSafe"
  | "wc30min"
  | "wc10min"
  | "wc2min";

// Union of all result cell tones used to enforce static safety across Svelte rendering
export type ResultTone =
  | BaseTone
  | PmvTone
  | UtciTone
  | HeatIndexTone
  | WindChillTone;

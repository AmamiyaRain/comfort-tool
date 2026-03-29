import { clo_tout } from "jsthermalcomfort/lib/esm/models/clo_tout.js";
import { psy_ta_rh } from "jsthermalcomfort/lib/esm/psychrometrics/psy_ta_rh.js";
import { t_dp } from "jsthermalcomfort/lib/esm/psychrometrics/t_dp.js";
import { t_o } from "jsthermalcomfort/lib/esm/psychrometrics/t_o.js";
import { v_relative } from "jsthermalcomfort/lib/esm/utilities/utilities.js";

import { DerivedInputId, FieldKey, type DerivedInputId as DerivedInputIdType, type FieldKey as FieldKeyType } from "../../models/fieldKeys";
import {
  AirSpeedInputMode,
  defaultPmvOptions,
  HumidityInputMode,
  OptionKey,
  type ModelOptionsRecord,
  type PmvModelOptions,
} from "../../models/inputModes";
import type { UnitSystem as UnitSystemType } from "../../models/units";

type CloToutResult =
  | number
  | {
      clo?: number;
      clo_tout?: number;
    };

type CanonicalInputState = Record<FieldKeyType, number>;
type CanonicalDerivedState = Partial<Record<DerivedInputIdType, number>>;

type PsychrometricDerivedState = {
  dewPoint: number;
  humidityRatio: number;
  wetBulb: number;
  vaporPressure: number;
};

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function normalizePredictedClothingValue(result: CloToutResult): number {
  if (typeof result === "number") {
    return result;
  }

  if (typeof result.clo === "number") {
    return result.clo;
  }

  if (typeof result.clo_tout === "number") {
    return result.clo_tout;
  }

  throw new Error("Clothing prediction did not return a numeric clo value.");
}

export function normalizePmvOptions(options: ModelOptionsRecord): PmvModelOptions {
  return {
    ...defaultPmvOptions,
    ...options,
  } as PmvModelOptions;
}

export function derivePsychrometricStateFromRelativeHumidity(
  dryBulbTemperature: number,
  relativeHumidity: number,
): PsychrometricDerivedState {
  const result = psy_ta_rh(dryBulbTemperature, relativeHumidity);

  return {
    dewPoint: result.t_dp,
    humidityRatio: result.hr,
    wetBulb: result.t_wb,
    vaporPressure: result.p_vap,
  };
}

export function deriveMeasuredAirSpeedFromRelative(relativeAirSpeed: number, metabolicRate: number): number {
  if (metabolicRate <= 1) {
    return relativeAirSpeed;
  }

  return Math.max(0, relativeAirSpeed - 0.3 * (metabolicRate - 1));
}

export function deriveRelativeAirSpeedFromMeasured(measuredAirSpeed: number, metabolicRate: number): number {
  return v_relative(measuredAirSpeed, metabolicRate);
}

export function deriveInputDerivedState(inputState: CanonicalInputState): CanonicalDerivedState {
  const psychrometricState = derivePsychrometricStateFromRelativeHumidity(
    inputState[FieldKey.DryBulbTemperature],
    inputState[FieldKey.RelativeHumidity],
  );

  return {
    [DerivedInputId.MeasuredAirSpeed]: deriveMeasuredAirSpeedFromRelative(
      inputState[FieldKey.RelativeAirSpeed],
      inputState[FieldKey.MetabolicRate],
    ),
    [DerivedInputId.DewPoint]: psychrometricState.dewPoint,
    [DerivedInputId.HumidityRatio]: psychrometricState.humidityRatio,
    [DerivedInputId.WetBulb]: psychrometricState.wetBulb,
    [DerivedInputId.VaporPressure]: psychrometricState.vaporPressure,
  };
}

function solveRelativeHumidity(
  dryBulbTemperature: number,
  targetValue: number,
  selector: (result: ReturnType<typeof psy_ta_rh>) => number,
): number {
  let low = 0.01;
  let high = 100;

  for (let index = 0; index < 40; index += 1) {
    const middle = (low + high) / 2;
    const middleValue = selector(psy_ta_rh(dryBulbTemperature, middle));

    if (Math.abs(middleValue - targetValue) < 1e-4) {
      return clamp(middle, 0, 100);
    }

    if (middleValue < targetValue) {
      low = middle;
    } else {
      high = middle;
    }
  }

  return clamp((low + high) / 2, 0, 100);
}

export function deriveRelativeHumidityFromDewPoint(dryBulbTemperature: number, dewPoint: number): number {
  if (dewPoint >= dryBulbTemperature) {
    return 100;
  }

  let low = 0.01;
  let high = 100;

  for (let index = 0; index < 35; index += 1) {
    const middle = (low + high) / 2;
    const middleDewPoint = t_dp(dryBulbTemperature, middle);

    if (Math.abs(middleDewPoint - dewPoint) < 0.01) {
      return clamp(middle, 0, 100);
    }

    if (middleDewPoint < dewPoint) {
      low = middle;
    } else {
      high = middle;
    }
  }

  return clamp((low + high) / 2, 0, 100);
}

export function deriveRelativeHumidityFromHumidityRatio(dryBulbTemperature: number, humidityRatio: number): number {
  return solveRelativeHumidity(dryBulbTemperature, humidityRatio, (result) => result.hr);
}

export function deriveRelativeHumidityFromWetBulb(dryBulbTemperature: number, wetBulbTemperature: number): number {
  return solveRelativeHumidity(dryBulbTemperature, wetBulbTemperature, (result) => result.t_wb);
}

export function deriveRelativeHumidityFromVaporPressure(dryBulbTemperature: number, vaporPressure: number): number {
  return solveRelativeHumidity(dryBulbTemperature, vaporPressure, (result) => result.p_vap);
}

export function deriveOperativeTemperature(
  dryBulbTemperature: number,
  meanRadiantTemperature: number,
  airSpeed: number,
): number {
  return t_o(dryBulbTemperature, meanRadiantTemperature, airSpeed, "ASHRAE");
}

function getDerivedInputValue(
  inputState: CanonicalInputState,
  derivedState: CanonicalDerivedState,
  derivedInputId: DerivedInputIdType,
): number {
  return derivedState[derivedInputId] ?? deriveInputDerivedState(inputState)[derivedInputId] ?? 0;
}

export function synchronizePmvInputState(
  inputState: CanonicalInputState,
  derivedState: CanonicalDerivedState,
  options: ModelOptionsRecord,
): { inputState: CanonicalInputState; derivedState: CanonicalDerivedState } {
  const normalizedOptions = normalizePmvOptions(options);
  const nextInputState = { ...inputState };

  if (normalizedOptions[OptionKey.AirSpeedInputMode] === AirSpeedInputMode.Measured) {
    nextInputState[FieldKey.RelativeAirSpeed] = deriveRelativeAirSpeedFromMeasured(
      getDerivedInputValue(inputState, derivedState, DerivedInputId.MeasuredAirSpeed),
      nextInputState[FieldKey.MetabolicRate],
    );
  }

  const dryBulbTemperature = nextInputState[FieldKey.DryBulbTemperature];
  const humidityMode = normalizedOptions[OptionKey.HumidityInputMode];

  if (humidityMode === HumidityInputMode.DewPoint) {
    nextInputState[FieldKey.RelativeHumidity] = deriveRelativeHumidityFromDewPoint(
      dryBulbTemperature,
      getDerivedInputValue(inputState, derivedState, DerivedInputId.DewPoint),
    );
  } else if (humidityMode === HumidityInputMode.HumidityRatio) {
    nextInputState[FieldKey.RelativeHumidity] = deriveRelativeHumidityFromHumidityRatio(
      dryBulbTemperature,
      getDerivedInputValue(inputState, derivedState, DerivedInputId.HumidityRatio),
    );
  } else if (humidityMode === HumidityInputMode.WetBulb) {
    nextInputState[FieldKey.RelativeHumidity] = deriveRelativeHumidityFromWetBulb(
      dryBulbTemperature,
      getDerivedInputValue(inputState, derivedState, DerivedInputId.WetBulb),
    );
  } else if (humidityMode === HumidityInputMode.VaporPressure) {
    nextInputState[FieldKey.RelativeHumidity] = deriveRelativeHumidityFromVaporPressure(
      dryBulbTemperature,
      getDerivedInputValue(inputState, derivedState, DerivedInputId.VaporPressure),
    );
  }

  return {
    inputState: nextInputState,
    derivedState: deriveInputDerivedState(nextInputState),
  };
}

export function applyOperativeTemperatureMode(
  inputState: CanonicalInputState,
  derivedState: CanonicalDerivedState,
  options: ModelOptionsRecord,
): { inputState: CanonicalInputState; derivedState: CanonicalDerivedState } {
  const normalizedOptions = normalizePmvOptions(options);
  const airSpeed = normalizedOptions[OptionKey.AirSpeedInputMode] === AirSpeedInputMode.Measured
    ? getDerivedInputValue(inputState, derivedState, DerivedInputId.MeasuredAirSpeed)
    : inputState[FieldKey.RelativeAirSpeed];
  const operativeTemperature = deriveOperativeTemperature(
    inputState[FieldKey.DryBulbTemperature],
    inputState[FieldKey.MeanRadiantTemperature],
    airSpeed,
  );

  return synchronizePmvInputState(
    {
      ...inputState,
      [FieldKey.DryBulbTemperature]: operativeTemperature,
      [FieldKey.MeanRadiantTemperature]: operativeTemperature,
    },
    derivedState,
    options,
  );
}

export function predictClothingInsulationFromOutdoorTemperature(
  outdoorTemperature: number,
  unitSystem: UnitSystemType,
): number {
  return normalizePredictedClothingValue(clo_tout(outdoorTemperature, unitSystem));
}

import { clo_tout } from "jsthermalcomfort/lib/esm/models/clo_tout.js";
import { psy_ta_rh } from "jsthermalcomfort/lib/esm/psychrometrics/psy_ta_rh.js";
import { t_dp } from "jsthermalcomfort/lib/esm/psychrometrics/t_dp.js";
import { t_o } from "jsthermalcomfort/lib/esm/psychrometrics/t_o.js";
import { v_relative } from "jsthermalcomfort/lib/esm/utilities/utilities.js";

import { DerivedInputId, FieldKey, type DerivedInputId as DerivedInputIdType, type FieldKey as FieldKeyType } from "../../models/fieldKeys";
import { inputOrder, type InputId as InputIdType } from "../../models/inputSlots";
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

export const normalizeControlOptions = normalizePmvOptions;

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

export function deriveInputsDerivedState(
  inputsByInput: Record<InputIdType, CanonicalInputState>,
): Record<InputIdType, CanonicalDerivedState> {
  return inputOrder.reduce((accumulator, inputId) => {
    accumulator[inputId] = deriveInputDerivedState(inputsByInput[inputId]);
    return accumulator;
  }, {} as Record<InputIdType, CanonicalDerivedState>);
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

function resolveDerivedInputState(
  inputState: CanonicalInputState,
  derivedInputOverrides: CanonicalDerivedState = {},
): CanonicalDerivedState {
  return {
    ...deriveInputDerivedState(inputState),
    ...derivedInputOverrides,
  };
}

export function synchronizePmvInputState(
  inputState: CanonicalInputState,
  options: ModelOptionsRecord,
  derivedInputOverrides: CanonicalDerivedState = {},
): { inputState: CanonicalInputState } {
  const normalizedOptions = normalizePmvOptions(options);
  const resolvedDerivedState = resolveDerivedInputState(inputState, derivedInputOverrides);
  const nextInputState = { ...inputState };

  if (normalizedOptions[OptionKey.AirSpeedInputMode] === AirSpeedInputMode.Measured) {
    nextInputState[FieldKey.RelativeAirSpeed] = deriveRelativeAirSpeedFromMeasured(
      resolvedDerivedState[DerivedInputId.MeasuredAirSpeed] ?? 0,
      nextInputState[FieldKey.MetabolicRate],
    );
  }

  const dryBulbTemperature = nextInputState[FieldKey.DryBulbTemperature];
  const humidityMode = normalizedOptions[OptionKey.HumidityInputMode];

  if (humidityMode === HumidityInputMode.DewPoint) {
    nextInputState[FieldKey.RelativeHumidity] = deriveRelativeHumidityFromDewPoint(
      dryBulbTemperature,
      resolvedDerivedState[DerivedInputId.DewPoint] ?? 0,
    );
  } else if (humidityMode === HumidityInputMode.HumidityRatio) {
    nextInputState[FieldKey.RelativeHumidity] = deriveRelativeHumidityFromHumidityRatio(
      dryBulbTemperature,
      resolvedDerivedState[DerivedInputId.HumidityRatio] ?? 0,
    );
  } else if (humidityMode === HumidityInputMode.WetBulb) {
    nextInputState[FieldKey.RelativeHumidity] = deriveRelativeHumidityFromWetBulb(
      dryBulbTemperature,
      resolvedDerivedState[DerivedInputId.WetBulb] ?? 0,
    );
  } else if (humidityMode === HumidityInputMode.VaporPressure) {
    nextInputState[FieldKey.RelativeHumidity] = deriveRelativeHumidityFromVaporPressure(
      dryBulbTemperature,
      resolvedDerivedState[DerivedInputId.VaporPressure] ?? 0,
    );
  }

  return {
    inputState: nextInputState,
  };
}

export const synchronizeControlInputState = synchronizePmvInputState;

export function applyOperativeTemperatureMode(
  inputState: CanonicalInputState,
  options: ModelOptionsRecord,
  derivedInputOverrides: CanonicalDerivedState = {},
): { inputState: CanonicalInputState } {
  const normalizedOptions = normalizePmvOptions(options);
  const resolvedDerivedState = resolveDerivedInputState(inputState, derivedInputOverrides);
  const airSpeed = normalizedOptions[OptionKey.AirSpeedInputMode] === AirSpeedInputMode.Measured
    ? resolvedDerivedState[DerivedInputId.MeasuredAirSpeed] ?? 0
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
    options,
    derivedInputOverrides,
  );
}

export const applyOperativeTemperatureControlMode = applyOperativeTemperatureMode;

export function predictClothingInsulationFromOutdoorTemperature(
  outdoorTemperature: number,
  unitSystem: UnitSystemType,
): number {
  return normalizePredictedClothingValue(clo_tout(outdoorTemperature, unitSystem));
}

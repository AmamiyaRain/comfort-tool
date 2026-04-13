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
import {
  derivePsychrometricStateFromRelativeHumidity,
  deriveMeasuredAirSpeedFromRelative,
  deriveRelativeAirSpeedFromMeasured,
  deriveRelativeHumidityFromDewPoint,
  deriveRelativeHumidityFromHumidityRatio,
  deriveRelativeHumidityFromWetBulb,
  deriveRelativeHumidityFromVaporPressure,
  deriveOperativeTemperature,
} from "./derivations";

export type CanonicalInputState = Record<FieldKeyType, number>;
export type CanonicalDerivedState = Partial<Record<DerivedInputIdType, number>>;

/**
 * Normalizes PMV-specific model options, applying defaults for missing values.
 * @param options A partial record of model options.
 * @returns A fully populated PmvModelOptions object.
 */
export function normalizePmvOptions(options: ModelOptionsRecord): PmvModelOptions {
  return {
    ...defaultPmvOptions,
    ...options,
  } as PmvModelOptions;
}

export const normalizeControlOptions = normalizePmvOptions;

/**
 * Calculates all derived environmental values for a single input state.
 * @param inputState The canonical SI input values.
 * @returns A record of derived values (dew point, measured air speed, etc.).
 */
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

function resolveDerivedInputState(
  inputState: CanonicalInputState,
  derivedInputOverrides: CanonicalDerivedState = {},
): CanonicalDerivedState {
  return {
    ...deriveInputDerivedState(inputState),
    ...derivedInputOverrides,
  };
}

/**
 * Synchronizes the canonical input state to match the currently enabled model options.
 * For example, if 'Dew Point' mode is enabled, it updates Relative Humidity to match the dew point.
 * @param inputState The current canonical input state.
 * @param options The active model options.
 * @param derivedInputOverrides Optional overrides for derived values.
 * @returns The updated canonical input state.
 */
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

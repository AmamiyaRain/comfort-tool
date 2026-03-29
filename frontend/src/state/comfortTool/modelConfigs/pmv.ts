/**
 * PMV model adapter.
 * This config owns PMV-specific option semantics, display/derived synchronization, calculations, and chart assembly
 * while still reading and writing canonical SI values from the shared controller state.
 */
import { clothingTypicalEnsembles } from "../../../models/clothingEnsembles";
import { ChartId, chartMetaById, type ChartId as ChartIdType } from "../../../models/chartOptions";
import { inputOrder, type InputId as InputIdType } from "../../../models/inputSlots";
import { ComfortModel } from "../../../models/comfortModels";
import type {
  ComfortZoneRequestDto,
  PlotlyChartResponseDto,
  PmvChartInputsRequestDto,
  PmvResponseDto,
} from "../../../models/dto";
import { DerivedFieldKey, FieldKey, type FieldKey as FieldKeyType } from "../../../models/fieldKeys";
import { fieldMetaByKey } from "../../../models/fieldMeta";
import {
  AirSpeedControlMode,
  AirSpeedInputMode,
  defaultPmvOptions,
  HumidityInputMode,
  ModelOptionId,
  type ModelOptionId as ModelOptionIdType,
  type PmvModelOptions,
  TemperatureInputMode,
} from "../../../models/inputModes";
import { metabolicActivityOptions } from "../../../models/metabolicActivities";
import { UnitSystem } from "../../../models/units";
import {
  buildComparePsychrometricChart,
  buildRelativeHumidityChart,
  calculateComfortZone,
  calculatePmv,
  deriveOperativeTemperature,
  deriveRelativeAirSpeedFromMeasured,
  deriveRelativeHumidityFromDewPoint,
  deriveRelativeHumidityFromHumidityRatio,
  deriveRelativeHumidityFromVaporPressure,
  deriveRelativeHumidityFromWetBulb,
  type ComfortZonesByInput,
} from "../../../services/comfort";
import {
  convertFieldValueFromSi,
  convertFieldValueToSi,
  convertHumidityRatioFromSi,
  convertHumidityRatioToSi,
  convertVaporPressureFromSi,
  convertVaporPressureToSi,
  formatDisplayValue,
  getHumidityRatioDisplayMeta,
  getVaporPressureDisplayMeta,
} from "../../../services/units";
import { refreshAllDerivedState, refreshDerivedStateForInput } from "../derivedState";
import type {
  AdvancedOptionMenu,
  ComfortToolStateSlice,
  FieldPresentation,
  ModelOptionsState,
} from "../types";
import type { ComfortModelConfig } from "./index";

type PresentationMeta = Pick<FieldPresentation, "displayUnits" | "step" | "decimals" | "rangeText">;

type PmvTemperatureModeDescriptor = {
  dryBulbLabel: string;
  meanRadiantHidden: boolean;
  getDisplayValue?: (state: ComfortToolStateSlice, inputId: InputIdType, decimals: number) => string;
  applyDisplayValue?: (state: ComfortToolStateSlice, inputId: InputIdType, nextValue: number) => void;
};

type PmvAirSpeedModeDescriptor = {
  label: string;
  getDisplayValue?: (state: ComfortToolStateSlice, inputId: InputIdType, decimals: number) => string;
  applyDisplayValue?: (state: ComfortToolStateSlice, inputId: InputIdType, nextValue: number) => void;
  syncOnMetabolicRateChange: boolean;
};

type PmvHumidityModeDescriptor = {
  label: string;
  getPresentationMeta: (state: ComfortToolStateSlice) => PresentationMeta;
  getDisplayValue: (state: ComfortToolStateSlice, inputId: InputIdType, decimals: number) => string;
  applyDisplayValue?: (state: ComfortToolStateSlice, inputId: InputIdType, nextValue: number) => void;
  syncOnDryBulbTemperatureChange: boolean;
};

type AdvancedMenuItemDefinition<Value extends string> = {
  label: string;
  description: string;
  value: Value;
};

const pmvChartIds: ChartIdType[] = [ChartId.Psychrometric, ChartId.RelativeHumidity];

const temperatureInputModeValues = Object.values(TemperatureInputMode);
const airSpeedControlModeValues = Object.values(AirSpeedControlMode);
const airSpeedInputModeValues = Object.values(AirSpeedInputMode);
const humidityInputModeValues = Object.values(HumidityInputMode);

const clothingPresetOptions = clothingTypicalEnsembles.map((ensemble) => ({
  id: ensemble.id,
  label: ensemble.label,
  value: ensemble.clo,
}));

const metabolicPresetOptions = metabolicActivityOptions.map((activity) => ({
  id: activity.id,
  label: activity.label,
  value: activity.met,
}));

const temperatureMenuItems: AdvancedMenuItemDefinition<TemperatureInputMode>[] = [
  {
    label: "Air temperature",
    description: "Use dry-bulb air temperature and keep radiant temperature separate.",
    value: TemperatureInputMode.Air,
  },
  {
    label: "Operative temp",
    description: "Treat operative temperature as the single temperature input.",
    value: TemperatureInputMode.Operative,
  },
];

const airSpeedControlMenuItems: AdvancedMenuItemDefinition<AirSpeedControlMode>[] = [
  {
    label: "No local control",
    description: "Assume occupants do not have local control over elevated air speed.",
    value: AirSpeedControlMode.NoLocalControl,
  },
  {
    label: "With local control",
    description: "Assume occupants can locally control elevated air speed.",
    value: AirSpeedControlMode.WithLocalControl,
  },
];

const humidityMenuItems: AdvancedMenuItemDefinition<HumidityInputMode>[] = [
  {
    label: "Relative humidity",
    description: "Input relative humidity as a percentage.",
    value: HumidityInputMode.RelativeHumidity,
  },
  {
    label: "Humidity ratio",
    description: "Hold absolute moisture content constant.",
    value: HumidityInputMode.HumidityRatio,
  },
  {
    label: "Dew point",
    description: "Keep dew point fixed and derive relative humidity from dry-bulb temperature.",
    value: HumidityInputMode.DewPoint,
  },
  {
    label: "Wet bulb",
    description: "Input wet-bulb temperature instead of relative humidity.",
    value: HumidityInputMode.WetBulb,
  },
  {
    label: "Vapor pressure",
    description: "Input vapor pressure directly.",
    value: HumidityInputMode.VaporPressure,
  },
];

function createEmptyPmvResults(): Record<InputIdType, PmvResponseDto | null> {
  return inputOrder.reduce((accumulator, inputId) => {
    accumulator[inputId] = null;
    return accumulator;
  }, {} as Record<InputIdType, PmvResponseDto | null>);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isTemperatureInputMode(value: unknown): value is TemperatureInputMode {
  return temperatureInputModeValues.includes(
    value as typeof TemperatureInputMode[keyof typeof TemperatureInputMode],
  );
}

function isAirSpeedControlMode(value: unknown): value is AirSpeedControlMode {
  return airSpeedControlModeValues.includes(
    value as typeof AirSpeedControlMode[keyof typeof AirSpeedControlMode],
  );
}

function isAirSpeedInputMode(value: unknown): value is AirSpeedInputMode {
  return airSpeedInputModeValues.includes(
    value as typeof AirSpeedInputMode[keyof typeof AirSpeedInputMode],
  );
}

function isHumidityInputMode(value: unknown): value is HumidityInputMode {
  return humidityInputModeValues.includes(
    value as typeof HumidityInputMode[keyof typeof HumidityInputMode],
  );
}

function normalizePmvOptions(value: unknown): ModelOptionsState | null {
  if (!isRecord(value)) {
    return null;
  }

  const temperatureMode = value[ModelOptionId.TemperatureInputMode];
  const airSpeedControlMode = value[ModelOptionId.AirSpeedControlMode];
  const airSpeedInputMode = value[ModelOptionId.AirSpeedInputMode];
  const humidityInputMode = value[ModelOptionId.HumidityInputMode];

  if (temperatureMode !== undefined && !isTemperatureInputMode(temperatureMode)) {
    return null;
  }

  if (airSpeedControlMode !== undefined && !isAirSpeedControlMode(airSpeedControlMode)) {
    return null;
  }

  if (airSpeedInputMode !== undefined && !isAirSpeedInputMode(airSpeedInputMode)) {
    return null;
  }

  if (humidityInputMode !== undefined && !isHumidityInputMode(humidityInputMode)) {
    return null;
  }

  return {
    ...defaultPmvOptions,
    ...(temperatureMode !== undefined ? {
      [ModelOptionId.TemperatureInputMode]: temperatureMode,
    } : {}),
    ...(airSpeedControlMode !== undefined ? {
      [ModelOptionId.AirSpeedControlMode]: airSpeedControlMode,
    } : {}),
    ...(airSpeedInputMode !== undefined ? {
      [ModelOptionId.AirSpeedInputMode]: airSpeedInputMode,
    } : {}),
    ...(humidityInputMode !== undefined ? {
      [ModelOptionId.HumidityInputMode]: humidityInputMode,
    } : {}),
  };
}

function getChartOptions() {
  return pmvChartIds.map((chartId) => ({
    name: chartMetaById[chartId].name,
    value: chartId,
  }));
}

function getPmvOptions(state: ComfortToolStateSlice): PmvModelOptions {
  return {
    ...defaultPmvOptions,
    ...state.ui.modelOptionsByModel[ComfortModel.Pmv],
  } as PmvModelOptions;
}

function buildAdvancedOptionMenu<Value extends string>(
  title: string,
  optionKey: ModelOptionIdType,
  activeValue: string,
  items: AdvancedMenuItemDefinition<Value>[],
): AdvancedOptionMenu {
  return {
    title,
    items: items.map((item) => ({
      ...item,
      optionKey,
      active: activeValue === item.value,
    })),
  };
}

function formatRangeText(state: ComfortToolStateSlice, fieldKey: FieldKeyType): string {
  const meta = fieldMetaByKey[fieldKey];
  const minimum = formatDisplayValue(
    convertFieldValueFromSi(fieldKey, meta.minValue, state.ui.unitSystem),
    meta.decimals,
  );
  const maximum = formatDisplayValue(
    convertFieldValueFromSi(fieldKey, meta.maxValue, state.ui.unitSystem),
    meta.decimals,
  );
  return `From ${minimum} to ${maximum}`;
}

function getBasePresentationMeta(state: ComfortToolStateSlice, fieldKey: FieldKeyType): PresentationMeta {
  const meta = fieldMetaByKey[fieldKey];
  return {
    displayUnits: meta.displayUnits[state.ui.unitSystem],
    step: meta.step,
    decimals: meta.decimals,
    rangeText: formatRangeText(state, fieldKey),
  };
}

function getTemperatureInputMeta(state: ComfortToolStateSlice): PresentationMeta {
  const meta = fieldMetaByKey[FieldKey.DryBulbTemperature];
  return {
    displayUnits: meta.displayUnits[state.ui.unitSystem],
    step: meta.step,
    decimals: meta.decimals,
    rangeText: "",
  };
}

function getTemperatureDisplayValue(state: ComfortToolStateSlice, inputId: InputIdType, decimals: number): string {
  return formatDisplayValue(
    convertFieldValueFromSi(
      FieldKey.DryBulbTemperature,
      state.inputsByInput[inputId][FieldKey.DryBulbTemperature],
      state.ui.unitSystem,
    ),
    decimals,
  );
}

function getFieldDisplayValue(
  state: ComfortToolStateSlice,
  inputId: InputIdType,
  fieldKey: FieldKeyType,
  decimals: number,
): string {
  return formatDisplayValue(
    convertFieldValueFromSi(fieldKey, state.inputsByInput[inputId][fieldKey], state.ui.unitSystem),
    decimals,
  );
}

function syncCurrentPmvDerivedInputs(state: ComfortToolStateSlice, inputId: InputIdType) {
  const options = getPmvOptions(state);
  const inputs = state.inputsByInput[inputId];
  const derived = state.derivedByInput[inputId];

  if (options[ModelOptionId.AirSpeedInputMode] === AirSpeedInputMode.Measured) {
    inputs[FieldKey.RelativeAirSpeed] = deriveRelativeAirSpeedFromMeasured(
      derived[DerivedFieldKey.MeasuredAirSpeed] ?? 0,
      inputs[FieldKey.MetabolicRate],
    );
  }

  if (options[ModelOptionId.HumidityInputMode] === HumidityInputMode.DewPoint) {
    inputs[FieldKey.RelativeHumidity] = deriveRelativeHumidityFromDewPoint(
      inputs[FieldKey.DryBulbTemperature],
      derived[DerivedFieldKey.DewPoint] ?? 0,
    );
  } else if (options[ModelOptionId.HumidityInputMode] === HumidityInputMode.HumidityRatio) {
    inputs[FieldKey.RelativeHumidity] = deriveRelativeHumidityFromHumidityRatio(
      inputs[FieldKey.DryBulbTemperature],
      derived[DerivedFieldKey.HumidityRatio] ?? 0,
    );
  } else if (options[ModelOptionId.HumidityInputMode] === HumidityInputMode.WetBulb) {
    inputs[FieldKey.RelativeHumidity] = deriveRelativeHumidityFromWetBulb(
      inputs[FieldKey.DryBulbTemperature],
      derived[DerivedFieldKey.WetBulb] ?? 0,
    );
  } else if (options[ModelOptionId.HumidityInputMode] === HumidityInputMode.VaporPressure) {
    inputs[FieldKey.RelativeHumidity] = deriveRelativeHumidityFromVaporPressure(
      inputs[FieldKey.DryBulbTemperature],
      derived[DerivedFieldKey.VaporPressure] ?? 0,
    );
  }

  refreshDerivedStateForInput(state, inputId);
}

const temperatureModeDescriptors: Record<TemperatureInputMode, PmvTemperatureModeDescriptor> = {
  [TemperatureInputMode.Air]: {
    dryBulbLabel: fieldMetaByKey[FieldKey.DryBulbTemperature].label,
    meanRadiantHidden: false,
  },
  [TemperatureInputMode.Operative]: {
    dryBulbLabel: "Operative temperature",
    meanRadiantHidden: true,
    getDisplayValue: getTemperatureDisplayValue,
    applyDisplayValue: (state, inputId, nextValue) => {
      const operativeTemperature = convertFieldValueToSi(
        FieldKey.DryBulbTemperature,
        nextValue,
        state.ui.unitSystem,
      );
      state.inputsByInput[inputId][FieldKey.DryBulbTemperature] = operativeTemperature;
      state.inputsByInput[inputId][FieldKey.MeanRadiantTemperature] = operativeTemperature;
      syncCurrentPmvDerivedInputs(state, inputId);
    },
  },
};

const airSpeedModeDescriptors: Record<AirSpeedInputMode, PmvAirSpeedModeDescriptor> = {
  [AirSpeedInputMode.Relative]: {
    label: fieldMetaByKey[FieldKey.RelativeAirSpeed].label,
    syncOnMetabolicRateChange: false,
  },
  [AirSpeedInputMode.Measured]: {
    label: "Air speed",
    syncOnMetabolicRateChange: true,
    getDisplayValue: (state, inputId, decimals) => formatDisplayValue(
      convertFieldValueFromSi(
        FieldKey.RelativeAirSpeed,
        state.derivedByInput[inputId][DerivedFieldKey.MeasuredAirSpeed] ?? 0,
        state.ui.unitSystem,
      ),
      decimals,
    ),
    applyDisplayValue: (state, inputId, nextValue) => {
      const inputs = state.inputsByInput[inputId];
      state.derivedByInput[inputId][DerivedFieldKey.MeasuredAirSpeed] = convertFieldValueToSi(
        FieldKey.RelativeAirSpeed,
        nextValue,
        state.ui.unitSystem,
      );
      inputs[FieldKey.RelativeAirSpeed] = deriveRelativeAirSpeedFromMeasured(
        state.derivedByInput[inputId][DerivedFieldKey.MeasuredAirSpeed] ?? 0,
        inputs[FieldKey.MetabolicRate],
      );
      refreshDerivedStateForInput(state, inputId);
    },
  },
};

const humidityModeDescriptors: Record<HumidityInputMode, PmvHumidityModeDescriptor> = {
  [HumidityInputMode.RelativeHumidity]: {
    label: fieldMetaByKey[FieldKey.RelativeHumidity].label,
    getPresentationMeta: (state) => getBasePresentationMeta(state, FieldKey.RelativeHumidity),
    getDisplayValue: (state, inputId, decimals) => getFieldDisplayValue(
      state,
      inputId,
      FieldKey.RelativeHumidity,
      decimals,
    ),
    syncOnDryBulbTemperatureChange: false,
  },
  [HumidityInputMode.DewPoint]: {
    label: "Dew point",
    getPresentationMeta: (state) => getTemperatureInputMeta(state),
    getDisplayValue: (state, inputId, decimals) => formatDisplayValue(
      convertFieldValueFromSi(
        FieldKey.DryBulbTemperature,
        state.derivedByInput[inputId][DerivedFieldKey.DewPoint] ?? 0,
        state.ui.unitSystem,
      ),
      decimals,
    ),
    applyDisplayValue: (state, inputId, nextValue) => {
      const inputs = state.inputsByInput[inputId];
      state.derivedByInput[inputId][DerivedFieldKey.DewPoint] = convertFieldValueToSi(
        FieldKey.DryBulbTemperature,
        nextValue,
        state.ui.unitSystem,
      );
      inputs[FieldKey.RelativeHumidity] = deriveRelativeHumidityFromDewPoint(
        inputs[FieldKey.DryBulbTemperature],
        state.derivedByInput[inputId][DerivedFieldKey.DewPoint] ?? 0,
      );
      refreshDerivedStateForInput(state, inputId);
    },
    syncOnDryBulbTemperatureChange: true,
  },
  [HumidityInputMode.HumidityRatio]: {
    label: "Humidity ratio",
    getPresentationMeta: (state) => ({
      ...getHumidityRatioDisplayMeta(state.ui.unitSystem),
      rangeText: "",
    }),
    getDisplayValue: (state, inputId, decimals) => formatDisplayValue(
      convertHumidityRatioFromSi(
        state.derivedByInput[inputId][DerivedFieldKey.HumidityRatio] ?? 0,
        state.ui.unitSystem,
      ),
      decimals,
    ),
    applyDisplayValue: (state, inputId, nextValue) => {
      const inputs = state.inputsByInput[inputId];
      state.derivedByInput[inputId][DerivedFieldKey.HumidityRatio] = convertHumidityRatioToSi(
        nextValue,
        state.ui.unitSystem,
      );
      inputs[FieldKey.RelativeHumidity] = deriveRelativeHumidityFromHumidityRatio(
        inputs[FieldKey.DryBulbTemperature],
        state.derivedByInput[inputId][DerivedFieldKey.HumidityRatio] ?? 0,
      );
      refreshDerivedStateForInput(state, inputId);
    },
    syncOnDryBulbTemperatureChange: true,
  },
  [HumidityInputMode.WetBulb]: {
    label: "Wet-bulb temperature",
    getPresentationMeta: (state) => getTemperatureInputMeta(state),
    getDisplayValue: (state, inputId, decimals) => formatDisplayValue(
      convertFieldValueFromSi(
        FieldKey.DryBulbTemperature,
        state.derivedByInput[inputId][DerivedFieldKey.WetBulb] ?? 0,
        state.ui.unitSystem,
      ),
      decimals,
    ),
    applyDisplayValue: (state, inputId, nextValue) => {
      const inputs = state.inputsByInput[inputId];
      state.derivedByInput[inputId][DerivedFieldKey.WetBulb] = convertFieldValueToSi(
        FieldKey.DryBulbTemperature,
        nextValue,
        state.ui.unitSystem,
      );
      inputs[FieldKey.RelativeHumidity] = deriveRelativeHumidityFromWetBulb(
        inputs[FieldKey.DryBulbTemperature],
        state.derivedByInput[inputId][DerivedFieldKey.WetBulb] ?? 0,
      );
      refreshDerivedStateForInput(state, inputId);
    },
    syncOnDryBulbTemperatureChange: true,
  },
  [HumidityInputMode.VaporPressure]: {
    label: "Vapor pressure",
    getPresentationMeta: (state) => ({
      ...getVaporPressureDisplayMeta(state.ui.unitSystem),
      rangeText: "",
    }),
    getDisplayValue: (state, inputId, decimals) => formatDisplayValue(
      convertVaporPressureFromSi(
        state.derivedByInput[inputId][DerivedFieldKey.VaporPressure] ?? 0,
        state.ui.unitSystem,
      ),
      decimals,
    ),
    applyDisplayValue: (state, inputId, nextValue) => {
      const inputs = state.inputsByInput[inputId];
      state.derivedByInput[inputId][DerivedFieldKey.VaporPressure] = convertVaporPressureToSi(
        nextValue,
        state.ui.unitSystem,
      );
      inputs[FieldKey.RelativeHumidity] = deriveRelativeHumidityFromVaporPressure(
        inputs[FieldKey.DryBulbTemperature],
        state.derivedByInput[inputId][DerivedFieldKey.VaporPressure] ?? 0,
      );
      refreshDerivedStateForInput(state, inputId);
    },
    syncOnDryBulbTemperatureChange: true,
  },
};

function toPmvRequest(state: ComfortToolStateSlice, inputId: InputIdType) {
  const inputs = state.inputsByInput[inputId];
  return {
    tdb: Number(inputs[FieldKey.DryBulbTemperature]),
    tr: Number(inputs[FieldKey.MeanRadiantTemperature]),
    vr: Number(inputs[FieldKey.RelativeAirSpeed]),
    rh: Number(inputs[FieldKey.RelativeHumidity]),
    met: Number(inputs[FieldKey.MetabolicRate]),
    clo: Number(inputs[FieldKey.ClothingInsulation]),
    wme: Number(inputs[FieldKey.ExternalWork]),
    units: UnitSystem.SI,
  };
}

function toComfortZoneRequest(state: ComfortToolStateSlice, inputId: InputIdType): ComfortZoneRequestDto {
  return {
    ...toPmvRequest(state, inputId),
    rhMin: 0,
    rhMax: 100,
    rhPoints: 31,
  };
}

function toPmvChartInputsRequest(
  state: ComfortToolStateSlice,
  visibleInputIds: InputIdType[],
): PmvChartInputsRequestDto {
  return {
    inputs: visibleInputIds.reduce((accumulator, inputId) => {
      accumulator[inputId] = toComfortZoneRequest(state, inputId);
      return accumulator;
    }, {} as PmvChartInputsRequestDto["inputs"]),
    chartRange: {
      tdbMin: 10,
      tdbMax: 40,
      tdbPoints: 121,
      humidityRatioMin: 0,
      humidityRatioMax: 30,
    },
    rhCurves: [10, 20, 30, 40, 50, 60, 70, 80, 90, 100],
  };
}

function activateOperativeTemperatureMode(state: ComfortToolStateSlice, options: PmvModelOptions) {
  inputOrder.forEach((inputId) => {
    const airSpeed = options[ModelOptionId.AirSpeedInputMode] === AirSpeedInputMode.Measured
      ? state.derivedByInput[inputId][DerivedFieldKey.MeasuredAirSpeed] ?? 0
      : state.inputsByInput[inputId][FieldKey.RelativeAirSpeed];
    const operativeTemperature = deriveOperativeTemperature(
      state.inputsByInput[inputId][FieldKey.DryBulbTemperature],
      state.inputsByInput[inputId][FieldKey.MeanRadiantTemperature],
      airSpeed,
    );
    state.inputsByInput[inputId][FieldKey.DryBulbTemperature] = operativeTemperature;
    state.inputsByInput[inputId][FieldKey.MeanRadiantTemperature] = operativeTemperature;
    syncCurrentPmvDerivedInputs(state, inputId);
  });
}

export const pmvModelConfig: ComfortModelConfig<PmvResponseDto> = {
  id: ComfortModel.Pmv,
  chartIds: pmvChartIds,
  defaultChartId: ChartId.Psychrometric,
  defaultOptions: { ...defaultPmvOptions },
  normalizeOptions: normalizePmvOptions,
  getChartOptions,
  fieldOrder: [
    FieldKey.DryBulbTemperature,
    FieldKey.MeanRadiantTemperature,
    FieldKey.RelativeAirSpeed,
    FieldKey.RelativeHumidity,
    FieldKey.MetabolicRate,
    FieldKey.ClothingInsulation,
  ],
  syncDerivedState: (state) => {
    refreshAllDerivedState(state);
  },
  setOption: (state, optionKey, nextValue) => {
    const options = getPmvOptions(state);

    if (optionKey === ModelOptionId.TemperatureInputMode) {
      if (!isTemperatureInputMode(nextValue) || options[optionKey] === nextValue) {
        return false;
      }

      state.ui.modelOptionsByModel[ComfortModel.Pmv][optionKey] = nextValue;
      if (nextValue === TemperatureInputMode.Operative) {
        activateOperativeTemperatureMode(state, options);
      }
      return true;
    }

    if (optionKey === ModelOptionId.AirSpeedControlMode) {
      if (!isAirSpeedControlMode(nextValue) || options[optionKey] === nextValue) {
        return false;
      }

      state.ui.modelOptionsByModel[ComfortModel.Pmv][optionKey] = nextValue;
      return true;
    }

    if (optionKey === ModelOptionId.AirSpeedInputMode) {
      if (!isAirSpeedInputMode(nextValue) || options[optionKey] === nextValue) {
        return false;
      }

      state.ui.modelOptionsByModel[ComfortModel.Pmv][optionKey] = nextValue;
      refreshAllDerivedState(state);
      return true;
    }

    if (optionKey === ModelOptionId.HumidityInputMode) {
      if (!isHumidityInputMode(nextValue) || options[optionKey] === nextValue) {
        return false;
      }

      state.ui.modelOptionsByModel[ComfortModel.Pmv][optionKey] = nextValue;
      refreshAllDerivedState(state);
      return true;
    }

    return false;
  },
  updateInput: (state, inputId, fieldKey, rawValue) => {
    const nextValue = Number(rawValue);
    if (Number.isNaN(nextValue)) {
      return;
    }

    const options = getPmvOptions(state);
    const temperatureMode = temperatureModeDescriptors[options[ModelOptionId.TemperatureInputMode]];
    const airSpeedMode = airSpeedModeDescriptors[options[ModelOptionId.AirSpeedInputMode]];
    const humidityMode = humidityModeDescriptors[options[ModelOptionId.HumidityInputMode]];
    const inputs = state.inputsByInput[inputId];

    if (fieldKey === FieldKey.DryBulbTemperature && temperatureMode.applyDisplayValue) {
      temperatureMode.applyDisplayValue(state, inputId, nextValue);
      return;
    }

    if (fieldKey === FieldKey.RelativeAirSpeed && airSpeedMode.applyDisplayValue) {
      airSpeedMode.applyDisplayValue(state, inputId, nextValue);
      return;
    }

    if (fieldKey === FieldKey.RelativeHumidity && humidityMode.applyDisplayValue) {
      humidityMode.applyDisplayValue(state, inputId, nextValue);
      return;
    }

    inputs[fieldKey] = convertFieldValueToSi(fieldKey, nextValue, state.ui.unitSystem);

    if (fieldKey === FieldKey.MetabolicRate && airSpeedMode.syncOnMetabolicRateChange) {
      syncCurrentPmvDerivedInputs(state, inputId);
      return;
    }

    if (fieldKey === FieldKey.DryBulbTemperature && humidityMode.syncOnDryBulbTemperatureChange) {
      syncCurrentPmvDerivedInputs(state, inputId);
      return;
    }

    if (
      fieldKey === FieldKey.DryBulbTemperature ||
      fieldKey === FieldKey.RelativeHumidity ||
      fieldKey === FieldKey.RelativeAirSpeed ||
      fieldKey === FieldKey.MetabolicRate
    ) {
      refreshDerivedStateForInput(state, inputId);
    }
  },
  calculate: (state, visibleInputIds) => {
    const compareChartRequest = toPmvChartInputsRequest(state, visibleInputIds);
    const resultsByInput = createEmptyPmvResults();
    const comfortZonesByInput = visibleInputIds.reduce((accumulator, inputId) => {
      accumulator[inputId] = calculateComfortZone(toComfortZoneRequest(state, inputId));
      return accumulator;
    }, {} as ComfortZonesByInput);

    visibleInputIds.forEach((inputId) => {
      resultsByInput[inputId] = calculatePmv(toPmvRequest(state, inputId));
    });

    return {
      resultsByInput,
      chartResults: {
        [ChartId.Psychrometric]: buildComparePsychrometricChart(
          compareChartRequest,
          comfortZonesByInput,
        ) as PlotlyChartResponseDto,
        [ChartId.RelativeHumidity]: buildRelativeHumidityChart(
          compareChartRequest,
          comfortZonesByInput,
        ) as PlotlyChartResponseDto,
      },
    };
  },
  getFieldPresentation: (state, fieldKey) => {
    const options = getPmvOptions(state);
    const temperatureMode = temperatureModeDescriptors[options[ModelOptionId.TemperatureInputMode]];
    const airSpeedMode = airSpeedModeDescriptors[options[ModelOptionId.AirSpeedInputMode]];
    const humidityMode = humidityModeDescriptors[options[ModelOptionId.HumidityInputMode]];
    const baseMeta = fieldMetaByKey[fieldKey];
    const basePresentationMeta = getBasePresentationMeta(state, fieldKey);
    const presentation: FieldPresentation = {
      label: baseMeta.label,
      ...basePresentationMeta,
      hidden: false,
      showClothingBuilder: fieldKey === FieldKey.ClothingInsulation,
      showPresetInput: fieldKey === FieldKey.ClothingInsulation || fieldKey === FieldKey.MetabolicRate,
      presetOptions:
        fieldKey === FieldKey.ClothingInsulation
          ? clothingPresetOptions
          : fieldKey === FieldKey.MetabolicRate
            ? metabolicPresetOptions
            : [],
      presetDecimals: fieldKey === FieldKey.ClothingInsulation ? 2 : baseMeta.decimals,
    };

    if (fieldKey === FieldKey.DryBulbTemperature) {
      presentation.label = temperatureMode.dryBulbLabel;
    }

    if (fieldKey === FieldKey.MeanRadiantTemperature) {
      presentation.hidden = temperatureMode.meanRadiantHidden;
    }

    if (fieldKey === FieldKey.RelativeAirSpeed) {
      presentation.label = airSpeedMode.label;
    }

    if (fieldKey === FieldKey.RelativeHumidity) {
      presentation.label = humidityMode.label;
      Object.assign(presentation, humidityMode.getPresentationMeta(state));
    }

    return presentation;
  },
  getDisplayValue: (state, inputId, fieldKey) => {
    const options = getPmvOptions(state);
    const presentation = pmvModelConfig.getFieldPresentation(state, fieldKey);
    const temperatureMode = temperatureModeDescriptors[options[ModelOptionId.TemperatureInputMode]];
    const airSpeedMode = airSpeedModeDescriptors[options[ModelOptionId.AirSpeedInputMode]];
    const humidityMode = humidityModeDescriptors[options[ModelOptionId.HumidityInputMode]];

    if (fieldKey === FieldKey.DryBulbTemperature && temperatureMode.getDisplayValue) {
      return temperatureMode.getDisplayValue(state, inputId, presentation.decimals);
    }

    if (fieldKey === FieldKey.RelativeAirSpeed && airSpeedMode.getDisplayValue) {
      return airSpeedMode.getDisplayValue(state, inputId, presentation.decimals);
    }

    if (fieldKey === FieldKey.RelativeHumidity) {
      return humidityMode.getDisplayValue(state, inputId, presentation.decimals);
    }

    return getFieldDisplayValue(state, inputId, fieldKey, presentation.decimals);
  },
  getAdvancedOptionMenu: (state, fieldKey) => {
    const options = getPmvOptions(state);
    const selectedChart = state.ui.selectedChartByModel[ComfortModel.Pmv];

    if (
      fieldKey === FieldKey.DryBulbTemperature &&
      (
        selectedChart === ChartId.Psychrometric ||
        options[ModelOptionId.TemperatureInputMode] === TemperatureInputMode.Operative
      )
    ) {
      return buildAdvancedOptionMenu(
        "Temperature input",
        ModelOptionId.TemperatureInputMode,
        options[ModelOptionId.TemperatureInputMode],
        temperatureMenuItems,
      );
    }

    if (fieldKey === FieldKey.RelativeAirSpeed) {
      return buildAdvancedOptionMenu(
        "Air speed input",
        ModelOptionId.AirSpeedControlMode,
        options[ModelOptionId.AirSpeedControlMode],
        airSpeedControlMenuItems,
      );
    }

    if (fieldKey === FieldKey.RelativeHumidity) {
      return buildAdvancedOptionMenu(
        "Humidity input",
        ModelOptionId.HumidityInputMode,
        options[ModelOptionId.HumidityInputMode],
        humidityMenuItems,
      );
    }

    return null;
  },
  getResultSections: (state, visibleInputIds) => {
    const results = state.ui.resultsByModel[ComfortModel.Pmv];

    return [
      {
        title: "Compliance",
        valuesByInput: visibleInputIds.reduce((accumulator, inputId) => {
          const result = results[inputId];
          accumulator[inputId] = result
            ? {
                text: result.acceptable80 ? "Compliant" : "Out of range",
                toneClass: result.acceptable80 ? "font-semibold text-emerald-700" : "font-semibold text-red-600",
              }
            : null;
          return accumulator;
        }, {}),
      },
      {
        title: "PMV",
        valuesByInput: visibleInputIds.reduce((accumulator, inputId) => {
          const result = results[inputId];
          accumulator[inputId] = result
            ? { text: result.pmv.toFixed(2), toneClass: "text-base font-semibold text-stone-900" }
            : null;
          return accumulator;
        }, {}),
      },
      {
        title: "PPD",
        valuesByInput: visibleInputIds.reduce((accumulator, inputId) => {
          const result = results[inputId];
          accumulator[inputId] = result
            ? { text: `${result.ppd.toFixed(1)}%`, toneClass: "text-base font-semibold text-stone-900" }
            : null;
          return accumulator;
        }, {}),
      },
      {
        title: "Acceptability",
        valuesByInput: visibleInputIds.reduce((accumulator, inputId) => {
          const result = results[inputId];
          accumulator[inputId] = result
            ? { text: `${(100 - result.ppd).toFixed(1)}%`, toneClass: "text-base font-semibold text-stone-900" }
            : null;
          return accumulator;
        }, {}),
      },
    ];
  },
};

import { clothingTypicalEnsembles } from "../../../models/clothingEnsembles";
import {
  ChartId,
  PmvChartId,
} from "../../../models/chartOptions";
import { compareCaseOrder, type CompareCaseId as CompareCaseIdType } from "../../../models/compareCases";
import { ComfortModel } from "../../../models/comfortModels";
import { DerivedFieldKey } from "../../../models/derivedFieldKeys";
import type {
  ComfortZoneRequestDto,
  PlotlyChartResponseDto,
  PmvCompareChartRequestDto,
  PmvResponseDto,
} from "../../../models/dto";
import { FieldKey, type FieldKey as FieldKeyType } from "../../../models/fieldKeys";
import { fieldMetaByKey } from "../../../models/fieldMeta";
import {
  PmvAirSpeedControlMode,
  PmvAirSpeedInputMode,
  PmvHumidityInputMode,
  PmvTemperatureInputMode,
} from "../../../models/inputModes";
import { metabolicActivityOptions } from "../../../models/metabolicActivities";
import {
  ModelOptionKey,
  type PmvModelOptions,
} from "../../../models/modelOptions";
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
  type ComfortZonesByCase,
} from "../../../services/comfort";
import {
  convertDisplayToSi,
  convertHumidityRatioDisplayToSi,
  convertHumidityRatioSiToDisplay,
  convertSiToDisplay,
  convertVaporPressureDisplayToSi,
  convertVaporPressureSiToDisplay,
  formatDisplayValue,
} from "../../../services/units";
import { refreshAllDerivedState, refreshDerivedStateForCase } from "../derivedState";
import type { ComfortModelConfig } from "./types";

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

export const defaultPmvOptions: PmvModelOptions = {
  [ModelOptionKey.PmvTemperatureInputMode]: PmvTemperatureInputMode.Air,
  [ModelOptionKey.PmvAirSpeedControlMode]: PmvAirSpeedControlMode.WithLocalControl,
  [ModelOptionKey.PmvAirSpeedInputMode]: PmvAirSpeedInputMode.Relative,
  [ModelOptionKey.PmvHumidityInputMode]: PmvHumidityInputMode.RelativeHumidity,
};

function createEmptyPmvResults(): Record<CompareCaseIdType, PmvResponseDto | null> {
  return compareCaseOrder.reduce((accumulator, caseId) => {
    accumulator[caseId] = null;
    return accumulator;
  }, {} as Record<CompareCaseIdType, PmvResponseDto | null>);
}

function getPmvOptions(state): PmvModelOptions {
  return {
    ...defaultPmvOptions,
    ...state.ui.modelOptionsByModel[ComfortModel.Pmv],
  } as PmvModelOptions;
}

function syncCurrentPmvDerivedInputs(state, caseId: CompareCaseIdType) {
  const options = getPmvOptions(state);
  const inputs = state.inputsByCase[caseId];
  const derived = state.derivedByCase[caseId];

  if (options[ModelOptionKey.PmvAirSpeedInputMode] === PmvAirSpeedInputMode.Measured) {
    inputs[FieldKey.RelativeAirSpeed] = deriveRelativeAirSpeedFromMeasured(
      derived[DerivedFieldKey.MeasuredAirSpeed] ?? 0,
      inputs[FieldKey.MetabolicRate],
    );
  }

  if (options[ModelOptionKey.PmvHumidityInputMode] === PmvHumidityInputMode.DewPoint) {
    inputs[FieldKey.RelativeHumidity] = deriveRelativeHumidityFromDewPoint(
      inputs[FieldKey.DryBulbTemperature],
      derived[DerivedFieldKey.DewPoint] ?? 0,
    );
  } else if (options[ModelOptionKey.PmvHumidityInputMode] === PmvHumidityInputMode.HumidityRatio) {
    inputs[FieldKey.RelativeHumidity] = deriveRelativeHumidityFromHumidityRatio(
      inputs[FieldKey.DryBulbTemperature],
      derived[DerivedFieldKey.HumidityRatio] ?? 0,
    );
  } else if (options[ModelOptionKey.PmvHumidityInputMode] === PmvHumidityInputMode.WetBulb) {
    inputs[FieldKey.RelativeHumidity] = deriveRelativeHumidityFromWetBulb(
      inputs[FieldKey.DryBulbTemperature],
      derived[DerivedFieldKey.WetBulb] ?? 0,
    );
  } else if (options[ModelOptionKey.PmvHumidityInputMode] === PmvHumidityInputMode.VaporPressure) {
    inputs[FieldKey.RelativeHumidity] = deriveRelativeHumidityFromVaporPressure(
      inputs[FieldKey.DryBulbTemperature],
      derived[DerivedFieldKey.VaporPressure] ?? 0,
    );
  }

  refreshDerivedStateForCase(state, caseId);
}

function toPmvRequest(state, caseId: CompareCaseIdType) {
  const inputs = state.inputsByCase[caseId];
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

function toComfortZoneRequest(state, caseId: CompareCaseIdType): ComfortZoneRequestDto {
  return {
    ...toPmvRequest(state, caseId),
    rh_min: 0,
    rh_max: 100,
    rh_points: 31,
  };
}

function toPmvCompareChartRequest(
  state,
  visibleCaseIds: CompareCaseIdType[],
): PmvCompareChartRequestDto {
  return {
    case_a: toComfortZoneRequest(state, compareCaseOrder[0]),
    case_b: visibleCaseIds.includes(compareCaseOrder[1]) ? toComfortZoneRequest(state, compareCaseOrder[1]) : null,
    case_c: visibleCaseIds.includes(compareCaseOrder[2]) ? toComfortZoneRequest(state, compareCaseOrder[2]) : null,
    chart_range: {
      tdb_min: 10,
      tdb_max: 40,
      tdb_points: 121,
      humidity_ratio_min: 0,
      humidity_ratio_max: 30,
    },
    rh_curves: [10, 20, 30, 40, 50, 60, 70, 80, 90, 100],
  };
}

function formatRangeText(state, fieldKey: FieldKeyType): string {
  const meta = fieldMetaByKey[fieldKey];
  const minimum = formatDisplayValue(
    convertSiToDisplay(fieldKey, meta.minValue, state.ui.unitSystem),
    meta.decimals,
  );
  const maximum = formatDisplayValue(
    convertSiToDisplay(fieldKey, meta.maxValue, state.ui.unitSystem),
    meta.decimals,
  );
  return `From ${minimum} to ${maximum}`;
}

function getTemperatureDisplayValue(state, caseId: CompareCaseIdType, decimals: number) {
  return formatDisplayValue(
    convertSiToDisplay(
      FieldKey.DryBulbTemperature,
      state.inputsByCase[caseId][FieldKey.DryBulbTemperature],
      state.ui.unitSystem,
    ),
    decimals,
  );
}

export const pmvModelConfig: ComfortModelConfig<PmvResponseDto> = {
  id: ComfortModel.Pmv,
  fieldOrder: [
    FieldKey.DryBulbTemperature,
    FieldKey.MeanRadiantTemperature,
    FieldKey.RelativeAirSpeed,
    FieldKey.RelativeHumidity,
    FieldKey.MetabolicRate,
    FieldKey.ClothingInsulation,
  ],
  defaultChartId: ChartId.Psychrometric,
  defaultOptions: defaultPmvOptions,
  syncDerivedState: (state) => {
    refreshAllDerivedState(state);
  },
  setOption: (state, optionKey, nextValue) => {
    const options = getPmvOptions(state);
    const currentValue = options[optionKey as keyof PmvModelOptions];
    if (currentValue === nextValue) {
      return true;
    }

    if (optionKey === ModelOptionKey.PmvTemperatureInputMode) {
      if (!Object.values(PmvTemperatureInputMode).includes(nextValue as typeof PmvTemperatureInputMode[keyof typeof PmvTemperatureInputMode])) {
        return false;
      }

      state.ui.modelOptionsByModel[ComfortModel.Pmv][optionKey] = nextValue;

      if (nextValue === PmvTemperatureInputMode.Operative) {
        compareCaseOrder.forEach((caseId) => {
          const airSpeed = options[ModelOptionKey.PmvAirSpeedInputMode] === PmvAirSpeedInputMode.Measured
            ? state.derivedByCase[caseId][DerivedFieldKey.MeasuredAirSpeed] ?? 0
            : state.inputsByCase[caseId][FieldKey.RelativeAirSpeed];
          const operativeTemperature = deriveOperativeTemperature(
            state.inputsByCase[caseId][FieldKey.DryBulbTemperature],
            state.inputsByCase[caseId][FieldKey.MeanRadiantTemperature],
            airSpeed,
          );
          state.inputsByCase[caseId][FieldKey.DryBulbTemperature] = operativeTemperature;
          state.inputsByCase[caseId][FieldKey.MeanRadiantTemperature] = operativeTemperature;
          syncCurrentPmvDerivedInputs(state, caseId);
        });
      }

      return true;
    }

    if (optionKey === ModelOptionKey.PmvAirSpeedControlMode) {
      if (!Object.values(PmvAirSpeedControlMode).includes(nextValue as typeof PmvAirSpeedControlMode[keyof typeof PmvAirSpeedControlMode])) {
        return false;
      }

      state.ui.modelOptionsByModel[ComfortModel.Pmv][optionKey] = nextValue;
      return true;
    }

    if (optionKey === ModelOptionKey.PmvAirSpeedInputMode) {
      if (!Object.values(PmvAirSpeedInputMode).includes(nextValue as typeof PmvAirSpeedInputMode[keyof typeof PmvAirSpeedInputMode])) {
        return false;
      }

      state.ui.modelOptionsByModel[ComfortModel.Pmv][optionKey] = nextValue;
      refreshAllDerivedState(state);
      return true;
    }

    if (optionKey === ModelOptionKey.PmvHumidityInputMode) {
      if (!Object.values(PmvHumidityInputMode).includes(nextValue as typeof PmvHumidityInputMode[keyof typeof PmvHumidityInputMode])) {
        return false;
      }

      state.ui.modelOptionsByModel[ComfortModel.Pmv][optionKey] = nextValue;
      refreshAllDerivedState(state);
      return true;
    }

    return false;
  },
  updateInput: (state, caseId, fieldKey, rawValue) => {
    const nextValue = Number(rawValue);
    if (Number.isNaN(nextValue)) {
      return;
    }

    const options = getPmvOptions(state);
    const inputs = state.inputsByCase[caseId];
    const derived = state.derivedByCase[caseId];

    if (
      fieldKey === FieldKey.DryBulbTemperature &&
      options[ModelOptionKey.PmvTemperatureInputMode] === PmvTemperatureInputMode.Operative
    ) {
      const operativeTemperature = convertDisplayToSi(FieldKey.DryBulbTemperature, nextValue, state.ui.unitSystem);
      inputs[FieldKey.DryBulbTemperature] = operativeTemperature;
      inputs[FieldKey.MeanRadiantTemperature] = operativeTemperature;
      syncCurrentPmvDerivedInputs(state, caseId);
      return;
    }

    if (
      fieldKey === FieldKey.RelativeAirSpeed &&
      options[ModelOptionKey.PmvAirSpeedInputMode] === PmvAirSpeedInputMode.Measured
    ) {
      derived[DerivedFieldKey.MeasuredAirSpeed] = convertDisplayToSi(
        FieldKey.RelativeAirSpeed,
        nextValue,
        state.ui.unitSystem,
      );
      inputs[FieldKey.RelativeAirSpeed] = deriveRelativeAirSpeedFromMeasured(
        derived[DerivedFieldKey.MeasuredAirSpeed] ?? 0,
        inputs[FieldKey.MetabolicRate],
      );
      refreshDerivedStateForCase(state, caseId);
      return;
    }

    if (
      fieldKey === FieldKey.RelativeHumidity &&
      options[ModelOptionKey.PmvHumidityInputMode] === PmvHumidityInputMode.DewPoint
    ) {
      derived[DerivedFieldKey.DewPoint] = convertDisplayToSi(
        FieldKey.DryBulbTemperature,
        nextValue,
        state.ui.unitSystem,
      );
      inputs[FieldKey.RelativeHumidity] = deriveRelativeHumidityFromDewPoint(
        inputs[FieldKey.DryBulbTemperature],
        derived[DerivedFieldKey.DewPoint] ?? 0,
      );
      refreshDerivedStateForCase(state, caseId);
      return;
    }

    if (
      fieldKey === FieldKey.RelativeHumidity &&
      options[ModelOptionKey.PmvHumidityInputMode] === PmvHumidityInputMode.HumidityRatio
    ) {
      derived[DerivedFieldKey.HumidityRatio] = convertHumidityRatioDisplayToSi(nextValue, state.ui.unitSystem);
      inputs[FieldKey.RelativeHumidity] = deriveRelativeHumidityFromHumidityRatio(
        inputs[FieldKey.DryBulbTemperature],
        derived[DerivedFieldKey.HumidityRatio] ?? 0,
      );
      refreshDerivedStateForCase(state, caseId);
      return;
    }

    if (
      fieldKey === FieldKey.RelativeHumidity &&
      options[ModelOptionKey.PmvHumidityInputMode] === PmvHumidityInputMode.WetBulb
    ) {
      derived[DerivedFieldKey.WetBulb] = convertDisplayToSi(
        FieldKey.DryBulbTemperature,
        nextValue,
        state.ui.unitSystem,
      );
      inputs[FieldKey.RelativeHumidity] = deriveRelativeHumidityFromWetBulb(
        inputs[FieldKey.DryBulbTemperature],
        derived[DerivedFieldKey.WetBulb] ?? 0,
      );
      refreshDerivedStateForCase(state, caseId);
      return;
    }

    if (
      fieldKey === FieldKey.RelativeHumidity &&
      options[ModelOptionKey.PmvHumidityInputMode] === PmvHumidityInputMode.VaporPressure
    ) {
      derived[DerivedFieldKey.VaporPressure] = convertVaporPressureDisplayToSi(nextValue, state.ui.unitSystem);
      inputs[FieldKey.RelativeHumidity] = deriveRelativeHumidityFromVaporPressure(
        inputs[FieldKey.DryBulbTemperature],
        derived[DerivedFieldKey.VaporPressure] ?? 0,
      );
      refreshDerivedStateForCase(state, caseId);
      return;
    }

    inputs[fieldKey] = convertDisplayToSi(fieldKey, nextValue, state.ui.unitSystem);

    if (
      fieldKey === FieldKey.MetabolicRate &&
      options[ModelOptionKey.PmvAirSpeedInputMode] === PmvAirSpeedInputMode.Measured
    ) {
      syncCurrentPmvDerivedInputs(state, caseId);
      return;
    }

    if (
      fieldKey === FieldKey.DryBulbTemperature &&
      options[ModelOptionKey.PmvHumidityInputMode] !== PmvHumidityInputMode.RelativeHumidity
    ) {
      syncCurrentPmvDerivedInputs(state, caseId);
      return;
    }

    if (
      fieldKey === FieldKey.DryBulbTemperature ||
      fieldKey === FieldKey.RelativeHumidity ||
      fieldKey === FieldKey.RelativeAirSpeed ||
      fieldKey === FieldKey.MetabolicRate
    ) {
      refreshDerivedStateForCase(state, caseId);
    }
  },
  calculate: (state, visibleCaseIds) => {
    const compareChartRequest = toPmvCompareChartRequest(state, visibleCaseIds);
    const resultsByCase = createEmptyPmvResults();
    const comfortZonesByCase = visibleCaseIds.reduce((accumulator, caseId) => {
      accumulator[caseId] = calculateComfortZone(toComfortZoneRequest(state, caseId));
      return accumulator;
    }, {} as ComfortZonesByCase);

    visibleCaseIds.forEach((caseId) => {
      resultsByCase[caseId] = calculatePmv(toPmvRequest(state, caseId));
    });

    return {
      resultsByCase,
      chartResults: {
        [ChartId.Psychrometric]: buildComparePsychrometricChart(
          compareChartRequest,
          comfortZonesByCase,
        ) as PlotlyChartResponseDto,
        [ChartId.RelativeHumidity]: buildRelativeHumidityChart(
          compareChartRequest,
          comfortZonesByCase,
        ) as PlotlyChartResponseDto,
      },
    };
  },
  getFieldPresentation: (state, fieldKey) => {
    const options = getPmvOptions(state);
    const baseMeta = fieldMetaByKey[fieldKey];
    const presentation = {
      label: baseMeta.label,
      displayUnits: baseMeta.displayUnits[state.ui.unitSystem],
      step: baseMeta.step,
      decimals: baseMeta.decimals,
      rangeText: formatRangeText(state, fieldKey),
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

    if (
      fieldKey === FieldKey.DryBulbTemperature &&
      options[ModelOptionKey.PmvTemperatureInputMode] === PmvTemperatureInputMode.Operative
    ) {
      presentation.label = "Operative temperature";
    }

    if (
      fieldKey === FieldKey.MeanRadiantTemperature &&
      options[ModelOptionKey.PmvTemperatureInputMode] === PmvTemperatureInputMode.Operative
    ) {
      presentation.hidden = true;
    }

    if (
      fieldKey === FieldKey.RelativeAirSpeed &&
      options[ModelOptionKey.PmvAirSpeedInputMode] === PmvAirSpeedInputMode.Measured
    ) {
      presentation.label = "Air speed";
    }

    if (fieldKey === FieldKey.RelativeHumidity) {
      if (options[ModelOptionKey.PmvHumidityInputMode] === PmvHumidityInputMode.DewPoint) {
        presentation.label = "Dew point";
        presentation.displayUnits = fieldMetaByKey[FieldKey.DryBulbTemperature].displayUnits[state.ui.unitSystem];
        presentation.step = fieldMetaByKey[FieldKey.DryBulbTemperature].step;
        presentation.decimals = fieldMetaByKey[FieldKey.DryBulbTemperature].decimals;
        presentation.rangeText = "";
      } else if (options[ModelOptionKey.PmvHumidityInputMode] === PmvHumidityInputMode.HumidityRatio) {
        presentation.label = "Humidity ratio";
        presentation.displayUnits = state.ui.unitSystem === UnitSystem.IP ? "gr/lb" : "g/kg";
        presentation.step = state.ui.unitSystem === UnitSystem.IP ? 1 : 0.1;
        presentation.decimals = state.ui.unitSystem === UnitSystem.IP ? 0 : 1;
        presentation.rangeText = "";
      } else if (options[ModelOptionKey.PmvHumidityInputMode] === PmvHumidityInputMode.WetBulb) {
        presentation.label = "Wet-bulb temperature";
        presentation.displayUnits = fieldMetaByKey[FieldKey.DryBulbTemperature].displayUnits[state.ui.unitSystem];
        presentation.step = fieldMetaByKey[FieldKey.DryBulbTemperature].step;
        presentation.decimals = fieldMetaByKey[FieldKey.DryBulbTemperature].decimals;
        presentation.rangeText = "";
      } else if (options[ModelOptionKey.PmvHumidityInputMode] === PmvHumidityInputMode.VaporPressure) {
        presentation.label = "Vapor pressure";
        presentation.displayUnits = state.ui.unitSystem === UnitSystem.IP ? "inHg" : "kPa";
        presentation.step = 0.01;
        presentation.decimals = 2;
        presentation.rangeText = "";
      }
    }

    return presentation;
  },
  getDisplayValue: (state, caseId, fieldKey) => {
    const options = getPmvOptions(state);
    const presentation = pmvModelConfig.getFieldPresentation(state, fieldKey);

    if (
      fieldKey === FieldKey.DryBulbTemperature &&
      options[ModelOptionKey.PmvTemperatureInputMode] === PmvTemperatureInputMode.Operative
    ) {
      return getTemperatureDisplayValue(state, caseId, presentation.decimals);
    }

    if (
      fieldKey === FieldKey.RelativeAirSpeed &&
      options[ModelOptionKey.PmvAirSpeedInputMode] === PmvAirSpeedInputMode.Measured
    ) {
      return formatDisplayValue(
        convertSiToDisplay(
          FieldKey.RelativeAirSpeed,
          state.derivedByCase[caseId][DerivedFieldKey.MeasuredAirSpeed] ?? 0,
          state.ui.unitSystem,
        ),
        presentation.decimals,
      );
    }

    if (
      fieldKey === FieldKey.RelativeHumidity &&
      options[ModelOptionKey.PmvHumidityInputMode] === PmvHumidityInputMode.DewPoint
    ) {
      return formatDisplayValue(
        convertSiToDisplay(
          FieldKey.DryBulbTemperature,
          state.derivedByCase[caseId][DerivedFieldKey.DewPoint] ?? 0,
          state.ui.unitSystem,
        ),
        presentation.decimals,
      );
    }

    if (
      fieldKey === FieldKey.RelativeHumidity &&
      options[ModelOptionKey.PmvHumidityInputMode] === PmvHumidityInputMode.HumidityRatio
    ) {
      return formatDisplayValue(
        convertHumidityRatioSiToDisplay(
          state.derivedByCase[caseId][DerivedFieldKey.HumidityRatio] ?? 0,
          state.ui.unitSystem,
        ),
        presentation.decimals,
      );
    }

    if (
      fieldKey === FieldKey.RelativeHumidity &&
      options[ModelOptionKey.PmvHumidityInputMode] === PmvHumidityInputMode.WetBulb
    ) {
      return formatDisplayValue(
        convertSiToDisplay(
          FieldKey.DryBulbTemperature,
          state.derivedByCase[caseId][DerivedFieldKey.WetBulb] ?? 0,
          state.ui.unitSystem,
        ),
        presentation.decimals,
      );
    }

    if (
      fieldKey === FieldKey.RelativeHumidity &&
      options[ModelOptionKey.PmvHumidityInputMode] === PmvHumidityInputMode.VaporPressure
    ) {
      return formatDisplayValue(
        convertVaporPressureSiToDisplay(
          state.derivedByCase[caseId][DerivedFieldKey.VaporPressure] ?? 0,
          state.ui.unitSystem,
        ),
        presentation.decimals,
      );
    }

    return formatDisplayValue(
      convertSiToDisplay(fieldKey, state.inputsByCase[caseId][fieldKey], state.ui.unitSystem),
      presentation.decimals,
    );
  },
  getAdvancedOptionMenu: (state, fieldKey) => {
    const options = getPmvOptions(state);
    const selectedChart = state.ui.selectedChartByModel[ComfortModel.Pmv];

    if (
      fieldKey === FieldKey.DryBulbTemperature &&
      (
        selectedChart === PmvChartId.Psychrometric ||
        options[ModelOptionKey.PmvTemperatureInputMode] === PmvTemperatureInputMode.Operative
      )
    ) {
      return {
        title: "Temperature input",
        items: [
          {
            label: "Air temperature",
            description: "Use dry-bulb air temperature and keep radiant temperature separate.",
            optionKey: ModelOptionKey.PmvTemperatureInputMode,
            value: PmvTemperatureInputMode.Air,
            active: options[ModelOptionKey.PmvTemperatureInputMode] === PmvTemperatureInputMode.Air,
          },
          {
            label: "Operative temp",
            description: "Treat operative temperature as the single temperature input.",
            optionKey: ModelOptionKey.PmvTemperatureInputMode,
            value: PmvTemperatureInputMode.Operative,
            active: options[ModelOptionKey.PmvTemperatureInputMode] === PmvTemperatureInputMode.Operative,
          },
        ],
      };
    }

    if (fieldKey === FieldKey.RelativeAirSpeed) {
      return {
        title: "Air speed input",
        items: [
          {
            label: "No local control",
            description: "Assume occupants do not have local control over elevated air speed.",
            optionKey: ModelOptionKey.PmvAirSpeedControlMode,
            value: PmvAirSpeedControlMode.NoLocalControl,
            active: options[ModelOptionKey.PmvAirSpeedControlMode] === PmvAirSpeedControlMode.NoLocalControl,
          },
          {
            label: "With local control",
            description: "Assume occupants can locally control elevated air speed.",
            optionKey: ModelOptionKey.PmvAirSpeedControlMode,
            value: PmvAirSpeedControlMode.WithLocalControl,
            active: options[ModelOptionKey.PmvAirSpeedControlMode] === PmvAirSpeedControlMode.WithLocalControl,
          },
        ],
      };
    }

    if (fieldKey === FieldKey.RelativeHumidity) {
      return {
        title: "Humidity input",
        items: [
          {
            label: "Relative humidity",
            description: "Input relative humidity as a percentage.",
            optionKey: ModelOptionKey.PmvHumidityInputMode,
            value: PmvHumidityInputMode.RelativeHumidity,
            active: options[ModelOptionKey.PmvHumidityInputMode] === PmvHumidityInputMode.RelativeHumidity,
          },
          {
            label: "Humidity ratio",
            description: "Hold absolute moisture content constant.",
            optionKey: ModelOptionKey.PmvHumidityInputMode,
            value: PmvHumidityInputMode.HumidityRatio,
            active: options[ModelOptionKey.PmvHumidityInputMode] === PmvHumidityInputMode.HumidityRatio,
          },
          {
            label: "Dew point",
            description: "Keep dew point fixed and derive relative humidity from dry-bulb temperature.",
            optionKey: ModelOptionKey.PmvHumidityInputMode,
            value: PmvHumidityInputMode.DewPoint,
            active: options[ModelOptionKey.PmvHumidityInputMode] === PmvHumidityInputMode.DewPoint,
          },
          {
            label: "Wet bulb",
            description: "Input wet-bulb temperature instead of relative humidity.",
            optionKey: ModelOptionKey.PmvHumidityInputMode,
            value: PmvHumidityInputMode.WetBulb,
            active: options[ModelOptionKey.PmvHumidityInputMode] === PmvHumidityInputMode.WetBulb,
          },
          {
            label: "Vapor pressure",
            description: "Input vapor pressure directly.",
            optionKey: ModelOptionKey.PmvHumidityInputMode,
            value: PmvHumidityInputMode.VaporPressure,
            active: options[ModelOptionKey.PmvHumidityInputMode] === PmvHumidityInputMode.VaporPressure,
          },
        ],
      };
    }

    return null;
  },
  getResultSections: (state, visibleCaseIds) => {
    const results = state.ui.resultsByModel[ComfortModel.Pmv];

    return [
      {
        title: "Compliance",
        valuesByCase: visibleCaseIds.reduce((accumulator, caseId) => {
          const result = results[caseId];
          accumulator[caseId] = result
            ? {
                text: result.acceptable_80 ? "Compliant" : "Out of range",
                toneClass: result.acceptable_80 ? "font-semibold text-emerald-700" : "font-semibold text-red-600",
              }
            : null;
          return accumulator;
        }, {}),
      },
      {
        title: "PMV",
        valuesByCase: visibleCaseIds.reduce((accumulator, caseId) => {
          const result = results[caseId];
          accumulator[caseId] = result
            ? { text: result.pmv.toFixed(2), toneClass: "text-base font-semibold text-stone-900" }
            : null;
          return accumulator;
        }, {}),
      },
      {
        title: "PPD",
        valuesByCase: visibleCaseIds.reduce((accumulator, caseId) => {
          const result = results[caseId];
          accumulator[caseId] = result
            ? { text: `${result.ppd.toFixed(1)}%`, toneClass: "text-base font-semibold text-stone-900" }
            : null;
          return accumulator;
        }, {}),
      },
      {
        title: "Acceptability",
        valuesByCase: visibleCaseIds.reduce((accumulator, caseId) => {
          const result = results[caseId];
          accumulator[caseId] = result
            ? { text: `${(100 - result.ppd).toFixed(1)}%`, toneClass: "text-base font-semibold text-stone-900" }
            : null;
          return accumulator;
        }, {}),
      },
    ];
  },
};

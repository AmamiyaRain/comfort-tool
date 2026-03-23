import { clothingTypicalEnsembles } from "../../models/clothingEnsembles";
import { ComfortModel } from "../../models/comfortModels";
import { fieldMetaByKey } from "../../models/fieldMeta";
import { FieldKey } from "../../models/fieldKeys";
import {
  PmvAirSpeedInputMode,
  PmvHumidityInputMode,
  PmvTemperatureInputMode,
} from "../../models/inputModes";
import { metabolicActivityOptions } from "../../models/metabolicActivities";
import { UnitSystem } from "../../models/units";
import {
  convertHumidityRatioSiToDisplay,
  convertVaporPressureSiToDisplay,
} from "../../services/advancedPmvInputs";
import { convertSiToDisplay, formatDisplayValue } from "../../services/unitConversion";
import type { ComfortToolState } from "../../state/comfortTool.svelte";

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

export function getDisplayValue(toolState: ComfortToolState, caseId, fieldKey, decimals) {
  if (
    toolState.state.ui.selectedModel === ComfortModel.Pmv &&
    fieldKey === FieldKey.RelativeAirSpeed &&
    toolState.state.ui.pmvAirSpeedInputMode === PmvAirSpeedInputMode.Measured
  ) {
    return formatDisplayValue(
      convertSiToDisplay(FieldKey.RelativeAirSpeed, toolState.state.measuredAirSpeedByCase[caseId], toolState.state.ui.unitSystem),
      decimals,
    );
  }

  if (
    toolState.state.ui.selectedModel === ComfortModel.Pmv &&
    fieldKey === FieldKey.RelativeHumidity &&
    toolState.state.ui.pmvHumidityInputMode === PmvHumidityInputMode.DewPoint
  ) {
    return formatDisplayValue(
      convertSiToDisplay(FieldKey.DryBulbTemperature, toolState.state.dewPointByCase[caseId], toolState.state.ui.unitSystem),
      decimals,
    );
  }

  if (
    toolState.state.ui.selectedModel === ComfortModel.Pmv &&
    fieldKey === FieldKey.RelativeHumidity &&
    toolState.state.ui.pmvHumidityInputMode === PmvHumidityInputMode.HumidityRatio
  ) {
    return formatDisplayValue(
      convertHumidityRatioSiToDisplay(toolState.state.humidityRatioByCase[caseId], toolState.state.ui.unitSystem),
      decimals,
    );
  }

  if (
    toolState.state.ui.selectedModel === ComfortModel.Pmv &&
    fieldKey === FieldKey.RelativeHumidity &&
    toolState.state.ui.pmvHumidityInputMode === PmvHumidityInputMode.WetBulb
  ) {
    return formatDisplayValue(
      convertSiToDisplay(FieldKey.DryBulbTemperature, toolState.state.wetBulbByCase[caseId], toolState.state.ui.unitSystem),
      decimals,
    );
  }

  if (
    toolState.state.ui.selectedModel === ComfortModel.Pmv &&
    fieldKey === FieldKey.RelativeHumidity &&
    toolState.state.ui.pmvHumidityInputMode === PmvHumidityInputMode.VaporPressure
  ) {
    return formatDisplayValue(
      convertVaporPressureSiToDisplay(toolState.state.vaporPressureByCase[caseId], toolState.state.ui.unitSystem),
      decimals,
    );
  }

  return formatDisplayValue(
    convertSiToDisplay(fieldKey, toolState.state.inputsByCase[caseId][fieldKey], toolState.state.ui.unitSystem),
    decimals,
  );
}

export function getFieldLabel(toolState: ComfortToolState, fieldKey) {
  if (
    toolState.state.ui.selectedModel === ComfortModel.Pmv &&
    fieldKey === FieldKey.DryBulbTemperature &&
    toolState.state.ui.pmvTemperatureInputMode === PmvTemperatureInputMode.Operative
  ) {
    return "Operative temperature";
  }

  if (
    toolState.state.ui.selectedModel === ComfortModel.Pmv &&
    fieldKey === FieldKey.RelativeAirSpeed &&
    toolState.state.ui.pmvAirSpeedInputMode === PmvAirSpeedInputMode.Measured
  ) {
    return "Air speed";
  }

  if (
    toolState.state.ui.selectedModel === ComfortModel.Pmv &&
    fieldKey === FieldKey.RelativeHumidity &&
    toolState.state.ui.pmvHumidityInputMode === PmvHumidityInputMode.DewPoint
  ) {
    return "Dew point";
  }

  if (
    toolState.state.ui.selectedModel === ComfortModel.Pmv &&
    fieldKey === FieldKey.RelativeHumidity &&
    toolState.state.ui.pmvHumidityInputMode === PmvHumidityInputMode.HumidityRatio
  ) {
    return "Humidity ratio";
  }

  if (
    toolState.state.ui.selectedModel === ComfortModel.Pmv &&
    fieldKey === FieldKey.RelativeHumidity &&
    toolState.state.ui.pmvHumidityInputMode === PmvHumidityInputMode.WetBulb
  ) {
    return "Wet-bulb temperature";
  }

  if (
    toolState.state.ui.selectedModel === ComfortModel.Pmv &&
    fieldKey === FieldKey.RelativeHumidity &&
    toolState.state.ui.pmvHumidityInputMode === PmvHumidityInputMode.VaporPressure
  ) {
    return "Vapor pressure";
  }

  return fieldMetaByKey[fieldKey].label;
}

export function getFieldDisplayUnits(toolState: ComfortToolState, fieldKey) {
  if (
    toolState.state.ui.selectedModel === ComfortModel.Pmv &&
    fieldKey === FieldKey.RelativeHumidity &&
    toolState.state.ui.pmvHumidityInputMode === PmvHumidityInputMode.DewPoint
  ) {
    return fieldMetaByKey[FieldKey.DryBulbTemperature].displayUnits[toolState.state.ui.unitSystem];
  }

  if (
    toolState.state.ui.selectedModel === ComfortModel.Pmv &&
    fieldKey === FieldKey.RelativeHumidity &&
    toolState.state.ui.pmvHumidityInputMode === PmvHumidityInputMode.HumidityRatio
  ) {
    return toolState.state.ui.unitSystem === UnitSystem.IP ? "gr/lb" : "g/kg";
  }

  if (
    toolState.state.ui.selectedModel === ComfortModel.Pmv &&
    fieldKey === FieldKey.RelativeHumidity &&
    toolState.state.ui.pmvHumidityInputMode === PmvHumidityInputMode.WetBulb
  ) {
    return fieldMetaByKey[FieldKey.DryBulbTemperature].displayUnits[toolState.state.ui.unitSystem];
  }

  if (
    toolState.state.ui.selectedModel === ComfortModel.Pmv &&
    fieldKey === FieldKey.RelativeHumidity &&
    toolState.state.ui.pmvHumidityInputMode === PmvHumidityInputMode.VaporPressure
  ) {
    return toolState.state.ui.unitSystem === UnitSystem.IP ? "inHg" : "kPa";
  }

  return fieldMetaByKey[fieldKey].displayUnits[toolState.state.ui.unitSystem];
}

export function getFieldStep(toolState: ComfortToolState, fieldKey) {
  if (
    toolState.state.ui.selectedModel === ComfortModel.Pmv &&
    fieldKey === FieldKey.RelativeHumidity &&
    toolState.state.ui.pmvHumidityInputMode === PmvHumidityInputMode.DewPoint
  ) {
    return fieldMetaByKey[FieldKey.DryBulbTemperature].step;
  }

  if (
    toolState.state.ui.selectedModel === ComfortModel.Pmv &&
    fieldKey === FieldKey.RelativeHumidity &&
    toolState.state.ui.pmvHumidityInputMode === PmvHumidityInputMode.HumidityRatio
  ) {
    return toolState.state.ui.unitSystem === UnitSystem.IP ? 1 : 0.1;
  }

  if (
    toolState.state.ui.selectedModel === ComfortModel.Pmv &&
    fieldKey === FieldKey.RelativeHumidity &&
    toolState.state.ui.pmvHumidityInputMode === PmvHumidityInputMode.WetBulb
  ) {
    return fieldMetaByKey[FieldKey.DryBulbTemperature].step;
  }

  if (
    toolState.state.ui.selectedModel === ComfortModel.Pmv &&
    fieldKey === FieldKey.RelativeHumidity &&
    toolState.state.ui.pmvHumidityInputMode === PmvHumidityInputMode.VaporPressure
  ) {
    return 0.01;
  }

  return fieldMetaByKey[fieldKey].step;
}

export function getFieldDecimals(toolState: ComfortToolState, fieldKey) {
  if (
    toolState.state.ui.selectedModel === ComfortModel.Pmv &&
    fieldKey === FieldKey.RelativeHumidity &&
    toolState.state.ui.pmvHumidityInputMode === PmvHumidityInputMode.DewPoint
  ) {
    return fieldMetaByKey[FieldKey.DryBulbTemperature].decimals;
  }

  if (
    toolState.state.ui.selectedModel === ComfortModel.Pmv &&
    fieldKey === FieldKey.RelativeHumidity &&
    toolState.state.ui.pmvHumidityInputMode === PmvHumidityInputMode.HumidityRatio
  ) {
    return toolState.state.ui.unitSystem === UnitSystem.IP ? 0 : 1;
  }

  if (
    toolState.state.ui.selectedModel === ComfortModel.Pmv &&
    fieldKey === FieldKey.RelativeHumidity &&
    toolState.state.ui.pmvHumidityInputMode === PmvHumidityInputMode.WetBulb
  ) {
    return fieldMetaByKey[FieldKey.DryBulbTemperature].decimals;
  }

  if (
    toolState.state.ui.selectedModel === ComfortModel.Pmv &&
    fieldKey === FieldKey.RelativeHumidity &&
    toolState.state.ui.pmvHumidityInputMode === PmvHumidityInputMode.VaporPressure
  ) {
    return 2;
  }

  return fieldMetaByKey[fieldKey].decimals;
}

export function getFieldRange(toolState: ComfortToolState, fieldKey) {
  const meta = fieldMetaByKey[fieldKey];
  if (
    toolState.state.ui.selectedModel === ComfortModel.Pmv &&
    fieldKey === FieldKey.RelativeHumidity &&
    toolState.state.ui.pmvHumidityInputMode !== PmvHumidityInputMode.RelativeHumidity
  ) {
    return "";
  }
  const min = formatDisplayValue(convertSiToDisplay(fieldKey, meta.minValue, toolState.state.ui.unitSystem), meta.decimals);
  const max = formatDisplayValue(convertSiToDisplay(fieldKey, meta.maxValue, toolState.state.ui.unitSystem), meta.decimals);
  return `From ${min} to ${max}`;
}

export function showClothingBuilder(toolState: ComfortToolState, fieldKey) {
  return toolState.state.ui.selectedModel === ComfortModel.Pmv && fieldKey === FieldKey.ClothingInsulation;
}

export function showPresetInput(toolState: ComfortToolState, fieldKey) {
  return (
    toolState.state.ui.selectedModel === ComfortModel.Pmv &&
    (fieldKey === FieldKey.ClothingInsulation || fieldKey === FieldKey.MetabolicRate)
  );
}

export function getPresetInputOptions(fieldKey) {
  if (fieldKey === FieldKey.ClothingInsulation) {
    return clothingPresetOptions;
  }

  if (fieldKey === FieldKey.MetabolicRate) {
    return metabolicPresetOptions;
  }

  return [];
}

export function getPresetInputDecimals(fieldKey) {
  if (fieldKey === FieldKey.ClothingInsulation) {
    return 2;
  }

  return fieldMetaByKey[fieldKey].decimals;
}

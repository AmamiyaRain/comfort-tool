import {
  clothingGarmentOptions,
  type ClothingGarmentOption,
} from "../models/clothingEnsembles";

export function roundClothingValue(value: number): number {
  return Number(value.toFixed(2));
}

export function filterClothingGarments(
  garments: ClothingGarmentOption[],
  query: string,
): ClothingGarmentOption[] {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return garments;
  }

  return garments.filter((garment) => garment.article.toLowerCase().includes(normalizedQuery));
}

export function sumSelectedGarmentClo(
  selectedGarmentIds: string[],
  garments: ClothingGarmentOption[] = clothingGarmentOptions,
): number {
  const selectedSet = new Set(selectedGarmentIds);
  const total = garments.reduce((accumulator, garment) => (
    selectedSet.has(garment.id) ? accumulator + garment.clo : accumulator
  ), 0);

  return roundClothingValue(total);
}

export function getSelectedGarments(
  selectedGarmentIds: string[],
  garments: ClothingGarmentOption[] = clothingGarmentOptions,
): ClothingGarmentOption[] {
  const selectedSet = new Set(selectedGarmentIds);
  return garments.filter((garment) => selectedSet.has(garment.id));
}

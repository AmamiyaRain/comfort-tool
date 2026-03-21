import { describe, expect, it } from "vitest";

import { clothingGarmentOptions } from "../models/clothingEnsembles";
import {
  filterClothingGarments,
  getSelectedGarments,
  roundClothingValue,
  sumSelectedGarmentClo,
} from "./clothingEnsembles";

describe("clothingEnsembles", () => {
  it("rounds clo totals to two decimals", () => {
    expect(roundClothingValue(0.579999)).toBe(0.58);
  });

  it("filters garments by case-insensitive query", () => {
    const results = filterClothingGarments(clothingGarmentOptions, "shirt");

    expect(results.length).toBeGreaterThan(0);
    expect(results.some((garment) => garment.article === "T-shirt")).toBe(true);
    expect(results.every((garment) => garment.article.toLowerCase().includes("shirt"))).toBe(true);
  });

  it("sums selected garment clo values from the original CBE dataset", () => {
    const selectedGarments = clothingGarmentOptions.filter((garment) => (
      garment.article === "Walking shorts" ||
      garment.article === "T-shirt" ||
      garment.article === "Shoes or sandals"
    ));

    const selectedIds = selectedGarments.map((garment) => garment.id);

    expect(sumSelectedGarmentClo(selectedIds, clothingGarmentOptions)).toBe(0.18);
    expect(getSelectedGarments(selectedIds, clothingGarmentOptions)).toHaveLength(3);
  });
});

interface ClothingEnsembleOption {
  id: string;
  label: string;
  clo: number;
}

export interface ClothingGarmentOption {
  id: string;
  article: string;
  clo: number;
}

function createClothingOptionId(label: string, clo: number): string {
  const normalizedLabel = label
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  const normalizedClo = clo.toFixed(2).replace(".", "-");
  return `${normalizedLabel}-${normalizedClo}`;
}

const clothingTypicalEnsembleSource = [
  { label: "Walking shorts, short-sleeve shirt", clo: 0.36 },
  { label: "Typical summer indoor clothing", clo: 0.5 },
  { label: "Knee-length skirt, short-sleeve shirt, sandals, underwear", clo: 0.54 },
  { label: "Trousers, short-sleeve shirt, socks, shoes, underwear", clo: 0.57 },
  { label: "Trousers, long-sleeve shirt", clo: 0.61 },
  { label: "Knee-length skirt, long-sleeve shirt, full slip", clo: 0.67 },
  { label: "Sweat pants, long-sleeve sweatshirt", clo: 0.74 },
  { label: "Jacket, trousers, long-sleeve shirt", clo: 0.96 },
  { label: "Typical winter indoor clothing", clo: 1.0 },
] as const;

const clothingGarmentSource = [
  { article: "Metal chair", clo: 0.0 },
  { article: "Bra", clo: 0.01 },
  { article: "Wooden stool", clo: 0.01 },
  { article: "Ankle socks", clo: 0.02 },
  { article: "Shoes or sandals", clo: 0.02 },
  { article: "Slippers", clo: 0.03 },
  { article: "Panty hose", clo: 0.02 },
  { article: "Calf length socks", clo: 0.03 },
  { article: "Women's underwear", clo: 0.03 },
  { article: "Men's underwear", clo: 0.04 },
  { article: "Knee socks (thick)", clo: 0.06 },
  { article: "Short shorts", clo: 0.06 },
  { article: "Walking shorts", clo: 0.08 },
  { article: "T-shirt", clo: 0.08 },
  { article: "Standard office chair", clo: 0.1 },
  { article: "Executive chair", clo: 0.15 },
  { article: "Boots", clo: 0.1 },
  { article: "Sleeveless scoop-neck blouse", clo: 0.12 },
  { article: "Half slip", clo: 0.14 },
  { article: "Long underwear bottoms", clo: 0.15 },
  { article: "Full slip", clo: 0.16 },
  { article: "Short-sleeve knit shirt", clo: 0.17 },
  { article: "Sleeveless vest (thin)", clo: 0.1 },
  { article: "Sleeveless vest (thick)", clo: 0.17 },
  { article: "Sleeveless short gown (thin)", clo: 0.18 },
  { article: "Short-sleeve dress shirt", clo: 0.19 },
  { article: "Sleeveless long gown (thin)", clo: 0.2 },
  { article: "Long underwear top", clo: 0.2 },
  { article: "Thick skirt", clo: 0.23 },
  { article: "Long-sleeve dress shirt", clo: 0.25 },
  { article: "Long-sleeve flannel shirt", clo: 0.34 },
  { article: "Long-sleeve sweat shirt", clo: 0.34 },
  { article: "Short-sleeve hospital gown", clo: 0.31 },
  { article: "Short-sleeve short robe (thin)", clo: 0.34 },
  { article: "Short-sleeve pajamas", clo: 0.42 },
  { article: "Long-sleeve long gown", clo: 0.46 },
  { article: "Long-sleeve short wrap robe (thick)", clo: 0.48 },
  { article: "Long-sleeve pajamas (thick)", clo: 0.57 },
  { article: "Long-sleeve long wrap robe (thick)", clo: 0.69 },
  { article: "Thin trousers", clo: 0.15 },
  { article: "Thick trousers", clo: 0.24 },
  { article: "Sweatpants", clo: 0.28 },
  { article: "Overalls", clo: 0.3 },
  { article: "Coveralls", clo: 0.49 },
  { article: "Thin skirt", clo: 0.14 },
  { article: "Long-sleeve shirtdress (thin)", clo: 0.33 },
  { article: "Long-sleeve shirtdress (thick)", clo: 0.47 },
  { article: "Short-sleeve shirtdress", clo: 0.29 },
  { article: "Sleeveless, scoop-neck shirt (thin)", clo: 0.23 },
  { article: "Sleeveless, scoop-neck shirt (thick)", clo: 0.27 },
  { article: "Sleeveless vest (thin)", clo: 0.13 },
  { article: "Sleeveless vest (thick)", clo: 0.22 },
  { article: "Long sleeve shirt (thin)", clo: 0.25 },
  { article: "Long sleeve shirt (thick)", clo: 0.36 },
  { article: "Single-breasted coat (thin)", clo: 0.36 },
  { article: "Single-breasted coat (thick)", clo: 0.44 },
  { article: "Double-breasted coat (thin)", clo: 0.42 },
  { article: "Double-breasted coat (thick)", clo: 0.48 },
] as const;

export const clothingTypicalEnsembles: ClothingEnsembleOption[] = clothingTypicalEnsembleSource.map((option) => ({
  id: createClothingOptionId(option.label, option.clo),
  label: option.label,
  clo: option.clo,
}));

export const clothingGarmentOptions: ClothingGarmentOption[] = clothingGarmentSource.map((option) => ({
  id: createClothingOptionId(option.article, option.clo),
  article: option.article,
  clo: option.clo,
}));

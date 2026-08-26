export type TaxonomyKey = "categories" | "subcategories" | "themes" | "colors";

export interface TaxonomyItem {
  id: string;
  label: string;
  isVisible: boolean;
}

export type CatalogTaxonomy = Record<TaxonomyKey, TaxonomyItem[]>;

export const defaultCatalogTaxonomy: CatalogTaxonomy = {
  categories: [
    { id: "colliers", label: "Colliers", isVisible: true },
    { id: "bagues", label: "Bagues", isVisible: true },
    { id: "boucles", label: "Boucles d'oreilles", isVisible: true },
    { id: "bracelets", label: "Bracelets", isVisible: true },
  ],
  subcategories: [],
  themes: [],
  colors: [],
};

export const taxonomyLabels: Record<TaxonomyKey, string> = {
  categories: "Catégories",
  subcategories: "Sous-catégories",
  themes: "Thèmes",
  colors: "Couleurs",
};

export const createTaxonomyId = (label: string) => label
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase()
  .trim()
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-|-$/g, "");

import { splitIcons } from "@/lib/nutrients";

export default function Tags({ icons, showAllergens = true }: { icons: string[]; showAllergens?: boolean }) {
  const { allergens, tags } = splitIcons(icons);
  return (
    <span className="inline-flex flex-wrap gap-1">
      {tags.map((t) => (
        <span key={t} className="chip bg-emerald-50 text-emerald-800">
          {t}
        </span>
      ))}
      {showAllergens && allergens.length > 0 ? (
        <span className="chip bg-amber-50 text-amber-900">Contains: {allergens.join(", ")}</span>
      ) : null}
    </span>
  );
}

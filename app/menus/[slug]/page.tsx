import MenuBrowser from "./MenuBrowser";
import { campusToday, isValidDate } from "@/lib/dates";
import { isMeal } from "@/lib/logs";

export default async function LocationMenuPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  return (
    <MenuBrowser
      slug={slug}
      initialDate={isValidDate(sp.date) ? sp.date : campusToday()}
      meal={isMeal(sp.meal) ? sp.meal : null}
    />
  );
}

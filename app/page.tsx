import { getServerSession } from "next-auth";
import Link from "next/link";
import SignInButtons from "@/components/SignInButtons";
import Tracker from "@/components/Tracker";
import { authOptions, devLoginEnabled } from "@/lib/auth";
import { campusToday, isValidDate } from "@/lib/dates";

export default async function Home({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const session = await getServerSession(authOptions);
  const sp = await searchParams;
  const date = isValidDate(sp.date) ? sp.date : campusToday();

  if (session?.user?.id) return <Tracker initialDate={date} />;

  return (
    <div className="mx-auto max-w-xl space-y-6 py-8 text-center">
      <h1 className="text-3xl font-bold">Track what you eat on campus</h1>
      <p className="text-stone-600">
        SBNutrition pulls every Stony Brook dining menu daily — East &amp; West Side Dining, SAC, Roth, Jasmine and more —
        so you can log meals in a couple of taps and see calories, macros, vitamins, minerals and ingredients over days,
        weeks and months.
      </p>
      <SignInButtons devLogin={devLoginEnabled} />
      <p className="text-sm text-stone-500">
        Just browsing?{" "}
        <Link className="text-brand-600 underline" href="/menus">
          See today&apos;s menus
        </Link>
      </p>
    </div>
  );
}

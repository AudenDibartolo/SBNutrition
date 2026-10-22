import SignInButtons from "@/components/SignInButtons";
import { devLoginEnabled } from "@/lib/auth";

const ERRORS: Record<string, string> = {
  AccessDenied: "That account isn't allowed to sign in. Try your Stony Brook Google account.",
  OAuthSignin: "Couldn't start Google sign-in. Please try again.",
  OAuthCallback: "Google sign-in failed. Please try again.",
};

export default async function SignInPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const { error, callbackUrl } = await searchParams;
  // Only allow same-site redirects after sign-in.
  const safeCallback = callbackUrl && callbackUrl.startsWith("/") && !callbackUrl.startsWith("//") ? callbackUrl : "/";
  return (
    <div className="mx-auto max-w-md space-y-5 py-10 text-center">
      <h1 className="text-2xl font-bold">Sign in to SBNutrition</h1>
      <p className="text-stone-600">Your food log is saved to your account so you can see it on any device.</p>
      {error ? <p className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{ERRORS[error] ?? "Sign-in failed. Please try again."}</p> : null}
      <SignInButtons devLogin={devLoginEnabled} callbackUrl={safeCallback} />
    </div>
  );
}

"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";

export default function SignInButtons({ devLogin, callbackUrl = "/" }: { devLogin: boolean; callbackUrl?: string }) {
  const [email, setEmail] = useState("");
  return (
    <div className="mx-auto flex max-w-xs flex-col gap-3">
      <button className="btn-primary py-3 text-base" onClick={() => signIn("google", { callbackUrl })}>
        <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
          <path fill="#fff" d="M21.35 11.1H12v3.2h5.35c-.5 2.4-2.6 3.9-5.35 3.9a6.2 6.2 0 1 1 4-10.9l2.4-2.4A9.6 9.6 0 1 0 21.6 12c0-.3 0-.6-.05-.9z" />
        </svg>
        Continue with Google
      </button>
      {devLogin ? (
        <form
          className="flex gap-2 rounded-lg border border-dashed border-stone-300 p-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (email) signIn("dev", { email, callbackUrl });
          }}
        >
          <input
            className="input min-w-0 flex-1"
            type="email"
            placeholder="dev login (local only)"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <button className="btn-secondary" type="submit">
            Go
          </button>
        </form>
      ) : null}
    </div>
  );
}

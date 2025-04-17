"use client";

import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Loader2 } from "lucide-react";
import { authClient } from "~/lib/auth-client";
import { fetchCallback } from "~/lib/utils";

interface SocialSignInProps {
  showSignUp?: boolean;
}

export function SocialSignIn({ showSignUp = false }: SocialSignInProps) {
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  async function handleGoogleSignIn() {
    await authClient.signIn.social(
      {
        provider: "google",
        callbackURL: "/",
      },
      fetchCallback({ setIsPending: setIsGoogleLoading }),
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background text-muted-foreground px-2">
            Or continue with
          </span>
        </div>
      </div>
      <Button
        variant="outline"
        onClick={handleGoogleSignIn}
        disabled={isGoogleLoading}
        className="h-10 w-full"
      >
        {isGoogleLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="mr-2 h-4 w-4"
            viewBox="0 0 24 24"
          >
            <path
              fill="currentColor"
              d="M12.545 10.239v3.821h5.445c-.712 2.315-2.647 3.972-5.445 3.972a6.033 6.033 0 1 1 0-12.064c1.498 0 2.866.549 3.921 1.453l2.814-2.814A9.969 9.969 0 0 0 12.545 2C7.021 2 2.543 6.477 2.543 12s4.478 10 10.002 10c8.396 0 10.249-7.85 9.426-11.748l-9.426-.013z"
            />
          </svg>
        )}
        Continue with Google
      </Button>
    </div>
  );
}
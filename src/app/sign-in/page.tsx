import { Suspense } from "react";
import { SignInForm } from "~/components/auth/SignInForm";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In",
};

export default function SignInPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center">
          Loading...
        </div>
      }
    >
      <div className="container mx-auto flex min-h-screen flex-col items-center justify-center py-12">
        <SignInForm />
      </div>
    </Suspense>
  );
}
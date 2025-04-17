import { Metadata } from "next";
import { Suspense } from "react";
import { SignUpForm } from "~/components/auth/SignUpForm";

export const metadata: Metadata = {
  title: "Sign Up",
};

export default function SignUpPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <div className="container mx-auto flex h-screen w-full items-center justify-center">
        <SignUpForm />
      </div>
    </Suspense>
  );
}
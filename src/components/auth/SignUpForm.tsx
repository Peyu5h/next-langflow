"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Loader2,
  User,
  Mail,
  Lock,
  AlertCircle,
  EyeOff,
  Eye,
} from "lucide-react";
import { authClient } from "~/lib/auth-client";
import { toast } from "sonner";
import { SocialSignIn } from "./SocialSignIn";
import { Alert, AlertDescription } from "~/components/ui/alert";

export function SignUpForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const result = await authClient.signUp.email(
        {
          name,
          email,
          password,
        },
        {
          onRequest: () => {
            setIsLoading(true);
          },
          onSuccess: () => {
            toast.success("Account created successfully", {
              description: "Welcome to our platform!",
            });
            router.push("/");
            router.refresh();
          },
          onError: (ctx) => {
            setError(ctx.error.message || "Failed to sign up");
          },
        },
      );

      if (result && result.error) {
        setError(result.error.message || "Failed to sign up");
        return;
      }
    } catch (err) {
      console.error("Sign-up error:", err);
      setError(err instanceof Error ? err.message : "Failed to sign up");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="bg-card w-full max-w-md space-y-6 rounded-lg border p-8 shadow-sm">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-bold">Create an account</h1>
        <p className="text-muted-foreground text-sm">
          Enter your information to get started
        </p>
      </div>

      {error && (
        <Alert variant="destructive" className="text-sm">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSignUp} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Full Name</Label>
          <div className="relative">
            <User className="text-muted-foreground absolute top-3 left-3 h-4 w-4" />
            <Input
              id="name"
              placeholder="Enter your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="pl-10"
              disabled={isLoading}
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <div className="relative">
            <Mail className="text-muted-foreground absolute top-3 left-3 h-4 w-4" />
            <Input
              id="email"
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-10"
              disabled={isLoading}
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <div className="relative flex items-center">
            <Lock className="text-muted-foreground absolute top-3 left-3 h-4 w-4" />
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="pl-10"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="text-primary absolute top-1/2 right-3 -translate-y-1/2 transform text-xs hover:underline"
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        <Button
          type="submit"
          className="w-full"
          disabled={isLoading || !email || !password || !name}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating account...
            </>
          ) : (
            "Create account"
          )}
        </Button>
      </form>

      <SocialSignIn showSignUp={true} />

      <div className="text-center text-sm">
        <p className="text-muted-foreground">
          Already have an account?{" "}
          <Link
            href="/sign-in"
            className="text-primary font-medium hover:underline"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

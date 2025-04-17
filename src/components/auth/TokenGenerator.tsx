"use client";

import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "~/components/ui/card";
import { toast } from "sonner";
import { Copy, Loader2 } from "lucide-react";

export function TokenGenerator() {
  const [tokenName, setTokenName] = useState("API Testing Token");
  const [token, setToken] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function generateToken() {
    try {
      setIsLoading(true);
      const response = await fetch("/api/tokens/jwt", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: tokenName,
        }),
      });

      if (!response.ok) {
        throw new Error("HTTP error! Status");
      }

      const data = await response.json();
      console.log("Token response:", data);

      if (data.success && data.data && data.data.token) {
        setToken(data.data.token);
        toast.success("Token generated successfully");
      } else {
        throw new Error("Invalid response format");
      }
    } catch (error) {
      console.error("Token generation error:", error);
      toast.error("Failed to generate token");
    } finally {
      setIsLoading(false);
    }
  }

  function copyToken() {
    if (token) {
      navigator.clipboard.writeText(token);
      toast.success("Token copied to clipboard");
    }
  }

  return (
    <Card className="mx-auto w-full max-w-2xl">
      <CardHeader>
        <CardTitle>API Token Generator</CardTitle>
        <CardDescription>
          Generate a token to use with Postman, Yaak, or other API testing tools
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {token && (
          <div className="border-border rounded-md border p-4">
            <p className="mb-2 text-sm font-medium text-amber-800">
              Your token (copy it now, it wont be shown again):
            </p>
            <div className="overflow-x-auto rounded border-emerald-500 p-3 font-mono text-xs">
              {token}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="mt-2 text-xs"
              onClick={copyToken}
            >
              <Copy className="mr-1 h-3 w-3" />
              Copy to Clipboard
            </Button>
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button onClick={generateToken} disabled={isLoading} className="w-full">
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            "Generate API Token"
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}

"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useFormik } from "formik";
import { LucideLoader2 } from "lucide-react";
import * as Yup from "yup";
import { Button } from "~/components/ui/button";

import { useState } from "react";
import { Input } from "~/components/ui/input";
import { toast } from "sonner";
import { authClient } from "~/lib/auth-client";
import { SignOutButton } from "~/components/auth/SignOutButton";
import { api } from "~/lib/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Textarea } from "~/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";

interface LangChainResult {
  id: string;
  query: string;
  answer: string;
  timestamp: string;
  type: string;
}

const timeAgentSchema = Yup.object().shape({
  query: Yup.string().required("Query is required"),
});

const countrySchema = Yup.object().shape({
  country: Yup.string().required("Country is required"),
});

const passwordSchema = Yup.object().shape({
  password: Yup.string().required("Password is required"),
});

const textAnalysisSchema = Yup.object().shape({
  text: Yup.string().required("Text is required"),
});

const LangChainPage = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<string>("country");

  // Country API
  const countryFormik = useFormik({
    initialValues: {
      country: "",
    },
    validationSchema: countrySchema,
    onSubmit: (values) => {
      countryMutation.mutate(values);
    },
  });

  const countryMutation = useMutation({
    mutationFn: async (values: { country: string }) => {
      // Add timeout to prevent UI hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

      try {
        const response = await api.post("/api/langchain/country", values, {
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        return response;
      } catch (error) {
        clearTimeout(timeoutId);
        throw error;
      }
    },
    onSuccess: (response) => {
      toast("Country information processed successfully");

      // Revalidate results immediately and after a short delay
      queryClient.invalidateQueries({ queryKey: ["langchain", "results"] });
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["langchain", "results"] });
      }, 1000);
    },
    onError: (error: Error) => {
      // If it's a timeout error, still try to fetch results since the API might have completed
      if (error.name === "AbortError" || error.message.includes("timeout")) {
        toast(
          "Request took too long, but data may have been processed. Check results below.",
        );
        setTimeout(() => {
          queryClient.invalidateQueries({ queryKey: ["langchain", "results"] });
        }, 1000);
      } else {
        toast(error.message || "Failed to process country information");
      }
    },
  });

  // Sequential Chain API
  const passwordFormik = useFormik({
    initialValues: {
      password: "",
    },
    validationSchema: passwordSchema,
    onSubmit: (values) => {
      passwordMutation.mutate(values);
    },
  });

  const passwordMutation = useMutation({
    mutationFn: async (values: { password: string }) => {
      return api.post("/api/langchain/sequential", values);
    },
    onSuccess: (response) => {
      toast("Password validation processed successfully");
      queryClient.invalidateQueries({ queryKey: ["langchain", "results"] });
    },
    onError: (error: Error) => {
      toast(error.message || "Failed to process password validation");
    },
  });

  // Parallel Chain API
  const textFormik = useFormik({
    initialValues: {
      text: "",
    },
    validationSchema: textAnalysisSchema,
    onSubmit: (values) => {
      textMutation.mutate(values);
    },
  });

  const textMutation = useMutation({
    mutationFn: async (values: { text: string }) => {
      return api.post("/api/langchain/parallel", values);
    },
    onSuccess: (response) => {
      toast("Text analysis processed successfully");
      queryClient.invalidateQueries({ queryKey: ["langchain", "results"] });
    },
    onError: (error: Error) => {
      toast(error.message || "Failed to process text analysis");
    },
  });

  // Get results
  const { data: results, isLoading: isLoadingResults } = useQuery<
    LangChainResult[]
  >({
    queryKey: ["langchain", "results"],
    queryFn: async () => {
      try {
        const response = await api.get<LangChainResult[]>(
          "/api/langchain/results",
        );
        return response.success ? response.data : [];
      } catch (error) {
        console.error(error);
        return [];
      }
    },
  });

  const { data: session } = authClient.useSession();

  return (
    <div className="container mx-auto max-w-4xl p-6">
      <div className="my-8 flex items-center gap-x-6">
        <div className="w-full items-center">
          <h1>Welcome {session?.user?.name}</h1>
        </div>
        <SignOutButton />
      </div>

      <div className="flex gap-4">
        <Card className="w-full">
          <CardHeader>
            <CardTitle>LangChain Integration</CardTitle>
            <CardDescription>
              Interact with different types of LangChain APIs
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="country">Country Info Agent</TabsTrigger>
                <TabsTrigger value="sequential">Pass strength</TabsTrigger>
                <TabsTrigger value="parallel">Text analyze</TabsTrigger>
              </TabsList>

              <TabsContent value="country">
                <form
                  onSubmit={countryFormik.handleSubmit}
                  className="space-y-4 pt-4"
                >
                  <div className="text-muted-foreground bg-muted/50 mb-4 rounded-md border p-3 text-sm">
                    <p>
                      This agent fetches data about the selected country in
                      parallel:
                    </p>
                    <ol className="mt-2 list-decimal space-y-1 pl-5">
                      <li>
                        Get country exact time using get_country_time tool
                      </li>
                      <li>
                        calls public api to fetch GDP, unemployment, CO2 of that
                        country
                      </li>
                      <li>
                        Read data from both tools and use llm to generate a
                        news-like message
                      </li>
                      <li>Stores the result in the database</li>
                    </ol>
                  </div>
                  <div className="space-y-2">
                    <Select
                      name="country"
                      onValueChange={(value: string) =>
                        countryFormik.setFieldValue("country", value)
                      }
                    >
                      <SelectTrigger
                        className={
                          countryFormik.errors.country ? "border-red-500" : ""
                        }
                      >
                        <SelectValue placeholder="Select a country" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="India">India</SelectItem>
                        <SelectItem value="United Kingdom">
                          United Kingdom (London)
                        </SelectItem>
                        <SelectItem value="United States">
                          United States
                        </SelectItem>
                        <SelectItem value="Canada">Canada</SelectItem>
                        <SelectItem value="Australia">Australia</SelectItem>
                        <SelectItem value="Japan">Japan</SelectItem>
                        <SelectItem value="Germany">Germany</SelectItem>
                        <SelectItem value="France">France</SelectItem>
                        <SelectItem value="Brazil">Brazil</SelectItem>
                        <SelectItem value="South Africa">
                          South Africa
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    {countryFormik.touched.country &&
                      countryFormik.errors.country && (
                        <p className="text-sm text-red-500">
                          {countryFormik.errors.country}
                        </p>
                      )}
                  </div>
                  <Button
                    disabled={countryMutation.isPending}
                    type="submit"
                    className="w-full"
                  >
                    {countryMutation.isPending ? (
                      <div className="flex items-center justify-center">
                        <LucideLoader2 className="mr-2 h-4 w-4 animate-spin" />
                        Fetching Country Info...
                      </div>
                    ) : (
                      "Get Country Information"
                    )}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="sequential">
                <form
                  onSubmit={passwordFormik.handleSubmit}
                  className="space-y-4 pt-4"
                >
                  <div className="text-muted-foreground bg-muted/50 mb-4 rounded-md border p-3 text-sm">
                    <p>This is a simple sequential chaining example</p>
                    <ol className="mt-2 list-decimal space-y-1 pl-5">
                      <li>It takes password from user</li>
                      <li>Invoke a llm to validate the password</li>
                      <li>If PASS it returns validation success</li>
                      <li>
                        If FAILS it invokes a feedback prompt and return
                        response
                      </li>
                    </ol>
                  </div>
                  <div className="space-y-2">
                    <Input
                      type="text"
                      id="password"
                      name="password"
                      placeholder="Enter a password to validate"
                      onChange={passwordFormik.handleChange}
                      value={passwordFormik.values.password}
                      className={
                        passwordFormik.errors.password ? "border-red-500" : ""
                      }
                    />
                    {passwordFormik.touched.password &&
                      passwordFormik.errors.password && (
                        <p className="text-sm text-red-500">
                          {passwordFormik.errors.password}
                        </p>
                      )}
                  </div>
                  <Button
                    disabled={passwordMutation.isPending}
                    type="submit"
                    className="w-full"
                  >
                    {passwordMutation.isPending ? (
                      <div className="flex items-center justify-center">
                        <LucideLoader2 className="mr-2 h-4 w-4 animate-spin" />
                        Validating Password...
                      </div>
                    ) : (
                      "Validate Password"
                    )}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="parallel">
                <form
                  onSubmit={textFormik.handleSubmit}
                  className="space-y-4 pt-4"
                >
                  <div className="text-muted-foreground bg-muted/50 mb-4 rounded-md border p-3 text-sm">
                    <p>This is a simple parallel chaining example</p>
                    <ol className="mt-2 list-decimal space-y-1 pl-5">
                      <li>It takes input from user</li>
                      <li>
                        It calls sentiment prompt and returns POSITIVE,
                        NEGATIVE, or NEUTRAL
                      </li>
                      <li>
                        It calls stylePrompt and returns FORMAL, CASUAL, or
                        TECHNICAL
                      </li>
                      <li>
                        Since both the prompts are independent, they run in
                        parallel saving time
                      </li>
                    </ol>
                  </div>
                  <div className="space-y-2">
                    <Textarea
                      id="text"
                      name="text"
                      placeholder="Enter text to analyze sentiment and style"
                      onChange={textFormik.handleChange}
                      value={textFormik.values.text}
                      className={textFormik.errors.text ? "border-red-500" : ""}
                    />
                    {textFormik.touched.text && textFormik.errors.text && (
                      <p className="text-sm text-red-500">
                        {textFormik.errors.text}
                      </p>
                    )}
                  </div>
                  <Button
                    disabled={textMutation.isPending}
                    type="submit"
                    className="w-full"
                  >
                    {textMutation.isPending ? (
                      <div className="flex items-center justify-center">
                        <LucideLoader2 className="mr-2 h-4 w-4 animate-spin" />
                        Analyzing Text...
                      </div>
                    ) : (
                      "Analyze Text"
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <Card className="scrollbar max-h-[calc(100vh-20vh)] w-[60%] overflow-y-auto">
          <CardHeader>
            <CardTitle>Recent LangChain Results</CardTitle>
            <CardDescription>
              History of your recent interactions
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingResults ? (
              <div className="flex justify-center py-4">
                <LucideLoader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <div className="space-y-4">
                {results && results.length > 0 ? (
                  results.map((result: LangChainResult) => (
                    <Card key={result.id} className="overflow-hidden">
                      <CardHeader className="bg-muted p-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm">
                            {result.type.charAt(0).toUpperCase() +
                              result.type.slice(1)}
                          </CardTitle>
                          <span className="text-muted-foreground text-xs">
                            {new Date(result.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <CardDescription className="mt-2 text-xs">
                          {result.query}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="p-3">
                        <p className="text-sm">{result.answer}</p>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <p className="text-muted-foreground text-center">
                    No results yet
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LangChainPage;

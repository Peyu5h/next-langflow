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

const passwordSchema = Yup.object().shape({
  password: Yup.string().required("Password is required"),
});

const textAnalysisSchema = Yup.object().shape({
  text: Yup.string().required("Text is required"),
});

const LangChainPage = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<string>("agent");

  // Agent API
  const agentFormik = useFormik({
    initialValues: {
      query: "",
    },
    validationSchema: timeAgentSchema,
    onSubmit: (values) => {
      agentMutation.mutate(values);
    },
  });

  const agentMutation = useMutation({
    mutationFn: async (values: { query: string }) => {
      return api.post("/api/langchain/agent", values);
    },
    onSuccess: (response) => {
      toast("Agent query processed successfully");
      queryClient.invalidateQueries({ queryKey: ["langchain", "results"] });
    },
    onError: (error: Error) => {
      toast(error.message || "Failed to process agent query");
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
                <TabsTrigger value="agent">Time Agent</TabsTrigger>
                <TabsTrigger value="sequential">
                  Password Validation
                </TabsTrigger>
                <TabsTrigger value="parallel">Text Analysis</TabsTrigger>
              </TabsList>

              <TabsContent value="agent">
                <form
                  onSubmit={agentFormik.handleSubmit}
                  className="space-y-4 pt-4"
                >
                  <div className="space-y-2">
                    <Input
                      type="text"
                      id="query"
                      name="query"
                      placeholder="Ask about time in London or India"
                      onChange={agentFormik.handleChange}
                      value={agentFormik.values.query}
                      className={
                        agentFormik.errors.query ? "border-red-500" : ""
                      }
                    />
                    {agentFormik.touched.query && agentFormik.errors.query && (
                      <p className="text-sm text-red-500">
                        {agentFormik.errors.query}
                      </p>
                    )}
                  </div>
                  <Button
                    disabled={agentMutation.isPending}
                    type="submit"
                    className="w-full"
                  >
                    {agentMutation.isPending ? (
                      <div className="flex items-center justify-center">
                        <LucideLoader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing Query...
                      </div>
                    ) : (
                      "Ask Time Agent"
                    )}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="sequential">
                <form
                  onSubmit={passwordFormik.handleSubmit}
                  className="space-y-4 pt-4"
                >
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

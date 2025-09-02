"use client";

import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Card, CardContent } from "~/components/ui/card";
import GoogleSheetsTab from "./tabs/GoogleSheetsTab";

export default function AgenticFlow() {
  const [activeTab, setActiveTab] = useState<string>("gsheets");

  return (
    <div className="container mx-auto overflow-y-hidden">
      <Card className="h-[calc)] border-none p-4 shadow-none">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="gsheets">Google Sheets</TabsTrigger>
          </TabsList>
          <TabsContent value="gsheets">
            <CardContent className="p-0 pt-4">
              <GoogleSheetsTab />
            </CardContent>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}

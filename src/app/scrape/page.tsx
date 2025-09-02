"use client";

import React, { useState } from "react";

interface Tab {
  id: string;
  url: string;
  title: string;
}

export default function ScrapePage() {
  const [activeTab, setActiveTab] = useState("1");
  const [tabs, setTabs] = useState<Tab[]>([
    { id: "1", url: "", title: "New Tab" },
  ]);
  const [urlInput, setUrlInput] = useState("");

  const addTab = () => {
    const newTab: Tab = {
      id: (tabs.length + 1).toString(),
      url: "",
      title: "New Tab",
    };
    setTabs([...tabs, newTab]);
    setActiveTab(newTab.id);
  };

  const closeTab = (id: string) => {
    const newTabs = tabs.filter((tab) => tab.id !== id);
    setTabs(newTabs);
    if (activeTab === id) {
      setActiveTab(newTabs[0]?.id || "1");
    }
  };

  const updateTabUrl = (url: string) => {
    setTabs(tabs.map((tab) => (tab.id === activeTab ? { ...tab, url } : tab)));
    // Here you would add actual scraping logic
  };

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-lg border">
      {/* Tab Bar */}
      <div className="flex items-center border-b bg-gray-100 p-1">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className={`mr-1 flex cursor-pointer items-center rounded-t-md px-3 py-1 ${
              activeTab === tab.id
                ? "border-t border-r border-l bg-white"
                : "bg-gray-200 hover:bg-gray-300"
            }`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="mr-2">{tab.title}</span>
            {tabs.length > 1 && (
              <button
                className="ml-2 text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  closeTab(tab.id);
                }}
              >
                ×
              </button>
            )}
          </div>
        ))}
        <button
          className="ml-1 rounded-full p-1 hover:bg-gray-200"
          onClick={addTab}
        >
          +
        </button>
      </div>

      {/* Browser Controls */}
      <div className="flex items-center border-b bg-white p-2">
        <div className="mr-2 flex space-x-1">
          <button className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-gray-200">
            ←
          </button>
          <button className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-gray-200">
            →
          </button>
          <button className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-gray-200">
            ↺
          </button>
        </div>
        <input
          type="text"
          className="flex-grow rounded-md border px-3 py-1 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          placeholder="Enter URL to scrape"
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === "Enter") {
              updateTabUrl(urlInput);
            }
          }}
        />
        <button
          className="ml-2 rounded-md bg-blue-500 px-4 py-1 text-white hover:bg-blue-600"
          onClick={() => updateTabUrl(urlInput)}
        >
          Scrape
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-grow overflow-auto bg-white p-4">
        <div className="flex h-full items-center justify-center rounded-lg border-2 border-dashed border-gray-300">
          <div className="p-4 text-center text-gray-500">
            {urlInput ? (
              <div>Scraping content from {urlInput}...</div>
            ) : (
              <div>Enter a URL to start scraping</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { DragEvent, useState, ChangeEvent } from "react";
import { Search } from "~/components/ui/search";
import {
  Calculator,
  FileDown,
  GitBranch,
  Globe,
  UserCircle,
  AlertTriangle,
} from "lucide-react";

type NodeType = {
  type: string;
  icon: React.ReactNode;
  label: string;
  description: string;
};

const NODE_TYPES: Record<string, NodeType[]> = {
  Input: [
    {
      type: "inputNode",
      icon: <UserCircle className="h-4 w-4" />,
      label: "User Form",
      description: "Collects user information like name and age",
    },
  ],
  Processing: [
    {
      type: "calculatorNode",
      icon: <Calculator className="h-4 w-4" />,
      label: "Calculator",
      description: "Perform basic arithmetic operations",
    },
  ],
  Conditions: [
    {
      type: "ageConditionNode",
      icon: <AlertTriangle className="h-4 w-4" />,
      label: "Age Condition",
      description: "Filter users based on age criteria",
    },
    {
      type: "conditionNode",
      icon: <GitBranch className="h-4 w-4" />,
      label: "Condition",
      description: "Create conditional logic with if/else paths",
    },
  ],
  Integration: [
    {
      type: "apiNode",
      icon: <Globe className="h-4 w-4" />,
      label: "API Request",
      description: "Make API calls to external services",
    },
  ],
  Output: [
    {
      type: "outputNode",
      icon: <FileDown className="h-4 w-4" />,
      label: "Output",
      description: "Display final results of the workflow",
    },
  ],
};

type NodeSidebarProps = {
  onAddNode: (nodeType: string) => void;
};

export default function NodeSidebar({ onAddNode }: NodeSidebarProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("Input");

  const handleDragStart = (
    event: DragEvent<HTMLDivElement>,
    nodeType: string,
  ) => {
    event.dataTransfer.setData("application/reactflow", nodeType);
    event.dataTransfer.effectAllowed = "move";
  };

  const handleAddNode = (nodeType: string) => {
    onAddNode(nodeType);
  };

  const toggleCategory = (category: string) => {
    setActiveCategory(activeCategory === category ? "Input" : category);
  };

  const filterNodeTypes = (category: string) => {
    if (!searchTerm) return NODE_TYPES[category];

    return NODE_TYPES[category].filter(
      (node) =>
        node.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
        node.description.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  };

  return (
    <div className="bg-background flex h-full w-64 flex-col border-r">
      <div className="p-4">
        <h3 className="mb-2 text-lg font-semibold">Workflow Nodes</h3>
        <Search
          placeholder="Search nodes..."
          value={searchTerm}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            setSearchTerm(e.target.value)
          }
          containerClassName="mb-4"
        />
      </div>

      <div className="scrollbar flex-1 overflow-auto px-2">
        {Object.keys(NODE_TYPES).map((category) => {
          const filteredNodes = filterNodeTypes(category);
          if (filteredNodes.length === 0) return null;

          return (
            <div key={category} className="mb-4">
              <button
                className="hover:bg-accent flex w-full items-center justify-between rounded-md p-2 text-sm font-medium"
                onClick={() => toggleCategory(category)}
              >
                <span>{category}</span>
                <span>{activeCategory === category ? "−" : "+"}</span>
              </button>

              {activeCategory === category && (
                <div className="mt-2 space-y-2 pl-2">
                  {filteredNodes.map((node) => (
                    <div
                      key={node.type}
                      className="hover:bg-muted flex cursor-grab items-center rounded-md p-2 text-sm"
                      draggable
                      onDragStart={(e) => handleDragStart(e, node.type)}
                      onClick={() => handleAddNode(node.type)}
                    >
                      <div className="bg-background mr-2 flex h-8 w-8 items-center justify-center rounded-md border">
                        {node.icon}
                      </div>
                      <div>
                        <div className="font-medium">{node.label}</div>
                        <div className="text-muted-foreground text-xs">
                          {node.description}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import { Handle, Position, useReactFlow } from "@xyflow/react";
import {
  MonitorIcon,
  Users,
  Calculator,
  Database,
  Globe,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";
import { cn } from "~/lib/utils";

type ConnectedNodeData = {
  id?: string;
  type?: string;
  data?: Record<string, any>;
  sourceHandle?: string | null;
  connections?: string[];
};

type OutputNodeProps = {
  data: {
    label?: string;
    description?: string;
    connectedNodes?: string[];
  };
  selected?: boolean;
  id: string;
};

export default function OutputNode({ data, selected, id }: OutputNodeProps) {
  const reactFlowInstance = useReactFlow();
  const { getNode, getEdges } = reactFlowInstance;
  const [connectedNodes, setConnectedNodes] = useState<ConnectedNodeData[]>([]);
  const [flowPaths, setFlowPaths] = useState<ConnectedNodeData[][]>([]);

  const buildNodeConnectionMap = useCallback(() => {
    const connectionMap: Record<string, string[]> = {};
    const allEdges = getEdges();

    // source -> target connections
    allEdges.forEach((edge) => {
      if (!connectionMap[edge.source]) {
        connectionMap[edge.source] = [];
      }
      connectionMap[edge.source].push(edge.target);
    });

    return connectionMap;
  }, [getEdges]);

  const findAllPaths = useCallback(() => {
    const connectionMap = buildNodeConnectionMap();
    const allPaths: ConnectedNodeData[][] = [];

    // finding nodes that have no incoming connections
    const allNodes = Object.values(reactFlowInstance.getNodes());
    const targetNodeIds = new Set(getEdges().map((edge) => edge.target));
    const sourceNodes = allNodes.filter((node) => !targetNodeIds.has(node.id));

    // for each source node, find all paths to the output node
    const findPaths = (currentNode: string, path: ConnectedNodeData[] = []) => {
      const node = getNode(currentNode);
      if (!node) return;

      const nodeData: ConnectedNodeData = {
        id: node.id,
        type: node.type,
        data: node.data,
        connections: connectionMap[node.id] || [],
      };

      const newPath = [...path, nodeData];

      if (connectionMap[node.id] && connectionMap[node.id].includes(id)) {
        allPaths.push(newPath);
        return;
      }

      if (connectionMap[node.id]) {
        connectionMap[node.id].forEach((targetId) => {
          findPaths(targetId, newPath);
        });
      }
    };

    sourceNodes.forEach((node) => {
      findPaths(node.id);
    });

    return allPaths;
  }, [buildNodeConnectionMap, getEdges, getNode, id, reactFlowInstance]);

  const getConnectedNodeData = useCallback(() => {
    const incomingEdges = getEdges().filter((edge) => edge.target === id);
    const sourceNodes = incomingEdges
      .map((edge) => {
        const sourceNode = getNode(edge.source);
        return {
          id: sourceNode?.id,
          type: sourceNode?.type,
          data: sourceNode?.data,
          sourceHandle: edge.sourceHandle,
        };
      })
      .filter(Boolean);

    return sourceNodes;
  }, [getEdges, getNode, id]);

  useEffect(() => {
    const updatedNodes = getConnectedNodeData();
    setConnectedNodes(updatedNodes);

    const paths = findAllPaths();
    setFlowPaths(paths);

    const updateNodes = () => {
      const updatedNodes = getConnectedNodeData();
      setConnectedNodes(updatedNodes);

      const paths = findAllPaths();
      setFlowPaths(paths);
    };

    const intervalId = setInterval(updateNodes, 500);

    return () => {
      clearInterval(intervalId);
    };
  }, [getConnectedNodeData, findAllPaths]);

  const getNodeIcon = (nodeType?: string) => {
    switch (nodeType) {
      case "inputNode":
        return <Users className="h-3 w-3" />;
      case "calculatorNode":
        return <Calculator className="h-3 w-3" />;
      case "dataProcessNode":
        return <Database className="h-3 w-3" />;
      case "apiNode":
        return <Globe className="h-3 w-3" />;
      case "ageConditionNode":
        return <AlertTriangle className="h-3 w-3" />;
      default:
        return null;
    }
  };

  const generateNodeSummary = (node: ConnectedNodeData) => {
    if (!node.type || !node.data) return "";

    switch (node.type) {
      case "inputNode":
        return `User: ${node.data.name || "Anonymous"} (${node.data.age || "?"} years)${node.data.isStudent ? ", Student" : ""}`;
      case "ageConditionNode":
        return `If age ${node.data.operator || "?"} ${node.data.compareValue || "?"}`;
      case "calculatorNode":
        return `Calculated value: ${node.data.result || "?"}`;
      default:
        return node.data.label || node.type;
    }
  };

  const evaluateAgeCondition = (
    userData: any,
    conditionNode: ConnectedNodeData,
  ) => {
    if (!userData || !conditionNode.data) return false;

    const userAge = userData.age ? parseInt(userData.age) : 0;
    const compareValue = conditionNode.data.compareValue
      ? parseInt(conditionNode.data.compareValue)
      : 0;
    const operator = conditionNode.data.operator || ">=";

    switch (operator) {
      case ">":
        return userAge > compareValue;
      case ">=":
        return userAge >= compareValue;
      case "<":
        return userAge < compareValue;
      case "<=":
        return userAge <= compareValue;
      case "==":
        return userAge === compareValue;
      default:
        return false;
    }
  };

  const generateFlowSummary = (path: ConnectedNodeData[]) => {
    const inputNode = path.find((node) => node.type === "inputNode");
    const ageConditionNode = path.find(
      (node) => node.type === "ageConditionNode",
    );
    const calculatorNode = path.find((node) => node.type === "calculatorNode");

    if (!inputNode) return "Invalid flow: No user input";

    let summary = `User ${inputNode.data?.name || "Anonymous"} (${inputNode.data?.age || "?"} years)`;

    if (inputNode.data?.isStudent) {
      summary += " (Student)";
    }

    if (ageConditionNode) {
      const conditionResult = evaluateAgeCondition(
        inputNode.data,
        ageConditionNode,
      );
      summary += ` is ${conditionResult ? "" : "NOT "}${ageConditionNode.data?.operator || "?"} ${ageConditionNode.data?.compareValue || "?"} years`;
    }

    if (calculatorNode) {
      let input1 = calculatorNode.data?.input1;

      if (path.indexOf(calculatorNode) > path.indexOf(inputNode)) {
        input1 = inputNode.data?.age || calculatorNode.data?.input1;
      }

      summary += ` → Calculated: ${input1} ${calculatorNode.data?.operator} ${calculatorNode.data?.input2} = ${calculatorNode.data?.result}`;
    }

    return summary;
  };

  return (
    <div
      className={cn(
        "w-64 rounded-md border border-orange-500 bg-orange-50 p-3 shadow-md dark:bg-orange-950",
        selected && "ring-2 ring-orange-500",
      )}
    >
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-200 dark:bg-orange-800">
          <MonitorIcon className="h-4 w-4 text-orange-700 dark:text-orange-300" />
        </div>
        <div>
          <p className="font-medium">{data.label || "Output"}</p>
          {data.description && (
            <p className="text-muted-foreground text-xs">{data.description}</p>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {flowPaths.length === 0 ? (
          <div className="text-muted-foreground rounded bg-orange-100 p-2 text-center text-sm dark:bg-orange-900">
            No connected workflows
          </div>
        ) : (
          <div className="space-y-3">
            {flowPaths.map((path, pathIndex) => (
              <div
                key={pathIndex}
                className="rounded bg-orange-100 p-2 dark:bg-orange-900"
              >
                <div className="text-sm font-medium">
                  {generateFlowSummary(path)}
                </div>

                <div className="mt-2">
                  <div className="flex flex-col items-start gap-1">
                    {path.map((node, nodeIndex) => (
                      <div key={node.id} className="flex items-center gap-1">
                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-orange-200 dark:bg-orange-800">
                          {getNodeIcon(node.type)}
                        </div>
                        <span className="text-xs">
                          {generateNodeSummary(node)}
                        </span>
                        {nodeIndex < path.length - 1 && (
                          <ArrowRight className="h-3 w-3 text-orange-600" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Handle
        type="target"
        position={Position.Top}
        className="!h-3 !w-3 !bg-orange-500"
      />
    </div>
  );
}

"use client";

import { useCallback, useRef, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  Panel,
  ReactFlowProvider,
  addEdge,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  useReactFlow,
  type Connection,
  type Edge,
  type Node,
  type OnConnect,
  type ReactFlowInstance,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { nodeTypes } from "./custom-nodes";
import NodeSidebar from "./NodeSidebar";
import { cn } from "~/lib/utils";
import { toast } from "sonner";
import NodeEditor from "./NodeEditor";
import { Button } from "~/components/ui/button";

import { ZapIcon } from "lucide-react";

let id = 1;
const getId = () => `node_${id++}`;

const initialNodes: Node[] = [];
const initialEdges: Edge[] = [];

export default function WorkflowCanvas() {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [reactFlowInstance, setReactFlowInstance] =
    useState<ReactFlowInstance | null>(null);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [workflowResults, setWorkflowResults] = useState<any>(null);

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) => {
        const newEdges = addEdge(connection, eds);
        return newEdges;
      });
    },
    [setEdges],
  );

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  }, []);

  const updateNodeData = useCallback(
    (id: string, data: Record<string, any>) => {
      setNodes((nodes) =>
        nodes.map((node) => {
          if (node.id === id) {
            return {
              ...node,
              data: {
                ...node.data,
                ...data,
              },
            };
          }
          return node;
        }),
      );
      toast.success("Node updated");
    },
    [setNodes],
  );

  const onDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();

      const reactFlowBounds = reactFlowWrapper.current?.getBoundingClientRect();
      const nodeTypeStr = event.dataTransfer.getData("application/reactflow");

      if (!nodeTypeStr || !reactFlowBounds || !reactFlowInstance) {
        return;
      }

      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      });

      const newNode: Node = {
        id: getId(),
        type: nodeTypeStr,
        position,
        data: {
          label: getNodeLabel(nodeTypeStr),
          description: getNodeDescription(nodeTypeStr),
        },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [reactFlowInstance, setNodes],
  );

  const getNodeLabel = (nodeType: string) => {
    switch (nodeType) {
      case "inputNode":
        return "User Information";
      case "calculatorNode":
        return "Calculator";
      case "ageConditionNode":
        return "Age Condition";
      case "conditionNode":
        return "Condition";
      case "apiNode":
        return "API Request";
      case "outputNode":
        return "Output";
      default:
        return "Node";
    }
  };

  const getNodeDescription = (nodeType: string) => {
    switch (nodeType) {
      case "inputNode":
        return "Collects user information";
      case "calculatorNode":
        return "Perform calculations";
      case "ageConditionNode":
        return "Filter users by age";
      case "conditionNode":
        return "Create branching logic";
      case "apiNode":
        return "Make API calls";
      case "outputNode":
        return "Display final results";
      default:
        return "";
    }
  };

  const processWorkflow = () => {
    const processedData: Record<string, any> = {};
    const nodeMap: Record<string, any> = {};
    const outputNodes: any[] = [];

    nodes.forEach((node) => {
      nodeMap[node.id] = {
        type: node.type,
        data: { ...node.data },
        results: null,
        processed: false,
      };

      if (node.type === "outputNode") {
        outputNodes.push(node.id);
      }
    });

    const nodeConnections: Record<string, string[]> = {};
    edges.forEach((edge) => {
      if (!nodeConnections[edge.target]) {
        nodeConnections[edge.target] = [];
      }
      nodeConnections[edge.target].push(edge.source);
    });

    const processNode = (nodeId: string): any => {
      const node = nodeMap[nodeId];

      if (node.processed) return node.results;

      const sources = nodeConnections[nodeId] || [];
      const sourceResults = sources.map((sourceId) => processNode(sourceId));

      if (node.type === "inputNode") {
        node.results = {
          name: node.data.name || "Unknown",
          age: node.data.age ? parseInt(node.data.age) : 0,
          isStudent: node.data.isStudent || false,
        };
      } else if (node.type === "ageConditionNode") {
        if (sourceResults.length > 0) {
          const userData = sourceResults[0];
          const userAge = userData?.age || 0;
          const compareValue = node.data.compareValue
            ? parseInt(node.data.compareValue)
            : 0;
          const operator = node.data.operator || ">=";

          let result = false;
          switch (operator) {
            case ">":
              result = userAge > compareValue;
              break;
            case ">=":
              result = userAge >= compareValue;
              break;
            case "<":
              result = userAge < compareValue;
              break;
            case "<=":
              result = userAge <= compareValue;
              break;
            case "==":
              result = userAge === compareValue;
              break;
          }

          node.results = {
            ...userData,
            conditionResult: result,
            conditionDetails: `Age ${userAge} ${operator} ${compareValue} = ${result}`,
          };
        }
      } else if (node.type === "calculatorNode") {
        let input1 = node.data.input1 ? parseFloat(node.data.input1) : 0;
        const input2 = node.data.input2 ? parseFloat(node.data.input2) : 0;

        if (sourceResults.length > 0 && sourceResults[0]?.age) {
          input1 = sourceResults[0].age;
        }

        let result;
        switch (node.data.operator) {
          case "+":
            result = input1 + input2;
            break;
          case "-":
            result = input1 - input2;
            break;
          case "*":
            result = input1 * input2;
            break;
          case "/":
            result = input2 !== 0 ? input1 / input2 : "Error: Division by zero";
            break;
          default:
            result = input1 + input2;
        }

        node.results = {
          ...(sourceResults.length > 0 ? sourceResults[0] : {}),
          calculation: `${input1} ${node.data.operator} ${input2} = ${result}`,
          calculationResult: result,
        };
      } else if (node.type === "outputNode") {
        if (sourceResults.length > 0) {
          node.results = sourceResults.reduce(
            (acc, curr) => ({ ...acc, ...curr }),
            {},
          );
        } else {
          node.results = { message: "No input connected" };
        }
      }

      node.processed = true;
      return node.results;
    };

    outputNodes.forEach((nodeId) => {
      processedData[nodeId] = processNode(nodeId);
    });

    return {
      nodes: nodeMap,
      processedData,
    };
  };

  const runWorkflow = () => {
    const hasInput = nodes.some((node) => node.type === "inputNode");
    const hasOutput = nodes.some((node) => node.type === "outputNode");

    if (!hasInput || !hasOutput) {
      toast.error("Workflow must have at least one input and one output node");
      return;
    }

    const nodeIds = new Set(nodes.map((node) => node.id));
    const connectedNodeIds = new Set();

    edges.forEach((edge) => {
      connectedNodeIds.add(edge.source);
      connectedNodeIds.add(edge.target);
    });

    const unconnectedNodes = [...nodeIds].filter(
      (id) => !connectedNodeIds.has(id),
    );

    if (unconnectedNodes.length > 0) {
      toast.error("Some nodes are not connected to the workflow");
      return;
    }

    setIsExecuting(true);

    const results = processWorkflow();
    console.log(results);
    alert(JSON.stringify(results));
    setWorkflowResults(results);

    setTimeout(() => {
      setIsExecuting(false);
      setShowResults(true);
    }, 1000);
  };

  return (
    <div className="flex h-[calc(100vh-120px)] flex-col rounded-lg border">
      <div className="flex flex-1 overflow-hidden">
        <NodeSidebar
          onAddNode={(nodeType) => {
            const newNode = {
              id: getId(),
              type: nodeType,
              position: { x: 100, y: 100 },
              data: {
                label: getNodeLabel(nodeType),
                description: getNodeDescription(nodeType),
              },
            };
            setNodes((nodes) => nodes.concat(newNode));
          }}
        />
        <ReactFlowProvider>
          <div className="flex flex-1 flex-col">
            <Panel position="top-right" className="z-10">
              <div className="bg-background flex items-center gap-2 rounded-md p-2 shadow-sm">
                <Button
                  variant="default"
                  size="sm"
                  onClick={runWorkflow}
                  className="gap-1"
                  disabled={isExecuting}
                >
                  <ZapIcon className="h-4 w-4" />
                  {isExecuting ? "Running..." : "Run Workflow"}
                </Button>
              </div>
            </Panel>
            <div className="flex flex-1">
              <div className="flex-1" ref={reactFlowWrapper}>
                <ReactFlow
                  nodes={nodes}
                  edges={edges}
                  nodeTypes={nodeTypes}
                  onNodesChange={onNodesChange}
                  onEdgesChange={onEdgesChange}
                  onConnect={onConnect}
                  onInit={setReactFlowInstance}
                  onDrop={onDrop}
                  onDragOver={onDragOver}
                  onNodeClick={onNodeClick}
                  fitView
                  defaultEdgeOptions={{ animated: true }}
                  proOptions={{ hideAttribution: true }}
                  deleteKeyCode="Delete"
                  multiSelectionKeyCode="Control"
                  snapToGrid={true}
                  snapGrid={[15, 15]}
                >
                  <Background
                    variant={BackgroundVariant.Dots}
                    gap={12}
                    size={1}
                  />
                  <Controls
                    position="bottom-right"
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      backgroundColor: "var(--background)",
                      border: "1px solid var(--border)",
                      color: "#111111",
                      borderRadius: "0.5rem",
                      padding: "0.5rem",
                      boxShadow: "var(--shadow-sm)",
                    }}
                    showInteractive={false}
                  />
                  <Panel position="top-center">
                    <h3 className="bg-background rounded-md p-2 font-medium shadow-md">
                      Workflow Designer
                    </h3>
                  </Panel>
                </ReactFlow>
              </div>
              {selectedNode && (
                <NodeEditor
                  selectedNode={selectedNode}
                  onUpdateNode={updateNodeData}
                  onClose={() => setSelectedNode(null)}
                />
              )}
            </div>
          </div>
        </ReactFlowProvider>
      </div>
    </div>
  );
}

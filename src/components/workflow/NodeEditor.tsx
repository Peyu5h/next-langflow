"use client";

import { useCallback, useEffect, useState } from "react";
import { Node } from "@xyflow/react";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { X } from "lucide-react";
import { Switch } from "~/components/ui/switch";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";

type NodeEditorProps = {
  selectedNode: Node | null;
  onUpdateNode: (id: string, data: any) => void;
  onClose: () => void;
};

const OPERATORS = [
  { value: "==", label: "Equal to" },
  { value: "!=", label: "Not equal to" },
  { value: ">", label: "Greater than" },
  { value: "<", label: "Less than" },
  { value: ">=", label: "Greater than or equal to" },
  { value: "<=", label: "Less than or equal to" },
  { value: "contains", label: "Contains" },
];

const CALC_OPERATORS = [
  { value: "+", label: "Add" },
  { value: "-", label: "Subtract" },
  { value: "*", label: "Multiply" },
  { value: "/", label: "Divide" },
];

export default function NodeEditor({
  selectedNode,
  onUpdateNode,
  onClose,
}: NodeEditorProps) {
  const [nodeData, setNodeData] = useState<Record<string, any>>({});

  useEffect(() => {
    if (selectedNode?.data) {
      setNodeData({ ...selectedNode.data });
    }
  }, [selectedNode]);

  const handleInputChange = useCallback((key: string, value: string) => {
    setNodeData((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleNumberChange = useCallback((key: string, value: string) => {
    const numValue = value === "" ? 0 : parseFloat(value);
    if (!isNaN(numValue)) {
      setNodeData((prev) => ({ ...prev, [key]: numValue }));
    }
  }, []);

  const handleBooleanChange = useCallback((key: string, value: boolean) => {
    setNodeData((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleSelectChange = useCallback((key: string, value: string) => {
    setNodeData((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleSave = useCallback(() => {
    if (selectedNode) {
      onUpdateNode(selectedNode.id, nodeData);
    }
  }, [selectedNode, nodeData, onUpdateNode]);

  if (!selectedNode) {
    return null;
  }

  const renderField = (field: { key: string; label: string; type: string }) => {
    const value = nodeData[field.key];

    switch (field.type) {
      case "text":
        return (
          <Input
            value={value || ""}
            onChange={(e) => handleInputChange(field.key, e.target.value)}
            placeholder={`Enter ${field.label.toLowerCase()}`}
          />
        );
      case "number":
        return (
          <Input
            type="number"
            value={value || ""}
            onChange={(e) => handleNumberChange(field.key, e.target.value)}
            placeholder={`Enter ${field.label.toLowerCase()}`}
          />
        );
      case "boolean":
        return (
          <div className="flex items-center space-x-2">
            <Switch
              checked={!!value}
              onCheckedChange={(checked) =>
                handleBooleanChange(field.key, checked)
              }
              id={`${field.key}-${selectedNode.id}`}
            />
            <Label htmlFor={`${field.key}-${selectedNode.id}`}>
              {value ? "Yes" : "No"}
            </Label>
          </div>
        );
      case "calc-operator":
        return (
          <Select
            value={value || "+"}
            onValueChange={(val) => handleSelectChange(field.key, val)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select operator" />
            </SelectTrigger>
            <SelectContent>
              {CALC_OPERATORS.map((op) => (
                <SelectItem key={op.value} value={op.value}>
                  {op.value} ({op.label})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      case "condition-operator":
        return (
          <Select
            value={value || "=="}
            onValueChange={(val) => handleSelectChange(field.key, val)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select operator" />
            </SelectTrigger>
            <SelectContent>
              {OPERATORS.map((op) => (
                <SelectItem key={op.value} value={op.value}>
                  {op.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      default:
        return (
          <Input
            value={value || ""}
            onChange={(e) => handleInputChange(field.key, e.target.value)}
            placeholder={`Enter ${field.label.toLowerCase()}`}
          />
        );
    }
  };

  const getFieldsForNodeType = () => {
    const nodeType = selectedNode.type;
    const commonFields = [
      { key: "label", label: "Label", type: "text" },
      { key: "description", label: "Description", type: "text" },
    ];

    const specificFields: Record<
      string,
      { key: string; label: string; type: string }[]
    > = {
      inputNode: [
        { key: "name", label: "Name", type: "text" },
        { key: "email", label: "Email", type: "text" },
        { key: "isSubscribed", label: "Subscribed", type: "boolean" },
      ],
      apiNode: [{ key: "endpoint", label: "API Endpoint", type: "text" }],
      conditionNode: [
        { key: "condition", label: "Value", type: "text" },
        { key: "operator", label: "Operator", type: "condition-operator" },
        { key: "compareValue", label: "Compare With", type: "text" },
      ],
      outputNode: [{ key: "output", label: "Output", type: "text" }],
      dataProcessNode: [{ key: "process", label: "Process", type: "text" }],
      calculatorNode: [
        { key: "input1", label: "Input 1", type: "number" },
        { key: "input2", label: "Input 2", type: "number" },
        { key: "operator", label: "Operator", type: "calc-operator" },
      ],
    };

    return [...commonFields, ...(specificFields[nodeType as string] || [])];
  };

  return (
    <div className="bg-background flex w-64 flex-col border-l p-4">
      <div className="mb-4 flex items-center justify-between">
        <h4 className="font-medium">Edit Node</h4>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="bg-muted mb-2 rounded-md p-2 text-xs">
        <p>ID: {selectedNode.id}</p>
        <p>Type: {selectedNode.type}</p>
      </div>

      <div className="space-y-4">
        {getFieldsForNodeType().map((field) => (
          <div key={field.key} className="space-y-2">
            <label className="text-sm font-medium">{field.label}</label>
            {renderField(field)}
          </div>
        ))}
      </div>

      <div className="mt-4 flex w-full">
        <Button className="w-full" onClick={handleSave}>
          Update Node
        </Button>
      </div>
    </div>
  );
}

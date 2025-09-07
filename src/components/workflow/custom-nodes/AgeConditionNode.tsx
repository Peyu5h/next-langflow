"use client";

import { useState, useEffect } from "react";
import { Handle, Position, useUpdateNodeInternals } from "@xyflow/react";
import { GitBranch } from "lucide-react";
import { cn } from "~/lib/utils";
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";

type AgeConditionNodeProps = {
  data: {
    label?: string;
    description?: string;
    operator?: string;
    compareValue?: string;
    result?: boolean;
  };
  selected?: boolean;
  id: string;
};

const operators = [
  { value: ">", label: "Greater than" },
  { value: ">=", label: "Greater than or equal to" },
  { value: "<", label: "Less than" },
  { value: "<=", label: "Less than or equal to" },
  { value: "==", label: "Equal to" },
];

export default function AgeConditionNode({
  data,
  selected,
  id,
}: AgeConditionNodeProps) {
  const [operator, setOperator] = useState<string>(data.operator || ">=");
  const [compareValue, setCompareValue] = useState<string>(
    data.compareValue?.toString() || "18",
  );
  const updateNodeInternals = useUpdateNodeInternals();

  useEffect(() => {
    updateNodeInternals(id);
    data.operator = operator;
    data.compareValue = compareValue;
  }, [operator, compareValue, id, data, updateNodeInternals]);

  useEffect(() => {
    if (data.operator) setOperator(data.operator);
    if (data.compareValue) setCompareValue(data.compareValue.toString());
  }, [data.operator, data.compareValue]);

  return (
    <div
      className={cn(
        "rounded-md border border-purple-500 bg-purple-50 p-3 shadow-md dark:bg-purple-950",
        selected && "ring-2 ring-purple-500",
      )}
    >
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-200 dark:bg-purple-800">
          <GitBranch className="h-4 w-4 text-purple-700 dark:text-purple-300" />
        </div>
        <div>
          <p className="font-medium">{data.label || "Age Condition"}</p>
          {data.description && (
            <p className="text-muted-foreground text-xs">{data.description}</p>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <label className="text-muted-foreground mb-1 block text-xs font-medium">
            Condition
          </label>
          <Select value={operator} onValueChange={setOperator}>
            <SelectTrigger className="h-8">
              <SelectValue placeholder="Select operator" />
            </SelectTrigger>
            <SelectContent>
              {operators.map((op) => (
                <SelectItem key={op.value} value={op.value}>
                  {op.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-muted-foreground mb-1 block text-xs font-medium">
            Age Value
          </label>
          <Input
            type="number"
            value={compareValue}
            onChange={(e) => setCompareValue(e.target.value)}
            className="h-8 text-sm"
            min={0}
            max={120}
          />
        </div>
      </div>

      <Handle
        type="target"
        position={Position.Top}
        className="!h-3 !w-3 !bg-purple-500"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="!h-3 !w-3 !bg-purple-500"
      />
    </div>
  );
}

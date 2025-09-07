"use client";

import { useState, useEffect } from "react";
import { Handle, Position } from "@xyflow/react";
import { FilterIcon } from "lucide-react";
import { cn } from "~/lib/utils";
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";

type ConditionNodeProps = {
  data: {
    label?: string;
    description?: string;
    condition?: string;
    compareValue?: string;
    operator?: string;
    result?: boolean;
  };
  selected?: boolean;
  id: string;
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

export default function ConditionNode({
  data,
  selected,
  id,
}: ConditionNodeProps) {
  const [condition, setCondition] = useState<string>(data.condition || "");
  const [compareValue, setCompareValue] = useState<string>(
    data.compareValue || "",
  );
  const [operator, setOperator] = useState<string>(data.operator || "==");
  const [result, setResult] = useState<boolean | undefined>(data.result);

  useEffect(() => {
    data.condition = condition;
    data.compareValue = compareValue;
    data.operator = operator;

    if (condition && compareValue && operator) {
      let expression = "";

      if (operator === "contains") {
        expression = `'${condition}'.includes('${compareValue}')`;
      } else {
        expression = `'${condition}' ${operator} '${compareValue}'`;
      }

      try {
        const evaluationResult = eval(expression);
        setResult(!!evaluationResult);
        data.result = !!evaluationResult;
      } catch (e) {
        setResult(undefined);
        data.result = false;
      }
    }
  }, [condition, compareValue, operator, data]);

  useEffect(() => {
    if (data.condition !== undefined) setCondition(data.condition);
    if (data.compareValue !== undefined) setCompareValue(data.compareValue);
    if (data.operator !== undefined) setOperator(data.operator);
    if (data.result !== undefined) setResult(data.result);
  }, [data.condition, data.compareValue, data.operator, data.result]);

  return (
    <div
      className={cn(
        "w-64 rounded-md border border-purple-500 bg-purple-50 p-3 shadow-md dark:bg-purple-950",
        selected && "ring-2 ring-purple-500",
      )}
    >
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-200 dark:bg-purple-800">
          <FilterIcon className="h-4 w-4 text-purple-700 dark:text-purple-300" />
        </div>
        <div>
          <p className="font-medium">{data.label || "Condition"}</p>
          {data.description && (
            <p className="text-muted-foreground text-xs">{data.description}</p>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <label className="text-muted-foreground mb-1 block text-xs font-medium">
            Value
          </label>
          <Input
            value={condition}
            onChange={(e) => setCondition(e.target.value)}
            placeholder="Enter value to check"
            className="h-8 text-sm"
          />
        </div>

        <div>
          <label className="text-muted-foreground mb-1 block text-xs font-medium">
            Operator
          </label>
          <Select value={operator} onValueChange={setOperator}>
            <SelectTrigger className="h-8">
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
        </div>

        <div>
          <label className="text-muted-foreground mb-1 block text-xs font-medium">
            Compare With
          </label>
          <Input
            value={compareValue}
            onChange={(e) => setCompareValue(e.target.value)}
            placeholder="Value to compare with"
            className="h-8 text-sm"
          />
        </div>

        {result !== undefined && (
          <div className="mt-2 rounded bg-purple-100 p-2 text-center dark:bg-purple-900">
            <span className="text-xs font-medium">
              Result:{" "}
              {result ? (
                <span className="text-green-600 dark:text-green-400">True</span>
              ) : (
                <span className="text-red-600 dark:text-red-400">False</span>
              )}
            </span>
          </div>
        )}
      </div>

      <Handle
        type="target"
        position={Position.Top}
        className="!h-3 !w-3 !bg-purple-500"
      />
      <Handle
        id="true"
        type="source"
        position={Position.Bottom}
        className="!h-3 !w-3 !bg-green-500"
      />
      <Handle
        id="false"
        type="source"
        position={Position.Right}
        className="!h-3 !w-3 !bg-red-500"
      />
    </div>
  );
}

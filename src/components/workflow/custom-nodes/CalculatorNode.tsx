"use client";

import { useState, useEffect } from "react";
import { Handle, Position, useUpdateNodeInternals } from "@xyflow/react";
import { Calculator } from "lucide-react";
import { cn } from "~/lib/utils";
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";

type CalculatorNodeProps = {
  data: {
    label?: string;
    description?: string;
    input1?: number;
    input2?: number;
    operator?: string;
    result?: number;
  };
  selected?: boolean;
  id: string;
};

const operators = [
  { value: "+", label: "Add" },
  { value: "-", label: "Subtract" },
  { value: "*", label: "Multiply" },
  { value: "/", label: "Divide" },
];

export default function CalculatorNode({
  data,
  selected,
  id,
}: CalculatorNodeProps) {
  const [input1, setInput1] = useState<string>(data.input1?.toString() || "0");
  const [input2, setInput2] = useState<string>(data.input2?.toString() || "0");
  const [operator, setOperator] = useState<string>(data.operator || "+");
  const [result, setResult] = useState<number | null>(data.result || null);
  const updateNodeInternals = useUpdateNodeInternals();

  useEffect(() => {
    calculateResult();
    updateNodeInternals(id);
  }, [input1, input2, operator, id]);

  useEffect(() => {
    if (data.input1 !== undefined) setInput1(data.input1.toString());
    if (data.input2 !== undefined) setInput2(data.input2.toString());
    if (data.operator) setOperator(data.operator);
    if (data.result !== undefined) setResult(data.result);
  }, [data.input1, data.input2, data.operator, data.result]);

  const calculateResult = () => {
    const num1 = parseFloat(input1);
    const num2 = parseFloat(input2);

    if (isNaN(num1) || isNaN(num2)) {
      setResult(null);
      return;
    }

    let calculatedResult: number;

    switch (operator) {
      case "+":
        calculatedResult = num1 + num2;
        break;
      case "-":
        calculatedResult = num1 - num2;
        break;
      case "*":
        calculatedResult = num1 * num2;
        break;
      case "/":
        calculatedResult = num2 !== 0 ? num1 / num2 : NaN;
        break;
      default:
        calculatedResult = 0;
    }

    if (!isNaN(calculatedResult)) {
      setResult(calculatedResult);
      data.result = calculatedResult;
    } else {
      setResult(null);
    }
  };

  return (
    <div
      className={cn(
        "w-48 rounded-md border border-cyan-500 bg-cyan-50 p-3 shadow-md dark:bg-cyan-950",
        selected && "ring-2 ring-cyan-500",
      )}
    >
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-cyan-200 dark:bg-cyan-800">
          <Calculator className="h-4 w-4 text-cyan-700 dark:text-cyan-300" />
        </div>
        <div>
          <p className="font-medium">{data.label || "Calculator"}</p>
          {data.description && (
            <p className="text-muted-foreground text-xs">{data.description}</p>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-muted-foreground mb-1 block text-xs font-medium">
              Input 1
            </label>
            <Input
              type="number"
              value={input1}
              onChange={(e) => setInput1(e.target.value)}
              className="h-8 text-sm"
            />
          </div>

          <div>
            <label className="text-muted-foreground mb-1 block text-xs font-medium">
              Input 2
            </label>
            <Input
              type="number"
              value={input2}
              onChange={(e) => setInput2(e.target.value)}
              className="h-8 text-sm"
            />
          </div>
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
              {operators.map((op) => (
                <SelectItem key={op.value} value={op.value}>
                  {op.value} ({op.label})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Handle
        type="target"
        position={Position.Top}
        className="!h-3 !w-3 !bg-cyan-500"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="!h-3 !w-3 !bg-cyan-500"
        id="result"
      />
    </div>
  );
}

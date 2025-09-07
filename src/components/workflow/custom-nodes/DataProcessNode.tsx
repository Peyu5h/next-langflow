"use client";

import { Handle, Position } from "@xyflow/react";
import { CpuIcon } from "lucide-react";
import { cn } from "~/lib/utils";

type DataProcessNodeProps = {
  data: {
    label?: string;
    description?: string;
    process?: string;
  };
  selected?: boolean;
};

export default function DataProcessNode({
  data,
  selected,
}: DataProcessNodeProps) {
  return (
    <div
      className={cn(
        "w-48 rounded-md border border-green-500 bg-green-50 p-3 shadow-md dark:bg-green-950",
        selected && "ring-2 ring-green-500",
      )}
    >
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-200 dark:bg-green-800">
          <CpuIcon className="h-4 w-4 text-green-700 dark:text-green-300" />
        </div>
        <div>
          <p className="font-medium">{data.label || "Data Process"}</p>
          {data.description && (
            <p className="text-muted-foreground text-xs">{data.description}</p>
          )}
        </div>
      </div>

      {data.process && (
        <div className="mt-2 text-sm">
          <p className="text-muted-foreground text-xs font-medium">
            Transform:
          </p>
          <p className="rounded bg-green-100 p-1 text-xs dark:bg-green-900">
            {data.process}
          </p>
        </div>
      )}

      <Handle
        type="target"
        position={Position.Top}
        className="!h-3 !w-3 !bg-green-500"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="!h-3 !w-3 !bg-green-500"
      />
    </div>
  );
}

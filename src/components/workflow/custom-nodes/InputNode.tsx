"use client";

import { useState, useEffect } from "react";
import { Handle, Position } from "@xyflow/react";
import { User } from "lucide-react";
import { cn } from "~/lib/utils";
import { Input } from "~/components/ui/input";
import { Switch } from "~/components/ui/switch";
import { Label } from "~/components/ui/label";

type InputNodeData = {
  label?: string;
  description?: string;
  name?: string;
  age?: string;
  isStudent?: boolean;
};

export default function InputNode({
  data,
  selected,
  id,
}: {
  data: InputNodeData;
  selected?: boolean;
  id: string;
}) {
  const [name, setName] = useState(data.name || "");
  const [age, setAge] = useState(data.age || "");
  const [isStudent, setIsStudent] = useState(data.isStudent || false);

  useEffect(() => {
    data.name = name;
    data.age = age;
    data.isStudent = isStudent;
  }, [name, age, isStudent, data]);

  useEffect(() => {
    if (data.name !== undefined) setName(data.name);
    if (data.age !== undefined) setAge(data.age);
    if (data.isStudent !== undefined) setIsStudent(data.isStudent);
  }, [data.name, data.age, data.isStudent]);

  return (
    <div
      className={cn(
        "w-64 rounded-md border border-blue-500 bg-blue-50 p-3 shadow-md dark:bg-blue-950",
        selected && "ring-2 ring-blue-500",
      )}
    >
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-200 dark:bg-blue-800">
          <User className="h-4 w-4 text-blue-700 dark:text-blue-300" />
        </div>
        <div>
          <p className="font-medium">{data.label || "User Information"}</p>
          {data.description && (
            <p className="text-muted-foreground text-xs">{data.description}</p>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <label className="text-muted-foreground mb-1 block text-xs font-medium">
            Name
          </label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter name"
            className="h-8 text-sm"
          />
        </div>

        <div>
          <label className="text-muted-foreground mb-1 block text-xs font-medium">
            Age
          </label>
          <Input
            type="number"
            value={age}
            onChange={(e) => setAge(e.target.value)}
            placeholder="Enter age"
            className="h-8 text-sm"
            min={0}
            max={120}
          />
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            id={`student-${id}`}
            checked={isStudent}
            onCheckedChange={setIsStudent}
          />
          <Label htmlFor={`student-${id}`} className="text-xs">
            Is a student
          </Label>
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!h-3 !w-3 !bg-blue-500"
        id="userData"
      />
    </div>
  );
}

"use client";

import { Loader2 } from "lucide-react";

interface ToolCallBadgeProps {
  toolInvocation: {
    toolName: string;
    args: Record<string, unknown>;
    state: string;
    result?: unknown;
  };
}

export function getToolLabel(
  toolName: string,
  args: Record<string, unknown>
): string {
  const command = args.command as string | undefined;
  const path = args.path as string | undefined;
  const newPath = args.new_path as string | undefined;

  if (toolName === "str_replace_editor") {
    switch (command) {
      case "create":
        return `Creating ${path ?? "file"}`;
      case "str_replace":
        return `Editing ${path ?? "file"}`;
      case "insert":
        return `Editing ${path ?? "file"}`;
      case "view":
        return `Reading ${path ?? "file"}`;
      case "undo_edit":
        return `Undoing edit to ${path ?? "file"}`;
    }
  }

  if (toolName === "file_manager") {
    switch (command) {
      case "rename":
        return `Renaming ${path ?? "file"} → ${newPath ?? "new path"}`;
      case "delete":
        return `Deleting ${path ?? "file"}`;
    }
  }

  return toolName;
}

export function ToolCallBadge({ toolInvocation }: ToolCallBadgeProps) {
  const label = getToolLabel(toolInvocation.toolName, toolInvocation.args);
  const isDone = toolInvocation.state === "result" && toolInvocation.result;

  return (
    <div className="inline-flex items-center gap-2 mt-2 px-3 py-1.5 bg-neutral-50 rounded-lg text-xs font-mono border border-neutral-200">
      {isDone ? (
        <>
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
          <span className="text-neutral-700">{label}</span>
        </>
      ) : (
        <>
          <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
          <span className="text-neutral-700">{label}</span>
        </>
      )}
    </div>
  );
}

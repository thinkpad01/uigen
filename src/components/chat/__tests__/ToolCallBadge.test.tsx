import { test, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ToolCallBadge, getToolLabel } from "../ToolCallBadge";

afterEach(() => {
  cleanup();
});

// --- getToolLabel ---

test("getToolLabel: str_replace_editor create", () => {
  expect(
    getToolLabel("str_replace_editor", { command: "create", path: "/App.jsx" })
  ).toBe("Creating /App.jsx");
});

test("getToolLabel: str_replace_editor str_replace", () => {
  expect(
    getToolLabel("str_replace_editor", {
      command: "str_replace",
      path: "/components/Card.tsx",
    })
  ).toBe("Editing /components/Card.tsx");
});

test("getToolLabel: str_replace_editor insert", () => {
  expect(
    getToolLabel("str_replace_editor", { command: "insert", path: "/App.jsx" })
  ).toBe("Editing /App.jsx");
});

test("getToolLabel: str_replace_editor view", () => {
  expect(
    getToolLabel("str_replace_editor", { command: "view", path: "/App.jsx" })
  ).toBe("Reading /App.jsx");
});

test("getToolLabel: str_replace_editor undo_edit", () => {
  expect(
    getToolLabel("str_replace_editor", {
      command: "undo_edit",
      path: "/App.jsx",
    })
  ).toBe("Undoing edit to /App.jsx");
});

test("getToolLabel: file_manager rename", () => {
  expect(
    getToolLabel("file_manager", {
      command: "rename",
      path: "/old.tsx",
      new_path: "/new.tsx",
    })
  ).toBe("Renaming /old.tsx → /new.tsx");
});

test("getToolLabel: file_manager delete", () => {
  expect(
    getToolLabel("file_manager", { command: "delete", path: "/App.jsx" })
  ).toBe("Deleting /App.jsx");
});

test("getToolLabel: unknown tool name falls back to toolName", () => {
  expect(getToolLabel("some_other_tool", {})).toBe("some_other_tool");
});

test("getToolLabel: missing path falls back to 'file'", () => {
  expect(getToolLabel("str_replace_editor", { command: "create" })).toBe(
    "Creating file"
  );
});

// --- ToolCallBadge component ---

test("ToolCallBadge shows friendly label when done", () => {
  render(
    <ToolCallBadge
      toolInvocation={{
        toolName: "str_replace_editor",
        args: { command: "create", path: "/App.jsx" },
        state: "result",
        result: "Success",
      }}
    />
  );
  expect(screen.getByText("Creating /App.jsx")).toBeDefined();
});

test("ToolCallBadge shows friendly label while in progress", () => {
  render(
    <ToolCallBadge
      toolInvocation={{
        toolName: "str_replace_editor",
        args: { command: "str_replace", path: "/components/Button.tsx" },
        state: "call",
      }}
    />
  );
  expect(screen.getByText("Editing /components/Button.tsx")).toBeDefined();
});

test("ToolCallBadge shows green dot when done", () => {
  const { container } = render(
    <ToolCallBadge
      toolInvocation={{
        toolName: "str_replace_editor",
        args: { command: "create", path: "/App.jsx" },
        state: "result",
        result: "Success",
      }}
    />
  );
  expect(container.querySelector(".bg-emerald-500")).toBeDefined();
});

test("ToolCallBadge shows spinner while in progress", () => {
  const { container } = render(
    <ToolCallBadge
      toolInvocation={{
        toolName: "str_replace_editor",
        args: { command: "create", path: "/App.jsx" },
        state: "call",
      }}
    />
  );
  expect(container.querySelector(".animate-spin")).toBeDefined();
});

test("ToolCallBadge handles file_manager delete", () => {
  render(
    <ToolCallBadge
      toolInvocation={{
        toolName: "file_manager",
        args: { command: "delete", path: "/old-component.tsx" },
        state: "result",
        result: { success: true },
      }}
    />
  );
  expect(screen.getByText("Deleting /old-component.tsx")).toBeDefined();
});

test("ToolCallBadge handles file_manager rename", () => {
  render(
    <ToolCallBadge
      toolInvocation={{
        toolName: "file_manager",
        args: { command: "rename", path: "/Button.tsx", new_path: "/components/Button.tsx" },
        state: "call",
      }}
    />
  );
  expect(
    screen.getByText("Renaming /Button.tsx → /components/Button.tsx")
  ).toBeDefined();
});

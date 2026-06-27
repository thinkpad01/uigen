import { describe, test, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useAuth } from "@/hooks/use-auth";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/actions", () => ({
  signIn: vi.fn(),
  signUp: vi.fn(),
}));

vi.mock("@/lib/anon-work-tracker", () => ({
  getAnonWorkData: vi.fn(),
  clearAnonWork: vi.fn(),
}));

vi.mock("@/actions/get-projects", () => ({
  getProjects: vi.fn(),
}));

vi.mock("@/actions/create-project", () => ({
  createProject: vi.fn(),
}));

import { signIn as signInAction, signUp as signUpAction } from "@/actions";
import { getAnonWorkData, clearAnonWork } from "@/lib/anon-work-tracker";
import { getProjects } from "@/actions/get-projects";
import { createProject } from "@/actions/create-project";

describe("useAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("initial state", () => {
    test("isLoading starts as false", () => {
      const { result } = renderHook(() => useAuth());
      expect(result.current.isLoading).toBe(false);
    });

    test("exposes signIn, signUp, and isLoading", () => {
      const { result } = renderHook(() => useAuth());
      expect(typeof result.current.signIn).toBe("function");
      expect(typeof result.current.signUp).toBe("function");
      expect(typeof result.current.isLoading).toBe("boolean");
    });
  });

  describe("signIn", () => {
    test("returns the result from the sign-in action on success", async () => {
      vi.mocked(signInAction).mockResolvedValue({ success: true });
      vi.mocked(getAnonWorkData).mockReturnValue(null);
      vi.mocked(getProjects).mockResolvedValue([{ id: "proj-1", name: "My Design", createdAt: new Date(), updatedAt: new Date() }]);

      const { result } = renderHook(() => useAuth());
      let returnValue: any;

      await act(async () => {
        returnValue = await result.current.signIn("user@example.com", "password123");
      });

      expect(returnValue).toEqual({ success: true });
    });

    test("returns error result without navigating when credentials are wrong", async () => {
      vi.mocked(signInAction).mockResolvedValue({ success: false, error: "Invalid credentials" });

      const { result } = renderHook(() => useAuth());
      let returnValue: any;

      await act(async () => {
        returnValue = await result.current.signIn("user@example.com", "wrongpass");
      });

      expect(returnValue).toEqual({ success: false, error: "Invalid credentials" });
      expect(mockPush).not.toHaveBeenCalled();
    });

    test("sets isLoading to true during sign-in and resets it after", async () => {
      let resolveSignIn!: (v: any) => void;
      vi.mocked(signInAction).mockReturnValue(
        new Promise((res) => { resolveSignIn = res; })
      );

      const { result } = renderHook(() => useAuth());

      // Start without awaiting so we can observe the in-flight state
      let pending: Promise<any>;
      act(() => { pending = result.current.signIn("user@example.com", "pass"); });

      await waitFor(() => expect(result.current.isLoading).toBe(true));

      await act(async () => {
        resolveSignIn({ success: false, error: "Invalid credentials" });
        await pending;
      });

      expect(result.current.isLoading).toBe(false);
    });

    test("resets isLoading to false even when the action throws", async () => {
      vi.mocked(signInAction).mockRejectedValue(new Error("Network error"));

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("user@example.com", "password123").catch(() => {});
      });

      expect(result.current.isLoading).toBe(false);
    });

    describe("post-sign-in navigation", () => {
      test("migrates anonymous work to a new project and redirects when anon messages exist", async () => {
        const anonWork = {
          messages: [{ role: "user", content: "Hello" }],
          fileSystemData: { "/App.jsx": { type: "file", content: "" } },
        };
        vi.mocked(signInAction).mockResolvedValue({ success: true });
        vi.mocked(getAnonWorkData).mockReturnValue(anonWork);
        vi.mocked(createProject).mockResolvedValue({ id: "new-proj", name: "Design from ...", messages: "[]", data: "{}", userId: "u1", createdAt: new Date(), updatedAt: new Date() });

        const { result } = renderHook(() => useAuth());

        await act(async () => {
          await result.current.signIn("user@example.com", "password123");
        });

        expect(createProject).toHaveBeenCalledWith({
          name: expect.stringContaining("Design from"),
          messages: anonWork.messages,
          data: anonWork.fileSystemData,
        });
        expect(clearAnonWork).toHaveBeenCalled();
        expect(mockPush).toHaveBeenCalledWith("/new-proj");
        expect(getProjects).not.toHaveBeenCalled();
      });

      test("skips anon-work migration when anon messages array is empty", async () => {
        vi.mocked(signInAction).mockResolvedValue({ success: true });
        vi.mocked(getAnonWorkData).mockReturnValue({ messages: [], fileSystemData: {} });
        vi.mocked(getProjects).mockResolvedValue([{ id: "existing-proj", name: "Old", createdAt: new Date(), updatedAt: new Date() }]);

        const { result } = renderHook(() => useAuth());

        await act(async () => {
          await result.current.signIn("user@example.com", "password123");
        });

        expect(createProject).not.toHaveBeenCalled();
        expect(clearAnonWork).not.toHaveBeenCalled();
        expect(mockPush).toHaveBeenCalledWith("/existing-proj");
      });

      test("skips anon-work migration when getAnonWorkData returns null", async () => {
        vi.mocked(signInAction).mockResolvedValue({ success: true });
        vi.mocked(getAnonWorkData).mockReturnValue(null);
        vi.mocked(getProjects).mockResolvedValue([{ id: "existing-proj", name: "Old", createdAt: new Date(), updatedAt: new Date() }]);

        const { result } = renderHook(() => useAuth());

        await act(async () => {
          await result.current.signIn("user@example.com", "password123");
        });

        expect(createProject).not.toHaveBeenCalled();
        expect(mockPush).toHaveBeenCalledWith("/existing-proj");
      });

      test("redirects to the most recent existing project when no anon work", async () => {
        vi.mocked(signInAction).mockResolvedValue({ success: true });
        vi.mocked(getAnonWorkData).mockReturnValue(null);
        vi.mocked(getProjects).mockResolvedValue([
          { id: "recent-proj", name: "Recent", createdAt: new Date(), updatedAt: new Date() },
          { id: "older-proj", name: "Older", createdAt: new Date(), updatedAt: new Date() },
        ]);

        const { result } = renderHook(() => useAuth());

        await act(async () => {
          await result.current.signIn("user@example.com", "password123");
        });

        expect(mockPush).toHaveBeenCalledWith("/recent-proj");
      });

      test("creates a new empty project and redirects when user has no projects", async () => {
        vi.mocked(signInAction).mockResolvedValue({ success: true });
        vi.mocked(getAnonWorkData).mockReturnValue(null);
        vi.mocked(getProjects).mockResolvedValue([]);
        vi.mocked(createProject).mockResolvedValue({ id: "brand-new", name: "New Design #42", messages: "[]", data: "{}", userId: "u1", createdAt: new Date(), updatedAt: new Date() });

        const { result } = renderHook(() => useAuth());

        await act(async () => {
          await result.current.signIn("user@example.com", "password123");
        });

        expect(createProject).toHaveBeenCalledWith({
          name: expect.stringMatching(/^New Design #\d+$/),
          messages: [],
          data: {},
        });
        expect(mockPush).toHaveBeenCalledWith("/brand-new");
      });
    });
  });

  describe("signUp", () => {
    test("returns the result from the sign-up action on success", async () => {
      vi.mocked(signUpAction).mockResolvedValue({ success: true });
      vi.mocked(getAnonWorkData).mockReturnValue(null);
      vi.mocked(getProjects).mockResolvedValue([{ id: "proj-1", name: "My Design", createdAt: new Date(), updatedAt: new Date() }]);

      const { result } = renderHook(() => useAuth());
      let returnValue: any;

      await act(async () => {
        returnValue = await result.current.signUp("new@example.com", "password123");
      });

      expect(returnValue).toEqual({ success: true });
    });

    test("returns error result without navigating when sign-up fails", async () => {
      vi.mocked(signUpAction).mockResolvedValue({ success: false, error: "Email already registered" });

      const { result } = renderHook(() => useAuth());
      let returnValue: any;

      await act(async () => {
        returnValue = await result.current.signUp("existing@example.com", "password123");
      });

      expect(returnValue).toEqual({ success: false, error: "Email already registered" });
      expect(mockPush).not.toHaveBeenCalled();
    });

    test("sets isLoading to true during sign-up and resets it after", async () => {
      let resolveSignUp!: (v: any) => void;
      vi.mocked(signUpAction).mockReturnValue(
        new Promise((res) => { resolveSignUp = res; })
      );

      const { result } = renderHook(() => useAuth());

      let pending: Promise<any>;
      act(() => { pending = result.current.signUp("new@example.com", "password123"); });

      await waitFor(() => expect(result.current.isLoading).toBe(true));

      await act(async () => {
        resolveSignUp({ success: false, error: "Error" });
        await pending;
      });

      expect(result.current.isLoading).toBe(false);
    });

    test("resets isLoading to false even when the action throws", async () => {
      vi.mocked(signUpAction).mockRejectedValue(new Error("Server error"));

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signUp("new@example.com", "password123").catch(() => {});
      });

      expect(result.current.isLoading).toBe(false);
    });

    test("runs the same post-sign-in navigation logic after successful sign-up", async () => {
      const anonWork = {
        messages: [{ role: "user", content: "Build me a card" }],
        fileSystemData: {},
      };
      vi.mocked(signUpAction).mockResolvedValue({ success: true });
      vi.mocked(getAnonWorkData).mockReturnValue(anonWork);
      vi.mocked(createProject).mockResolvedValue({ id: "migrated-proj", name: "Design from ...", messages: "[]", data: "{}", userId: "u1", createdAt: new Date(), updatedAt: new Date() });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signUp("new@example.com", "password123");
      });

      expect(createProject).toHaveBeenCalledWith(
        expect.objectContaining({ messages: anonWork.messages, data: anonWork.fileSystemData })
      );
      expect(clearAnonWork).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith("/migrated-proj");
    });
  });
});

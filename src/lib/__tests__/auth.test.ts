import { test, expect, vi, afterEach, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const mockCookieSet = vi.fn();
vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({ set: mockCookieSet }),
}));

const mockSign = vi.fn().mockResolvedValue("mock-jwt-token");
const mockSetIssuedAt = vi.fn().mockReturnThis();
const mockSetExpirationTime = vi.fn().mockReturnThis();
const mockSetProtectedHeader = vi.fn().mockReturnThis();
vi.mock("jose", () => ({
  SignJWT: vi.fn().mockImplementation(() => ({
    setProtectedHeader: mockSetProtectedHeader,
    setExpirationTime: mockSetExpirationTime,
    setIssuedAt: mockSetIssuedAt,
    sign: mockSign,
  })),
  jwtVerify: vi.fn(),
}));

import { createSession } from "../auth";
import { SignJWT } from "jose";

beforeEach(() => {
  vi.clearAllMocks();
  mockSign.mockResolvedValue("mock-jwt-token");
});

afterEach(() => {
  delete process.env.NODE_ENV;
});

test("createSession constructs JWT with userId and email in payload", async () => {
  await createSession("user-123", "test@example.com");

  expect(SignJWT).toHaveBeenCalledWith(
    expect.objectContaining({ userId: "user-123", email: "test@example.com" })
  );
});

test("createSession sets HS256 protected header", async () => {
  await createSession("user-123", "test@example.com");

  expect(mockSetProtectedHeader).toHaveBeenCalledWith({ alg: "HS256" });
});

test("createSession sets 7d expiration", async () => {
  await createSession("user-123", "test@example.com");

  expect(mockSetExpirationTime).toHaveBeenCalledWith("7d");
});

test("createSession sets the auth-token cookie with the signed token", async () => {
  await createSession("user-123", "test@example.com");

  expect(mockCookieSet).toHaveBeenCalledWith(
    "auth-token",
    "mock-jwt-token",
    expect.any(Object)
  );
});

test("createSession sets cookie as httpOnly", async () => {
  await createSession("user-123", "test@example.com");

  const cookieOptions = mockCookieSet.mock.calls[0][2];
  expect(cookieOptions.httpOnly).toBe(true);
});

test("createSession sets cookie path to /", async () => {
  await createSession("user-123", "test@example.com");

  const cookieOptions = mockCookieSet.mock.calls[0][2];
  expect(cookieOptions.path).toBe("/");
});

test("createSession sets sameSite to lax", async () => {
  await createSession("user-123", "test@example.com");

  const cookieOptions = mockCookieSet.mock.calls[0][2];
  expect(cookieOptions.sameSite).toBe("lax");
});

test("createSession sets secure: false outside production", async () => {
  await createSession("user-123", "test@example.com");

  const cookieOptions = mockCookieSet.mock.calls[0][2];
  expect(cookieOptions.secure).toBe(false);
});

test("createSession sets secure: true in production", async () => {
  process.env.NODE_ENV = "production";

  await createSession("user-123", "test@example.com");

  const cookieOptions = mockCookieSet.mock.calls[0][2];
  expect(cookieOptions.secure).toBe(true);
});

test("createSession sets cookie expiry ~7 days from now", async () => {
  const before = Date.now();
  await createSession("user-123", "test@example.com");
  const after = Date.now();

  const cookieOptions = mockCookieSet.mock.calls[0][2];
  const expires: Date = cookieOptions.expires;
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

  expect(expires.getTime()).toBeGreaterThanOrEqual(before + sevenDaysMs - 1000);
  expect(expires.getTime()).toBeLessThanOrEqual(after + sevenDaysMs + 1000);
});

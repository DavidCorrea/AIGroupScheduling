/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

let mockPathname = "/";
let mockSession: { user?: { name: string; email: string; image?: string } } | null = null;

jest.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
}));

jest.mock("next-auth/react", () => ({
  useSession: () => ({
    data: mockSession,
    status: mockSession ? "authenticated" : "unauthenticated",
  }),
  signOut: jest.fn(),
}));

jest.mock("next/link", () => {
  return function MockLink({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: React.ReactNode;
    [key: string]: unknown;
  }) {
    return (
      <a href={href} {...rest}>
        {children}
      </a>
    );
  };
});

import AppNavBar from "@/components/AppNavBar";

beforeAll(() => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: jest.fn().mockImplementation((query: string) => ({
      matches: query === "(prefers-color-scheme: dark)",
      media: query,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    })),
  });
});

beforeEach(() => {
  mockPathname = "/";
  mockSession = null;
});

describe("Global navigation bar", () => {
  it("links the user avatar and name to the settings page when logged in", () => {
    mockSession = { user: { name: "Ana", email: "ana@test.com" } };

    render(<AppNavBar />);

    const nameElements = screen.getAllByText("Ana");
    const settingsLink = nameElements[0].closest("a");
    expect(settingsLink).toHaveAttribute("href", "/settings");
  });

  it("shows the login link when there is no active session", () => {
    mockSession = null;

    render(<AppNavBar />);

    expect(screen.getAllByText("Iniciar sesión").length).toBeGreaterThan(0);
  });

  it("does not render on the login page", () => {
    mockPathname = "/login";
    mockSession = null;

    const { container } = render(<AppNavBar />);

    expect(container.innerHTML).toBe("");
  });

  it("shows the user name when logged in", () => {
    mockSession = { user: { name: "Carlos", email: "carlos@test.com" } };

    render(<AppNavBar />);

    expect(screen.getAllByText("Carlos").length).toBeGreaterThan(0);
  });

  it("renders the app title linking to the home page", () => {
    mockSession = { user: { name: "Ana", email: "ana@test.com" } };

    render(<AppNavBar />);

    const titleLink = screen.getAllByText("Cronogramas")[0].closest("a");
    expect(titleLink).toHaveAttribute("href", "/");
  });
});

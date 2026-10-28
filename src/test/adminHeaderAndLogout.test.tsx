import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminRoute } from "@/components/admin/AdminRoute";

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock AuthContext
const mockLogout = vi.fn();
let mockUser: any = {
  id: "1b49e12f-be0d-4484-989c-856aa0ad1c84",
  email: "srikanthuppalapati09@gmail.com",
  full_name: "srikanth uppalapati",
  role: "super_admin",
  is_email_verified: true,
};
let mockIsAuthenticated = true;
let mockIsLoading = false;

vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({
    user: mockUser,
    isAuthenticated: mockIsAuthenticated,
    isLoading: mockIsLoading,
    logout: mockLogout,
  }),
}));

// Mock adminService
vi.mock("@/services/adminService", () => ({
  adminService: {
    getSystemHealth: vi.fn().mockResolvedValue({
      status: "healthy",
      services: {
        api: "healthy",
        database: "healthy",
        authentication: "healthy",
        ai_service: "healthy",
        storage: "healthy",
      },
    }),
  },
}));

function renderWithProviders(ui: React.ReactElement, initialRoute = "/admin") {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialRoute]}>
        {ui}
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("Milestone 1 — Admin Header Dropdown & Logout Functionality", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser = {
      id: "1b49e12f-be0d-4484-989c-856aa0ad1c84",
      email: "srikanthuppalapati09@gmail.com",
      full_name: "srikanth uppalapati",
      role: "super_admin",
      is_email_verified: true,
    };
    mockIsAuthenticated = true;
    mockIsLoading = false;
  });

  it("renders authenticated super admin identity in AdminHeader trigger", () => {
    renderWithProviders(<AdminHeader onOpenMobileMenu={vi.fn()} />);

    // Trigger button should be rendered
    const trigger = screen.getByRole("button", { name: /super admin account menu/i });
    expect(trigger).toBeDefined();

    // Admin's name and email should be in the header
    expect(screen.getByText("srikanth uppalapati")).toBeDefined();
    expect(screen.getByText("srikanthuppalapati09@gmail.com")).toBeDefined();
  });

  it("opens dropdown menu with role badge, candidate workspace link, and logout option upon click", async () => {
    renderWithProviders(<AdminHeader onOpenMobileMenu={vi.fn()} />);

    const trigger = screen.getByRole("button", { name: /super admin account menu/i });
    fireEvent.pointerDown(trigger, { button: 0, ctrlKey: false });
    fireEvent.keyDown(trigger, { key: "Enter" });

    // Dropdown content should display SUPER ADMIN badge
    await waitFor(() => {
      expect(screen.getAllByText("SUPER ADMIN").length).toBeGreaterThan(0);
    });

    // Navigation item to Candidate Workspace (in header and dropdown menu)
    expect(screen.getAllByText("Candidate Workspace").length).toBeGreaterThanOrEqual(1);

    // System Diagnostics item
    expect(screen.getByText("System Diagnostics")).toBeDefined();

    // Log Out item
    expect(screen.getByText("Log Out")).toBeDefined();
  });

  it("invokes auth logout and redirects to /login when Log Out is clicked in AdminHeader", async () => {
    renderWithProviders(<AdminHeader onOpenMobileMenu={vi.fn()} />);

    const trigger = screen.getByRole("button", { name: /super admin account menu/i });
    fireEvent.pointerDown(trigger, { button: 0, ctrlKey: false });
    fireEvent.keyDown(trigger, { key: "Enter" });

    await waitFor(() => {
      expect(screen.getByText("Log Out")).toBeDefined();
    });

    const logoutItem = screen.getByText("Log Out");
    fireEvent.click(logoutItem);

    await waitFor(() => {
      expect(mockLogout).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith("/login");
    });
  });

  it("renders secondary Sign Out action in AdminSidebar and triggers shared logout", async () => {
    const mockOnClose = vi.fn();
    renderWithProviders(<AdminSidebar onClose={mockOnClose} />);

    // Sign Out button should be present in sidebar footer
    const signOutButton = screen.getByRole("button", { name: /log out/i });
    expect(signOutButton).toBeDefined();
    expect(screen.getByText("Sign Out")).toBeDefined();

    fireEvent.click(signOutButton);

    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalledTimes(1);
      expect(mockLogout).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith("/login");
    });
  });

  it("AdminRoute blocks unauthenticated access and navigates to /login", () => {
    mockIsAuthenticated = false;
    mockUser = null;

    renderWithProviders(
      <Routes>
        <Route element={<AdminRoute />}>
          <Route path="/admin" element={<div>Protected Admin Content</div>} />
        </Route>
        <Route path="/login" element={<div>Login Page</div>} />
      </Routes>,
      "/admin"
    );

    // Should not show protected admin content
    expect(screen.queryByText("Protected Admin Content")).toBeNull();
    // Should have redirected to login
    expect(screen.getByText("Login Page")).toBeDefined();
  });

  it("AdminRoute displays access restricted for authenticated non-admin candidate", () => {
    mockIsAuthenticated = true;
    mockUser = {
      id: "cand-1",
      email: "candidate@lakshya.ai",
      role: "user",
    };

    renderWithProviders(
      <Routes>
        <Route element={<AdminRoute />}>
          <Route path="/admin" element={<div>Protected Admin Content</div>} />
        </Route>
      </Routes>,
      "/admin"
    );

    expect(screen.queryByText("Protected Admin Content")).toBeNull();
    expect(screen.getByText("Access Restricted")).toBeDefined();
    expect(screen.getByText("Return to Candidate Dashboard")).toBeDefined();
  });
});

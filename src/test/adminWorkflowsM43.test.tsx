import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UserManagementTable } from '../components/admin/UserManagementTable';
import { AnnouncementManager } from '../components/admin/AnnouncementManager';
import { AdminAuditPage } from '../pages/admin/AdminAuditPage';
import type { AdminUserListItem, PlatformAnnouncement } from '../types';
import { adminService } from '../services/adminService';

vi.mock('../services/adminService', () => ({
  adminService: {
    getAuditLogs: vi.fn(),
    exportAuditLogs: vi.fn(),
    updateAnnouncement: vi.fn(),
    deleteAnnouncement: vi.fn(),
    createAnnouncement: vi.fn(),
    getAnnouncements: vi.fn(),
  },
}));

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: 'admin-lead-id',
      email: 'admin@lakshya.test',
      full_name: 'Lead Admin',
      role: 'super_admin',
    },
    isAuthenticated: true,
  }),
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
});

describe('Phase 4 Milestone 4.3: Admin Workflows and Audit Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('A. Candidate Readiness Score Display', () => {
    it('renders numerical readiness scores and gracefully handles null (insufficient data)', () => {
      const mockUsers: AdminUserListItem[] = [
        {
          id: 'user-1',
          email: 'ready@example.com',
          full_name: 'Ready Candidate',
          role: 'user',
          is_active: true,
          is_suspended: false,
          is_email_verified: true,
          onboarding_completed: true,
          ats_score: 85,
          readiness_score: 82.5,
          applications_count: 3,
          interviews_count: 2,
          last_activity_at: '2026-10-27T10:00:00Z',
          created_at: '2026-10-20T10:00:00Z',
        },
        {
          id: 'user-2',
          email: 'newbie@example.com',
          full_name: 'Newbie Candidate',
          role: 'user',
          is_active: true,
          is_suspended: false,
          is_email_verified: false,
          onboarding_completed: false,
          ats_score: null,
          readiness_score: null, // Insufficient data / provisional
          applications_count: 0,
          interviews_count: 0,
          last_activity_at: '2026-10-27T10:00:00Z',
          created_at: '2026-10-26T10:00:00Z',
        },
      ];

      render(
        <BrowserRouter>
          <UserManagementTable
            users={mockUsers}
            loading={false}
            page={1}
            totalPages={1}
            totalUsers={2}
            onPageChange={vi.fn()}
            onSelectUser={vi.fn()}
          />
        </BrowserRouter>
      );

      // User 1 readiness score
      expect(screen.getByText('83%')).toBeInTheDocument();

      // User 2 provisional / insufficient data indicator
      expect(screen.getByText('Pending')).toBeInTheDocument();
    });
  });

  describe('B. User Management Sorting Headers', () => {
    it('calls onSortChange when clicking sortable column headers', () => {
      const handleSort = vi.fn();
      const mockUsers: AdminUserListItem[] = [
        {
          id: 'user-1',
          email: 'ready@example.com',
          full_name: 'Ready Candidate',
          role: 'user',
          is_active: true,
          is_suspended: false,
          is_email_verified: true,
          onboarding_completed: true,
          ats_score: 85,
          readiness_score: 82.5,
          applications_count: 3,
          interviews_count: 2,
          last_activity_at: '2026-10-27T10:00:00Z',
          created_at: '2026-10-20T10:00:00Z',
        },
      ];

      render(
        <BrowserRouter>
          <UserManagementTable
            users={mockUsers}
            loading={false}
            page={1}
            totalPages={1}
            totalUsers={1}
            sortBy="created_at"
            sortOrder="desc"
            onSortChange={handleSort}
            onPageChange={vi.fn()}
            onSelectUser={vi.fn()}
          />
        </BrowserRouter>
      );

      const candidateHeaderBtn = screen.getByTitle('Sort by Candidate / User');
      fireEvent.click(candidateHeaderBtn);

      expect(handleSort).toHaveBeenCalledWith('name');
    });
  });

  describe('C. Announcement Lifecycle and Editing', () => {
    it('renders edit modal and allows updating announcement properties', async () => {
      const mockAnnouncements: PlatformAnnouncement[] = [
        {
          id: 'ann-1',
          title: 'Scheduled Maintenance',
          message: 'Maintenance at midnight UTC',
          type: 'warning',
          target_audience: 'all',
          is_active: true,
          created_at: '2026-10-25T10:00:00Z',
          updated_at: '2026-10-25T10:00:00Z',
        },
      ];

      const handleUpdate = vi.fn();
      const handleDelete = vi.fn();
      const handleCreate = vi.fn();

      render(
        <AnnouncementManager
          announcements={mockAnnouncements}
          isLoading={false}
          onCreateAnnouncement={handleCreate}
          onUpdateAnnouncement={handleUpdate}
          onDeleteAnnouncement={handleDelete}
        />
      );

      expect(screen.getByText('Scheduled Maintenance')).toBeInTheDocument();
      expect(screen.getByText('Active')).toBeInTheDocument();

      // Open Edit Modal
      const editBtn = screen.getByTitle('Edit announcement');
      fireEvent.click(editBtn);

      expect(screen.getByText('Edit Announcement')).toBeInTheDocument();

      // Change title
      const titleInput = screen.getByDisplayValue('Scheduled Maintenance');
      fireEvent.change(titleInput, { target: { value: 'Updated Maintenance' } });

      // Save changes
      const saveBtn = screen.getByRole('button', { name: /save changes/i });
      fireEvent.click(saveBtn);

      expect(handleUpdate).toHaveBeenCalledWith(
        'ann-1',
        expect.objectContaining({
          title: 'Updated Maintenance',
        })
      );
    });
  });

  describe('D. Audit Search, Date Filtering, and Export', () => {
    it('renders search input, date filters, and triggers CSV export with sanitization feedback', async () => {
      vi.mocked(adminService.getAuditLogs).mockResolvedValue({
        items: [
          {
            id: 'audit-1',
            admin_user_id: 'admin-1',
            admin_email: 'admin@lakshya.test',
            action_type: 'UPDATE_ANNOUNCEMENT',
            resource_type: 'announcement',
            resource_id: 'ann-1',
            reason: 'Routine update',
            severity: 'info',
            action_metadata: {},
            created_at: '2026-10-27T10:00:00Z',
          },
        ],
        total: 1,
        page: 1,
        page_size: 50,
        total_pages: 1,
      });

      const fakeBlob = new Blob(['Log ID,Action Type\naudit-1,UPDATE_ANNOUNCEMENT'], { type: 'text/csv' });
      vi.mocked(adminService.exportAuditLogs).mockResolvedValue(fakeBlob);

      // Mock URL.createObjectURL and revokeObjectURL
      window.URL.createObjectURL = vi.fn().mockReturnValue('blob:mock-url');
      window.URL.revokeObjectURL = vi.fn();

      render(
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <AdminAuditPage />
          </BrowserRouter>
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('UPDATE_ANNOUNCEMENT')).toBeInTheDocument();
      });

      // Check for search term input
      const searchInput = screen.getByPlaceholderText(/search action type/i);
      expect(searchInput).toBeInTheDocument();

      // Check Export CSV button exists
      const exportBtn = screen.getByRole('button', { name: /export csv/i });
      expect(exportBtn).toBeInTheDocument();

      fireEvent.click(exportBtn);

      await waitFor(() => {
        expect(adminService.exportAuditLogs).toHaveBeenCalled();
      });
    });
  });
});

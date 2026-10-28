import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SystemHealthPanel } from '../components/admin/SystemHealthPanel';
import { FeatureFlagManager } from '../components/admin/FeatureFlagManager';
import { AdminDatabasePage } from '../pages/admin/AdminDatabasePage';
import { adminService } from '../services/adminService';
import type { SystemHealthResponse, FeatureFlag } from '../types';

vi.mock('../services/adminService', () => ({
  adminService: {
    getSystemHealth: vi.fn(),
    getFeatureFlags: vi.fn(),
    createFeatureFlag: vi.fn(),
    updateFeatureFlag: vi.fn(),
    deleteFeatureFlag: vi.fn(),
    getDatabaseTables: vi.fn(),
    queryDatabaseTable: vi.fn(),
    mutateDatabaseRecord: vi.fn(),
    deleteDatabaseRecord: vi.fn(),
  },
}));

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: 'super-admin-id',
      email: 'admin@lakshya.test',
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

describe('Phase 4 Milestone 4.4: System Health, Feature Flags, and Database Explorer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('A. System Health & Diagnostics', () => {
    it('renders system health services, latencies, and active providers without leaking credentials', () => {
      const mockHealth: SystemHealthResponse = {
        status: 'healthy',
        services: {
          api: 'healthy',
          database: 'healthy',
          authentication: 'healthy',
          ai_service: 'healthy',
          storage: 'healthy',
        },
        service_details: {
          api: { status: 'healthy', latency_ms: 1.2, last_checked: '2026-10-27T10:00:00Z' },
          database: { status: 'healthy', latency_ms: 4.8, last_checked: '2026-10-27T10:00:00Z' },
          authentication: { status: 'healthy', latency_ms: 0.5, last_checked: '2026-10-27T10:00:00Z' },
          ai_service: {
            status: 'healthy',
            active_providers: ['Google Gemini', 'OpenAI GPT'],
            last_checked: '2026-10-27T10:00:00Z',
          },
          storage: { status: 'healthy', latency_ms: 1.9, last_checked: '2026-10-27T10:00:00Z' },
        },
        open_alerts_count: 0,
        timestamp: '2026-10-27T10:00:00Z',
      };

      render(
        <BrowserRouter>
          <SystemHealthPanel health={mockHealth} isLoading={false} onRefresh={vi.fn()} />
        </BrowserRouter>
      );

      expect(screen.getByText(/All Core Services Healthy/i)).toBeInTheDocument();
      expect(screen.getByText('Google Gemini, OpenAI GPT')).toBeInTheDocument();
      expect(screen.getByText('4.8 ms latency')).toBeInTheDocument();
    });
  });

  describe('B. Feature Flag Management & Safeguards', () => {
    it('distinguishes protected system flags from custom flags and renders deletion for custom flags', async () => {
      const mockFlags: FeatureFlag[] = [
        {
          id: 'flag-system-1',
          key: 'voice_interview',
          name: 'Voice Interview Studio',
          description: 'AI voice mock interviews',
          is_enabled: true,
          target_roles: ['user', 'admin'],
          created_at: '2026-10-20T10:00:00Z',
          updated_at: '2026-10-20T10:00:00Z',
        },
        {
          id: 'flag-custom-2',
          key: 'beta_analyzer',
          name: 'Beta Analyzer',
          description: 'Custom experimental analyzer',
          is_enabled: false,
          target_roles: ['super_admin'],
          created_at: '2026-10-25T10:00:00Z',
          updated_at: '2026-10-25T10:00:00Z',
        },
      ];

      const handleToggle = vi.fn();
      const handleCreate = vi.fn();
      const handleDelete = vi.fn();

      render(
        <FeatureFlagManager
          flags={mockFlags}
          isLoading={false}
          onToggleFlag={handleToggle}
          onCreateFlag={handleCreate}
          onDeleteFlag={handleDelete}
        />
      );

      // Verify badges
      expect(screen.getByText('System Flag')).toBeInTheDocument();
      expect(screen.getByText('Custom Flag')).toBeInTheDocument();

      // System flag does not have delete button; custom flag does
      const deleteButtons = screen.getAllByTitle('Delete custom feature flag');
      expect(deleteButtons).toHaveLength(1);

      // Open Delete Dialog
      fireEvent.click(deleteButtons[0]);
      expect(screen.getByText(/Delete Feature Flag/i)).toBeInTheDocument();
      expect(screen.getAllByText('beta_analyzer').length).toBeGreaterThanOrEqual(2);

      // Confirm Delete
      const confirmBtn = screen.getByRole('button', { name: /confirm delete/i });
      fireEvent.click(confirmBtn);

      expect(handleDelete).toHaveBeenCalledWith('flag-custom-2');
    });
  });

  describe('C. Database Explorer Enhanced Relationships', () => {
    it('renders database explorer and displays foreign key filter pill when filtering by relationship', async () => {
      vi.mocked(adminService.getDatabaseTables).mockResolvedValue([
        {
          table_name: 'users',
          category: 'identity',
          description: 'Entity mapping for users',
          is_destructive_allowed: true,
          requires_confirmation_to_delete: true,
          readable_fields: ['id', 'email', 'full_name'],
          masked_fields: [],
          editable_fields: ['full_name'],
          immutable_fields: ['id', 'email'],
          relationships: {
            career_profile: { table: 'user_career_profiles', foreign_key: 'user_id' },
          },
        },
        {
          table_name: 'user_career_profiles',
          category: 'career',
          description: 'Entity mapping for user_career_profiles',
          is_destructive_allowed: true,
          requires_confirmation_to_delete: true,
          readable_fields: ['id', 'user_id', 'target_role'],
          masked_fields: [],
          editable_fields: ['target_role'],
          immutable_fields: ['id', 'user_id'],
          relationships: {
            user: { table: 'users', foreign_key: 'id', local_key: 'user_id' },
          },
        },
      ]);

      vi.mocked(adminService.queryDatabaseTable).mockResolvedValue({
        table_name: 'user_career_profiles',
        category: 'career',
        total_records: 1,
        page: 1,
        page_size: 20,
        total_pages: 1,
        records: [
          {
            id: 'cp-uuid-1',
            user_id: 'user-uuid-123',
            target_role: 'Lead Architect',
          },
        ],
        schema_info: {
          columns: ['id', 'user_id', 'target_role'],
          masked_columns: [],
          editable_columns: ['target_role'],
          immutable_columns: ['id', 'user_id'],
          relationships: {
            user: { table: 'users', foreign_key: 'id', local_key: 'user_id' },
          },
        },
      });

      render(
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <AdminDatabasePage />
          </BrowserRouter>
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Database Explorer & Governance')).toBeInTheDocument();
      });

      // Click on user_career_profiles table pill
      const cpTableBtn = await screen.findByRole('button', { name: /user_career_profiles/i });
      fireEvent.click(cpTableBtn);

      await waitFor(() => {
        expect(screen.getByText('Lead Architect')).toBeInTheDocument();
      });

      // Click foreign key user_id link
      const userLink = screen.getByTitle('Navigate to related user record in users table');
      expect(userLink).toBeInTheDocument();
      fireEvent.click(userLink);

      // Verify foreign key filter pill appears
      await waitFor(() => {
        expect(screen.getByText('Foreign Key Filter:')).toBeInTheDocument();
      });
    });
  });
});

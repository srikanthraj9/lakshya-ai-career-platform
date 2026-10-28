-- Lakshya AI - Super Admin Dashboard Phase 2
-- Migration: 003_create_admin_alerts.sql
-- Status: PREPARED & NON-DESTRUCTIVE (Do not execute on production without explicit user authorization)
-- Description: Creates the optional dedicated operational_alerts table for standalone persistent alert storage.

CREATE TABLE IF NOT EXISTS public.admin_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_type VARCHAR(64) NOT NULL,
    severity VARCHAR(32) NOT NULL DEFAULT 'warning', -- 'critical', 'warning', 'info'
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    source_service VARCHAR(64) NOT NULL, -- 'api', 'database', 'ai_service', 'authentication', 'storage', 'governance'
    status VARCHAR(32) NOT NULL DEFAULT 'open', -- 'open', 'acknowledged', 'resolved'
    incident_fingerprint VARCHAR(255) NOT NULL,
    related_resource_type VARCHAR(64) NULL,
    related_resource_id VARCHAR(128) NULL,
    acknowledged_by_id UUID NULL REFERENCES public.users(id) ON DELETE SET NULL,
    acknowledged_at TIMESTAMPTZ NULL,
    resolved_by_id UUID NULL REFERENCES public.users(id) ON DELETE SET NULL,
    resolved_at TIMESTAMPTZ NULL,
    resolution_notes TEXT NULL,
    alert_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- Bounded Indexes for Fast Alert Queries
CREATE INDEX IF NOT EXISTS idx_admin_alerts_status ON public.admin_alerts(status);
CREATE INDEX IF NOT EXISTS idx_admin_alerts_severity ON public.admin_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_admin_alerts_source ON public.admin_alerts(source_service);
CREATE INDEX IF NOT EXISTS idx_admin_alerts_fingerprint ON public.admin_alerts(incident_fingerprint);
CREATE INDEX IF NOT EXISTS idx_admin_alerts_created_at ON public.admin_alerts(created_at DESC);

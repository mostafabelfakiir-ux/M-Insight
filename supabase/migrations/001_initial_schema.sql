-- M-Insight Initial Schema
-- Run this in Supabase SQL Editor or via: supabase db push

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Clients
CREATE TABLE IF NOT EXISTS clients (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  email       TEXT,
  company     TEXT,
  avatar_url  TEXT,
  total_paid  NUMERIC(10,2) DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Finances
CREATE TABLE IF NOT EXISTS finances (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id   UUID REFERENCES clients(id) ON DELETE SET NULL,
  type        TEXT CHECK (type IN ('income', 'expense', 'ads')) NOT NULL,
  category    TEXT,
  amount      NUMERIC(10,2) NOT NULL,
  description TEXT,
  date        DATE NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Tasks
CREATE TABLE IF NOT EXISTS tasks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id   UUID REFERENCES clients(id) ON DELETE SET NULL,
  title       TEXT NOT NULL,
  description TEXT,
  status      TEXT CHECK (status IN ('todo','in_progress','review','done')) DEFAULT 'todo',
  priority    TEXT CHECK (priority IN ('low','medium','high','urgent')) DEFAULT 'medium',
  deadline    DATE,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Milestone Vault
CREATE TABLE IF NOT EXISTS milestones (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id   UUID REFERENCES clients(id) ON DELETE SET NULL,
  image_url   TEXT NOT NULL,
  category    TEXT CHECK (category IN ('client_feedback','revenue_proof','prompt_result','case_study')) NOT NULL,
  title       TEXT NOT NULL,
  description TEXT,
  amount      NUMERIC(10,2),
  is_featured BOOLEAN DEFAULT false,
  date        DATE NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_finances_user_date    ON finances(user_id, date);
CREATE INDEX IF NOT EXISTS idx_tasks_user_status     ON tasks(user_id, status, deadline);
CREATE INDEX IF NOT EXISTS idx_milestones_user_cat   ON milestones(user_id, category, is_featured);

-- Finance summary view (ROI computed)
CREATE OR REPLACE VIEW finance_summary AS
SELECT
  user_id,
  SUM(CASE WHEN type = 'income'               THEN amount ELSE 0 END) AS total_income,
  SUM(CASE WHEN type = 'expense'              THEN amount ELSE 0 END) AS total_expenses,
  SUM(CASE WHEN type = 'ads'                  THEN amount ELSE 0 END) AS ads_spend,
  SUM(CASE WHEN type = 'income'               THEN amount ELSE 0 END) -
  SUM(CASE WHEN type IN ('expense','ads')     THEN amount ELSE 0 END) AS net_profit,
  ROUND(
    (SUM(CASE WHEN type='income' THEN amount ELSE 0 END) -
     SUM(CASE WHEN type='ads'    THEN amount ELSE 0 END)) /
    NULLIF(SUM(CASE WHEN type='ads' THEN amount ELSE 0 END), 0) * 100, 2
  ) AS roi_percent
FROM finances
GROUP BY user_id;

-- RLS Policies (enable Row Level Security)
ALTER TABLE clients   ENABLE ROW LEVEL SECURITY;
ALTER TABLE finances  ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks     ENABLE ROW LEVEL SECURITY;
ALTER TABLE milestones ENABLE ROW LEVEL SECURITY;

-- Each user can only see their own rows
CREATE POLICY "own_clients"    ON clients    FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own_finances"   ON finances   FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own_tasks"      ON tasks      FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own_milestones" ON milestones FOR ALL USING (auth.uid() = user_id);

-- ============================================================
--  KD Scion Analytics — PostgreSQL Schema
-- ============================================================
--  Run this once on your Railway PostgreSQL database.
--  Railway dashboard → your Postgres service → Query tab → paste & run.
-- ============================================================


-- ── Raw events table ─────────────────────────────────────────────────────────
-- Every event fired by analytics.js lands here first.
-- The `properties` column is JSONB — stores event-specific data
-- (e.g. fabric_id, scroll_depth, time_on_page) without fixed columns.

CREATE TABLE IF NOT EXISTS analytics_events (
  id             BIGSERIAL PRIMARY KEY,
  session_id     UUID         NOT NULL,
  visitor_id     UUID,
  is_returning   BOOLEAN      DEFAULT FALSE,
  event_type     VARCHAR(60)  NOT NULL,          -- 'page_view', 'fabric_clicked', etc.
  page_url       TEXT,
  page_title     TEXT,
  properties     JSONB        DEFAULT '{}',      -- event-specific payload

  -- Geography (resolved from IP server-side, raw IP is never stored)
  country        VARCHAR(80),
  country_code   CHAR(2),
  city           VARCHAR(100),
  timezone       VARCHAR(60),

  -- Traffic source
  referrer       TEXT,
  referrer_type  VARCHAR(20),                    -- 'direct','social','search','email','referral'
  utm_source     VARCHAR(100),
  utm_medium     VARCHAR(100),
  utm_campaign   VARCHAR(100),

  -- Device
  device_type    VARCHAR(20),                    -- 'mobile','tablet','desktop'
  browser        VARCHAR(40),
  os             VARCHAR(40),
  language       VARCHAR(10),
  screen_width   SMALLINT,
  connection     VARCHAR(20),                    -- '4g','3g','2g','slow-2g','wifi'

  created_at     TIMESTAMPTZ  DEFAULT NOW()
);

-- Indexes for common dashboard query patterns
CREATE INDEX IF NOT EXISTS idx_ae_created_at    ON analytics_events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ae_event_type    ON analytics_events (event_type);
CREATE INDEX IF NOT EXISTS idx_ae_session_id    ON analytics_events (session_id);
CREATE INDEX IF NOT EXISTS idx_ae_country_code  ON analytics_events (country_code);
CREATE INDEX IF NOT EXISTS idx_ae_page_url      ON analytics_events (page_url);
CREATE INDEX IF NOT EXISTS idx_ae_properties    ON analytics_events USING GIN (properties);


-- ── Sessions table ────────────────────────────────────────────────────────────
-- One row per browsing session.  The backend upserts this on every event.
-- Pre-aggregated so dashboard queries don't need to GROUP BY across millions of rows.

CREATE TABLE IF NOT EXISTS analytics_sessions (
  session_id     UUID         PRIMARY KEY,
  visitor_id     UUID,
  is_returning   BOOLEAN      DEFAULT FALSE,

  -- Geography
  country        VARCHAR(80),
  country_code   CHAR(2),
  city           VARCHAR(100),
  timezone       VARCHAR(60),

  -- Source
  referrer_type  VARCHAR(20),
  utm_source     VARCHAR(100),
  utm_campaign   VARCHAR(100),

  -- Device
  device_type    VARCHAR(20),
  browser        VARCHAR(40),
  os             VARCHAR(40),
  language       VARCHAR(10),

  -- Session metrics (updated on each event)
  page_count     SMALLINT     DEFAULT 0,
  event_count    SMALLINT     DEFAULT 0,
  first_page     TEXT,
  last_page      TEXT,
  duration_secs  INTEGER,                        -- set on page_exit event

  started_at     TIMESTAMPTZ  DEFAULT NOW(),
  updated_at     TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_as_started_at   ON analytics_sessions (started_at DESC);
CREATE INDEX IF NOT EXISTS idx_as_country_code ON analytics_sessions (country_code);
CREATE INDEX IF NOT EXISTS idx_as_device_type  ON analytics_sessions (device_type);


-- ── Daily summary table ───────────────────────────────────────────────────────
-- Pre-computed rollup refreshed nightly by the backend.
-- The dashboard Traffic tab reads ONLY this table for speed —
-- no full-scan of analytics_events needed.

CREATE TABLE IF NOT EXISTS analytics_daily (
  date           DATE         NOT NULL,
  country_code   CHAR(2)      NOT NULL DEFAULT '',
  device_type    VARCHAR(20)  NOT NULL DEFAULT '',
  page_url       TEXT         NOT NULL DEFAULT '',

  sessions       INTEGER      DEFAULT 0,
  unique_visitors INTEGER     DEFAULT 0,
  page_views     INTEGER      DEFAULT 0,
  fabric_clicks  INTEGER      DEFAULT 0,
  add_to_carts   INTEGER      DEFAULT 0,
  avg_duration   NUMERIC(8,1),                   -- average session duration (seconds)

  PRIMARY KEY (date, country_code, device_type, page_url)
);

CREATE INDEX IF NOT EXISTS idx_ad_date ON analytics_daily (date DESC);


-- ── Helpful views for the dashboard ──────────────────────────────────────────

-- Sessions in last 30 days by country
CREATE OR REPLACE VIEW v_sessions_by_country AS
SELECT
  country_code,
  country,
  COUNT(*)                             AS sessions,
  COUNT(*) FILTER (WHERE NOT is_returning) AS new_sessions,
  COUNT(*) FILTER (WHERE is_returning)     AS returning_sessions
FROM analytics_sessions
WHERE started_at >= NOW() - INTERVAL '30 days'
  AND country_code IS NOT NULL
GROUP BY country_code, country
ORDER BY sessions DESC;

-- Top pages last 30 days
CREATE OR REPLACE VIEW v_top_pages AS
SELECT
  page_url,
  COUNT(*)  AS views,
  COUNT(DISTINCT session_id) AS unique_sessions
FROM analytics_events
WHERE event_type = 'page_view'
  AND created_at >= NOW() - INTERVAL '30 days'
GROUP BY page_url
ORDER BY views DESC
LIMIT 20;

-- Top fabric selections last 30 days
CREATE OR REPLACE VIEW v_top_fabrics AS
SELECT
  properties->>'fabric_id'   AS fabric_id,
  properties->>'fabric_type' AS fabric_type,
  COUNT(*)                   AS clicks
FROM analytics_events
WHERE event_type = 'fabric_clicked'
  AND created_at >= NOW() - INTERVAL '30 days'
GROUP BY properties->>'fabric_id', properties->>'fabric_type'
ORDER BY clicks DESC
LIMIT 20;

-- Traffic sources last 30 days
CREATE OR REPLACE VIEW v_traffic_sources AS
SELECT
  referrer_type,
  utm_source,
  COUNT(*) AS sessions
FROM analytics_sessions
WHERE started_at >= NOW() - INTERVAL '30 days'
GROUP BY referrer_type, utm_source
ORDER BY sessions DESC;

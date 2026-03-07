-- ══════════════════════════════════════════════════════
-- MATURITY ASSESSMENT — SUPABASE SCHEMA
-- Run this in your Supabase SQL Editor
-- ══════════════════════════════════════════════════════

-- Session summary table (one row per completed assessment)
CREATE TABLE assessment_sessions (
  id                  BIGSERIAL PRIMARY KEY,
  session_id          TEXT UNIQUE NOT NULL,
  age_group           TEXT NOT NULL CHECK (age_group IN ('under25', 'over25')),
  avg_ai_score        NUMERIC(4,2),
  avg_self_score      NUMERIC(4,2),
  awareness_gap       NUMERIC(4,2),
  awareness_pattern   TEXT,
  category_identity   NUMERIC(4,2),
  category_relational NUMERIC(4,2),
  category_trauma     NUMERIC(4,2),
  category_cognitive  NUMERIC(4,2),
  category_generativity NUMERIC(4,2),
  narrative           TEXT,
  awareness_insight   TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Individual response table (one row per question per session)
CREATE TABLE assessment_responses (
  id            BIGSERIAL PRIMARY KEY,
  session_id    TEXT NOT NULL REFERENCES assessment_sessions(session_id),
  question_id   TEXT NOT NULL,
  category      TEXT NOT NULL,
  question_text TEXT NOT NULL,
  response_text TEXT,
  skipped       BOOLEAN DEFAULT FALSE,
  self_score    INTEGER CHECK (self_score BETWEEN 1 AND 4),
  ai_score      INTEGER CHECK (ai_score BETWEEN 0 AND 4),
  score_note    TEXT,
  score_gap     INTEGER,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Useful indexes for analytics
CREATE INDEX idx_sessions_age_group ON assessment_sessions(age_group);
CREATE INDEX idx_sessions_created ON assessment_sessions(created_at);
CREATE INDEX idx_responses_session ON assessment_responses(session_id);
CREATE INDEX idx_responses_category ON assessment_responses(category);
CREATE INDEX idx_responses_question ON assessment_responses(question_id);

-- ══════════════════════════════════════════════════════
-- USEFUL ANALYTICS QUERIES (save these for later)
-- ══════════════════════════════════════════════════════

-- Average scores by age group
-- SELECT age_group, AVG(avg_ai_score), AVG(awareness_gap), COUNT(*) FROM assessment_sessions GROUP BY age_group;

-- Category averages across all sessions
-- SELECT age_group, AVG(category_identity), AVG(category_relational), AVG(category_trauma), AVG(category_cognitive), AVG(category_generativity) FROM assessment_sessions GROUP BY age_group;

-- Most frequently skipped questions
-- SELECT question_id, COUNT(*) as skip_count FROM assessment_responses WHERE skipped = TRUE GROUP BY question_id ORDER BY skip_count DESC;

-- Self-awareness pattern distribution
-- SELECT awareness_pattern, COUNT(*), AVG(awareness_gap) FROM assessment_sessions GROUP BY awareness_pattern;

-- Score gap distribution per category
-- SELECT category, AVG(score_gap), STDDEV(score_gap) FROM assessment_responses WHERE score_gap IS NOT NULL GROUP BY category;

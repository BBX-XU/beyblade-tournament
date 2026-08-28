-- Beyblade X Tournament System - Initial Schema
-- PostgreSQL with Drizzle ORM

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tournaments table
CREATE TABLE IF NOT EXISTS tournaments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  format VARCHAR(30) NOT NULL DEFAULT 'single_elimination',
  max_players INTEGER NOT NULL DEFAULT 32,
  win_score INTEGER NOT NULL DEFAULT 3,
  swiss_rounds INTEGER DEFAULT 0,
  tournament_date DATE,
  location VARCHAR(200),
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  signup_status VARCHAR(20) NOT NULL DEFAULT 'closed',
  settings JSONB,
  admin_key VARCHAR(255),
  _created_at TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  _created_by VARCHAR,
  _updated_at TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  _updated_by VARCHAR
);

CREATE INDEX IF NOT EXISTS idx_tournaments_status ON tournaments(status);
CREATE INDEX IF NOT EXISTS idx_tournaments_created_at ON tournaments(_created_at DESC);

-- Players table
CREATE TABLE IF NOT EXISTS players (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  bey VARCHAR(100),
  seed INTEGER,
  _created_at TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  _created_by VARCHAR,
  _updated_at TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  _updated_by VARCHAR
);

CREATE INDEX IF NOT EXISTS idx_players_tournament_id ON players(tournament_id);

-- Matches table
CREATE TABLE IF NOT EXISTS matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  round VARCHAR(50) NOT NULL,
  match_index INTEGER NOT NULL DEFAULT 0,
  player1_id UUID REFERENCES players(id) ON DELETE SET NULL,
  player2_id UUID REFERENCES players(id) ON DELETE SET NULL,
  score1 INTEGER DEFAULT 0,
  score2 INTEGER DEFAULT 0,
  winner_id UUID REFERENCES players(id) ON DELETE SET NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  bracket VARCHAR(20) DEFAULT 'main',
  _created_at TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  _created_by VARCHAR,
  _updated_at TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  _updated_by VARCHAR
);

CREATE INDEX IF NOT EXISTS idx_matches_tournament_id ON matches(tournament_id);
CREATE INDEX IF NOT EXISTS idx_matches_round ON matches(tournament_id, round);
CREATE UNIQUE INDEX IF NOT EXISTS idx_matches_tournament_round_matchindex_bracket_unique
  ON matches(tournament_id, round, match_index, bracket);

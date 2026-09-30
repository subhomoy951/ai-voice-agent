CREATE TABLE IF NOT EXISTS leads (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    phone VARCHAR(30) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS calls (
    id BIGSERIAL PRIMARY KEY,
    lead_id BIGINT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'queued'
        CHECK (status IN ('queued', 'in_progress', 'completed', 'failed')),
    outcome VARCHAR(30),
    summary TEXT,
    started_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS call_messages (
    id BIGSERIAL PRIMARY KEY,
    call_id BIGINT NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
    speaker VARCHAR(20) NOT NULL
        CHECK (speaker IN ('ai', 'customer', 'system')),
    message TEXT NOT NULL,
    spoken_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS calls_lead_id_index
    ON calls (lead_id);

CREATE INDEX IF NOT EXISTS call_messages_call_id_spoken_at_index
    ON call_messages (call_id, spoken_at);

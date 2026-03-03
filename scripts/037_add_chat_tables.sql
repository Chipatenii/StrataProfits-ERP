-- ============================================================================
-- 037_add_chat_tables.sql
-- Real-Time Internal Chat: Channels, Messages, Membership
-- ============================================================================

-- Channels (team channels + DMs)
CREATE TABLE IF NOT EXISTS chat_channels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    is_dm BOOLEAN NOT NULL DEFAULT false,      -- true for direct message threads
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Channel membership
CREATE TABLE IF NOT EXISTS chat_channel_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id UUID NOT NULL REFERENCES chat_channels(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_read_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (channel_id, user_id)
);

-- Messages
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id UUID NOT NULL REFERENCES chat_channels(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    reply_to UUID REFERENCES chat_messages(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_chat_messages_channel ON chat_messages(channel_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_members_user ON chat_channel_members(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_members_channel ON chat_channel_members(channel_id);

-- ── RLS ──────────────────────────────────────────────────────────────

ALTER TABLE chat_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_channel_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Channels: users see channels they are members of
CREATE POLICY "Users can view channels they belong to"
    ON chat_channels FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM chat_channel_members WHERE channel_id = chat_channels.id AND user_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Any authenticated user can create a channel
CREATE POLICY "Authenticated users can create channels"
    ON chat_channels FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- Membership: users see their own memberships
CREATE POLICY "Users can view channel members"
    ON chat_channel_members FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM chat_channel_members AS cm WHERE cm.channel_id = chat_channel_members.channel_id AND cm.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can join channels"
    ON chat_channel_members FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own membership"
    ON chat_channel_members FOR UPDATE
    USING (user_id = auth.uid());

-- Messages: users see messages in channels they belong to
CREATE POLICY "Users can view messages in their channels"
    ON chat_messages FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM chat_channel_members WHERE channel_id = chat_messages.channel_id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can send messages to their channels"
    ON chat_messages FOR INSERT
    WITH CHECK (
        sender_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM chat_channel_members WHERE channel_id = chat_messages.channel_id AND user_id = auth.uid()
        )
    );

-- ── Seed a #general channel ─────────────────────────────────────────
INSERT INTO chat_channels (name, description, is_dm)
VALUES ('general', 'Company-wide announcements and discussion', false)
ON CONFLICT DO NOTHING;

-- Enable Realtime for chat_messages
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;

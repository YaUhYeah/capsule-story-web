-- Database Schema for Capsule Story Website

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users Table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    display_name VARCHAR(100),
    avatar_url VARCHAR(255),
    role VARCHAR(20) DEFAULT 'user',
    reputation INTEGER DEFAULT 0,
    join_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,
    verification_token UUID,
    reset_password_token UUID,
    reset_token_expires TIMESTAMP WITH TIME ZONE
);

-- User Settings Table
CREATE TABLE user_settings (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    show_online_status BOOLEAN DEFAULT true,
    show_game_progress BOOLEAN DEFAULT true,
    show_inventory BOOLEAN DEFAULT true,
    email_notifications BOOLEAN DEFAULT true,
    forum_notifications BOOLEAN DEFAULT true,
    achievement_notifications BOOLEAN DEFAULT true,
    theme VARCHAR(20) DEFAULT 'light',
    language VARCHAR(10) DEFAULT 'en'
);

-- Game Progress Table
CREATE TABLE game_progress (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    play_time INTEGER DEFAULT 0,
    monsters_tamed INTEGER DEFAULT 0,
    items_crafted INTEGER DEFAULT 0,
    structures_built INTEGER DEFAULT 0,
    last_sync TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    game_version VARCHAR(20),
    save_data JSONB
);

-- Achievements Table
CREATE TABLE achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    icon_url VARCHAR(255),
    points INTEGER DEFAULT 0,
    category VARCHAR(50),
    requirements JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- User Achievements Table
CREATE TABLE user_achievements (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    achievement_id UUID REFERENCES achievements(id) ON DELETE CASCADE,
    unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, achievement_id)
);

-- Inventory Items Table
CREATE TABLE inventory_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    icon_url VARCHAR(255),
    category VARCHAR(50),
    properties JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- User Inventory Table
CREATE TABLE user_inventory (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    item_id UUID REFERENCES inventory_items(id) ON DELETE CASCADE,
    quantity INTEGER DEFAULT 1,
    is_equipped BOOLEAN DEFAULT false,
    acquired_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, item_id)
);

-- Game Releases Table
CREATE TABLE game_releases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    version VARCHAR(20) NOT NULL,
    platform VARCHAR(20) NOT NULL,
    release_type VARCHAR(20) DEFAULT 'stable',
    release_notes TEXT,
    file_url VARCHAR(255) NOT NULL,
    file_size BIGINT NOT NULL,
    md5_hash VARCHAR(32) NOT NULL,
    sha256_hash VARCHAR(64) NOT NULL,
    downloads INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    published_at TIMESTAMP WITH TIME ZONE,
    published_by UUID REFERENCES users(id)
);

-- Download History Table
CREATE TABLE download_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    release_id UUID REFERENCES game_releases(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    ip_address INET,
    user_agent TEXT,
    downloaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Forum Categories Table
CREATE TABLE forum_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    slug VARCHAR(100) UNIQUE NOT NULL,
    icon_url VARCHAR(255),
    display_order INTEGER DEFAULT 0,
    parent_id UUID REFERENCES forum_categories(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true
);

-- Forum Topics Table
CREATE TABLE forum_topics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID REFERENCES forum_categories(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    title VARCHAR(200) NOT NULL,
    slug VARCHAR(200) UNIQUE NOT NULL,
    content TEXT NOT NULL,
    views INTEGER DEFAULT 0,
    is_pinned BOOLEAN DEFAULT false,
    is_locked BOOLEAN DEFAULT false,
    last_post_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Forum Posts Table
CREATE TABLE forum_posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    topic_id UUID REFERENCES forum_topics(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    is_solution BOOLEAN DEFAULT false,
    parent_id UUID REFERENCES forum_posts(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Wiki Pages Table
CREATE TABLE wiki_pages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(200) NOT NULL,
    slug VARCHAR(200) UNIQUE NOT NULL,
    content TEXT NOT NULL,
    views INTEGER DEFAULT 0,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Wiki Revisions Table
CREATE TABLE wiki_revisions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    page_id UUID REFERENCES wiki_pages(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    edit_summary TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Activity Log Table
CREATE TABLE activity_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    activity_type VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50),
    entity_id UUID,
    description TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_game_releases_version ON game_releases(version);
CREATE INDEX idx_game_releases_platform ON game_releases(platform);
CREATE INDEX idx_forum_topics_category ON forum_topics(category_id);
CREATE INDEX idx_forum_posts_topic ON forum_posts(topic_id);
CREATE INDEX idx_wiki_pages_slug ON wiki_pages(slug);
CREATE INDEX idx_activity_log_user ON activity_log(user_id);
CREATE INDEX idx_activity_log_type ON activity_log(activity_type);

-- Create views for common queries
CREATE VIEW active_users_view AS
SELECT u.id, u.username, u.display_name, u.avatar_url, u.role,
       COUNT(DISTINCT fp.id) as forum_posts,
       COUNT(DISTINCT wr.id) as wiki_revisions
FROM users u
LEFT JOIN forum_posts fp ON u.id = fp.user_id
LEFT JOIN wiki_revisions wr ON u.id = wr.user_id
WHERE u.is_active = true
GROUP BY u.id;

CREATE VIEW latest_releases_view AS
SELECT platform, 
       version,
       release_type,
       downloads,
       published_at
FROM game_releases
WHERE is_active = true
ORDER BY published_at DESC;

-- Create functions for common operations
CREATE OR REPLACE FUNCTION increment_download_count(release_uuid UUID)
RETURNS void AS $$
BEGIN
    UPDATE game_releases
    SET downloads = downloads + 1
    WHERE id = release_uuid;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION calculate_user_reputation(user_uuid UUID)
RETURNS integer AS $$
DECLARE
    total_reputation integer;
BEGIN
    SELECT COALESCE(
        (SELECT COUNT(*) * 10 FROM forum_posts WHERE user_id = user_uuid) +
        (SELECT COUNT(*) * 5 FROM wiki_revisions WHERE user_id = user_uuid) +
        (SELECT COUNT(*) * 20 FROM user_achievements WHERE user_id = user_uuid),
        0
    ) INTO total_reputation;
    
    UPDATE users SET reputation = total_reputation WHERE id = user_uuid;
    RETURN total_reputation;
END;
$$ LANGUAGE plpgsql;
-- ECG Assets Database Migration Script
-- Generated from public/asset-store/assets-database.json
-- Execute this file on EC2 instance that can access RDS

-- Drop table if exists (for clean migration)
-- DROP TABLE IF EXISTS assets CASCADE;

-- Create assets table
CREATE TABLE IF NOT EXISTS assets (
    id VARCHAR(50) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    description TEXT,
    plugin_key VARCHAR(255) NOT NULL,
    thumbnail_path VARCHAR(500),
    icon_name VARCHAR(100),
    author_id VARCHAR(100),
    author_name VARCHAR(255),
    is_pro BOOLEAN DEFAULT FALSE,
    price DECIMAL(10,2) DEFAULT 0,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    downloads INTEGER DEFAULT 0,
    likes INTEGER DEFAULT 0,
    usage_count INTEGER DEFAULT 0,
    tags JSONB,
    is_favorite BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    created_at_db TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at_db TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_assets_category ON assets(category);
CREATE INDEX IF NOT EXISTS idx_assets_author_id ON assets(author_id);
CREATE INDEX IF NOT EXISTS idx_assets_rating ON assets(rating);
CREATE INDEX IF NOT EXISTS idx_assets_downloads ON assets(downloads);
CREATE INDEX IF NOT EXISTS idx_assets_tags ON assets USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_assets_is_pro ON assets(is_pro);
CREATE INDEX IF NOT EXISTS idx_assets_plugin_key ON assets(plugin_key);

-- Insert all assets data with conflict resolution
INSERT INTO assets (
    id, title, category, description, plugin_key, thumbnail_path, icon_name,
    author_id, author_name, is_pro, price, rating, downloads, likes, usage_count,
    tags, is_favorite, created_at, updated_at
) VALUES
('1', 'Rotation Text', 'Dynamic', '글자들이 회전하면서 나타나는 클래식한 애니메이션 효과입니다.', 'rotation@2.0.0', 'assets/thumbnail.svg', 'IoRefresh', 'ecg-team', 'ECG Team', false, 0, 5, 1243, 892, 2156, '["text", "rotation", "spin", "classic", "gsap", "animation"]', true, '2024-01-15T08:30:00Z', '2024-02-01T14:22:00Z'),
('2', 'TypeWriter Effect', 'Smooth', '타자기처럼 글자가 하나씩 나타나는 부드러운 타이핑 애니메이션입니다.', 'typewriter@2.0.0', 'assets/thumbnail.svg', 'IoDocument', 'ecg-team', 'ECG Team', false, 0, 4, 856, 654, 1423, '["text", "typing", "typewriter", "sequential", "gsap", "animation"]', false, '2024-01-20T10:15:00Z', '2024-02-05T09:45:00Z'),
('3', 'Elastic Bounce', 'Dynamic', '탄성있게 튕기면서 나타나는 역동적인 바운스 애니메이션 효과입니다.', 'elastic@2.0.0', 'assets/thumbnail.svg', 'IoChevronUp', 'ecg-team', 'ECG Team', false, 0, 5, 2341, 1456, 3789, '["text", "bounce", "elastic", "spring", "gsap", "animation"]', true, '2024-01-25T16:20:00Z', '2024-02-10T11:30:00Z'),
('4', 'Glitch Effect', 'Unique', '디지털 글리치 효과로 사이버펑크 느낌의 특별한 애니메이션입니다.', 'glitch@2.0.0', 'assets/thumbnail.svg', 'IoFlash', 'ecg-team', 'ECG Team', false, 0, 4, 967, 723, 1834, '["text", "glitch", "digital", "cyberpunk", "gsap", "animation"]', false, '2024-02-01T13:45:00Z', '2024-02-15T08:12:00Z'),
('5', 'Magnetic Pull', 'Unique', '텍스트가 사방으로 흩어졌다가 자석에 끌려 모이듯 나타나는 애니메이션 효과입니다.', 'magnetic@2.0.0', 'assets/thumbnail.svg', 'IoArrowBack', 'ecg-team', 'ECG Team', false, 0, 5, 1589, 1123, 2456, '["text", "magnetic", "pull", "scatter", "gsap", "animation"]', true, '2024-02-05T12:00:00Z', '2024-02-20T15:30:00Z'),
('6', 'Fade In Stagger', 'Smooth', '글자들이 하나씩 순차적으로 서서히 나타나는 클래식한 페이드인 애니메이션 효과입니다.', 'fadein@2.0.0', 'assets/thumbnail.svg', 'IoEye', 'ecg-team', 'ECG Team', false, 0, 5, 1456, 1089, 2234, '["text", "fade", "stagger", "sequential", "gsap", "animation"]', false, '2024-02-08T09:30:00Z', '2024-02-22T14:45:00Z'),
('7', 'Scale Pop', 'Dynamic', '글자들이 작은 크기에서 크게 팝업되며 임팩트 있게 나타나는 애니메이션 효과입니다.', 'scalepop@2.0.0', 'assets/thumbnail.svg', 'IoExpand', 'ecg-team', 'ECG Team', false, 0, 5, 2134, 1567, 3124, '["text", "scale", "pop", "impact", "gsap", "animation"]', false, '2024-02-12T11:15:00Z', '2024-02-25T10:20:00Z'),
('8', 'Slide Up', 'Smooth', '글자들이 아래에서 위로 부드럽게 슬라이딩하며 나타나는 현대적인 애니메이션 효과입니다.', 'slideup@2.0.0', 'assets/thumbnail.svg', 'IoTrendingUp', 'ecg-team', 'ECG Team', false, 0, 5, 2456, 1789, 3567, '["text", "slide", "up", "modern", "gsap", "animation"]', true, '2024-02-15T14:30:00Z', '2024-02-28T16:40:00Z'),
('9', 'CWI Bouncing', 'Dynamic', '화자별로 색상이 적용되며 텍스트가 탄력있게 바운싱하는 CWI 스타일 애니메이션 효과입니다.', 'cwi-bouncing@2.0.0', 'assets/thumbnail.svg', 'IoHappy', 'cwi-team', 'CWI Team', false, 0, 5, 324, 189, 567, '["text", "bounce", "speaker", "color", "cwi"]', false, '2024-09-10T12:00:00Z', '2024-09-10T12:00:00Z'),
('10', 'CWI Color', 'Smooth', '화자별 색상 팔레트를 활용하여 텍스트 색상이 부드럽게 변화하는 CWI 애니메이션 효과입니다.', 'cwi-color@2.0.0', 'assets/thumbnail.svg', 'IoColorPalette', 'cwi-team', 'CWI Team', false, 0, 4, 278, 156, 423, '["text", "color", "speaker", "palette", "cwi"]', false, '2024-09-10T12:00:00Z', '2024-09-10T12:00:00Z'),
('11', 'CWI Loud', 'Dynamic', '큰 소리나 강조가 필요한 텍스트에 진동과 글로우 효과를 적용하는 CWI 애니메이션입니다.', 'cwi-loud@2.0.0', 'assets/thumbnail.svg', 'IoVolumeHigh', 'cwi-team', 'CWI Team', false, 0, 5, 445, 298, 712, '["text", "loud", "tremble", "emphasis", "cwi"]', true, '2024-09-10T12:00:00Z', '2024-09-10T12:00:00Z'),
('12', 'CWI Whisper', 'Smooth', '속삭임이나 부드러운 대화에 적합한 페이드 효과와 투명도 변화의 CWI 애니메이션입니다.', 'cwi-whisper@2.0.0', 'assets/thumbnail.svg', 'IoVolumeLow', 'cwi-team', 'CWI Team', false, 0, 4, 167, 89, 234, '["text", "whisper", "soft", "fade", "cwi"]', false, '2024-09-10T12:00:00Z', '2024-09-10T12:00:00Z'),
('13', 'Bob Y Wave', 'Dynamic', 'Y축으로 물결치는 텍스트 애니메이션으로 리듬감 있는 효과를 제공합니다.', 'bobY@2.0.0', 'assets/thumbnail.svg', 'IoWater', 'ecg-team', 'ECG Team', false, 0, 4, 523, 389, 847, '["text", "wave", "motion", "rhythm", "gsap", "animation"]', false, '2024-03-01T10:00:00Z', '2024-03-15T14:20:00Z'),
('15', 'Flames Effect', 'Unique', '텍스트 주변에 불꽃 효과가 타오르며 강렬한 임팩트를 연출하는 애니메이션입니다.', 'flames@2.0.0', 'assets/thumbnail.svg', 'IoFlame', 'ecg-team', 'ECG Team', false, 0, 5, 798, 645, 1123, '["text", "flame", "fire", "effect", "intense", "gsap"]', true, '2024-03-05T16:30:00Z', '2024-03-20T11:45:00Z'),
('16', 'Flip Type', 'Dynamic', '카드가 뒤집히듯 회전하면서 타이핑되는 독특한 3D 애니메이션 효과입니다.', 'fliptype@2.0.0', 'assets/thumbnail.svg', 'IoSyncCircle', 'ecg-team', 'ECG Team', false, 0, 4, 667, 445, 912, '["text", "flip", "3d", "typing", "card", "animation"]', false, '2024-03-08T13:15:00Z', '2024-03-22T09:30:00Z'),
('17', 'Glow Effect', 'Smooth', '네온사인처럼 부드럽게 빛나는 글로우 효과로 텍스트를 돋보이게 만듭니다.', 'glow@2.0.0', 'assets/thumbnail.svg', 'IoSunny', 'ecg-team', 'ECG Team', false, 0, 5, 1089, 823, 1567, '["text", "glow", "neon", "light", "smooth", "gsap"]', true, '2024-03-12T15:40:00Z', '2024-03-25T12:10:00Z'),
('18', 'Pulse Beat', 'Dynamic', '심장박동처럼 리드미컬하게 크기가 변하며 생동감을 표현하는 펄스 애니메이션입니다.', 'pulse@2.0.0', 'assets/thumbnail.svg', 'IoHeart', 'ecg-team', 'ECG Team', false, 0, 4, 743, 556, 1034, '["text", "pulse", "beat", "heart", "scale", "gsap"]', false, '2024-03-15T11:25:00Z', '2024-03-28T16:55:00Z'),
('19', 'Spin Rotation', 'Dynamic', '텍스트가 매끄럽게 360도 회전하며 역동적인 움직임을 연출하는 애니메이션입니다.', 'spin@2.0.0', 'assets/thumbnail.svg', 'IoSync', 'ecg-team', 'ECG Team', false, 0, 4, 892, 634, 1245, '["text", "spin", "rotate", "360", "dynamic", "gsap"]', false, '2024-03-18T14:10:00Z', '2024-03-30T10:40:00Z')
ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    category = EXCLUDED.category,
    description = EXCLUDED.description,
    plugin_key = EXCLUDED.plugin_key,
    thumbnail_path = EXCLUDED.thumbnail_path,
    icon_name = EXCLUDED.icon_name,
    author_id = EXCLUDED.author_id,
    author_name = EXCLUDED.author_name,
    is_pro = EXCLUDED.is_pro,
    price = EXCLUDED.price,
    rating = EXCLUDED.rating,
    downloads = EXCLUDED.downloads,
    likes = EXCLUDED.likes,
    usage_count = EXCLUDED.usage_count,
    tags = EXCLUDED.tags,
    is_favorite = EXCLUDED.is_favorite,
    created_at = EXCLUDED.created_at,
    updated_at = EXCLUDED.updated_at,
    updated_at_db = CURRENT_TIMESTAMP;

-- Create or replace function for auto-updating timestamp
CREATE OR REPLACE FUNCTION update_updated_at_db_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at_db = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS update_assets_updated_at_db ON assets;

-- Create trigger for auto-updating timestamp
CREATE TRIGGER update_assets_updated_at_db
    BEFORE UPDATE ON assets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_db_column();

-- Verification queries
SELECT 'Migration completed successfully!' AS status;
SELECT COUNT(*) as total_assets FROM assets;
SELECT category, COUNT(*) as count FROM assets GROUP BY category ORDER BY count DESC;
SELECT 'Sample data:' AS info;
SELECT id, title, category, rating, downloads FROM assets ORDER BY downloads DESC LIMIT 5;
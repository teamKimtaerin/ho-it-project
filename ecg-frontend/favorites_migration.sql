-- 사용자 즐겨찾기 테이블 생성 마이그레이션
-- ECG Frontend - User Favorites Feature
-- Created: 2025-01-24

-- 1. 사용자 즐겨찾기 테이블 생성
CREATE TABLE IF NOT EXISTS user_favorites (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  plugin_key VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- 제약조건: 사용자당 플러그인별 중복 즐겨찾기 방지
  CONSTRAINT unique_user_plugin UNIQUE(user_id, plugin_key),

  -- 외래키: users 테이블 참조 (CASCADE 삭제)
  CONSTRAINT fk_user_favorites_user_id
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 2. 인덱스 생성 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_user_favorites_user_id ON user_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_user_favorites_plugin_key ON user_favorites(plugin_key);
CREATE INDEX IF NOT EXISTS idx_user_favorites_created_at ON user_favorites(created_at DESC);

-- 3. updated_at 자동 업데이트 트리거 함수 생성
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 4. updated_at 트리거 생성
DROP TRIGGER IF EXISTS update_user_favorites_updated_at ON user_favorites;
CREATE TRIGGER update_user_favorites_updated_at
    BEFORE UPDATE ON user_favorites
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 5. 테이블 코멘트 추가
COMMENT ON TABLE user_favorites IS '사용자 즐겨찾기 에셋 목록';
COMMENT ON COLUMN user_favorites.id IS '즐겨찾기 고유 ID';
COMMENT ON COLUMN user_favorites.user_id IS '사용자 ID (users 테이블 참조)';
COMMENT ON COLUMN user_favorites.plugin_key IS '플러그인 키 (에셋 식별자)';
COMMENT ON COLUMN user_favorites.created_at IS '즐겨찾기 추가 시각';
COMMENT ON COLUMN user_favorites.updated_at IS '마지막 수정 시각';

-- 6. 마이그레이션 검증 쿼리
DO $$
BEGIN
    -- 테이블 존재 확인
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_favorites') THEN
        RAISE NOTICE '✅ user_favorites 테이블이 성공적으로 생성되었습니다.';
    ELSE
        RAISE EXCEPTION '❌ user_favorites 테이블 생성에 실패했습니다.';
    END IF;

    -- 인덱스 존재 확인
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'user_favorites' AND indexname = 'idx_user_favorites_user_id') THEN
        RAISE NOTICE '✅ 사용자 ID 인덱스가 생성되었습니다.';
    END IF;

    -- 제약조건 확인
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints
               WHERE table_name = 'user_favorites' AND constraint_name = 'unique_user_plugin') THEN
        RAISE NOTICE '✅ 중복 방지 제약조건이 설정되었습니다.';
    END IF;
END $$;

-- 7. 샘플 데이터 (선택사항 - 개발/테스트용)
-- INSERT INTO user_favorites (user_id, plugin_key) VALUES
-- (1, 'elastic@1.0.0'),
-- (1, 'rotation@1.0.0'),
-- (2, 'elastic@1.0.0')
-- ON CONFLICT (user_id, plugin_key) DO NOTHING;

RAISE NOTICE '🎉 사용자 즐겨찾기 마이그레이션이 완료되었습니다!';
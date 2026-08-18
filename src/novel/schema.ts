import type { PGlite } from '@electric-sql/pglite'

/** Create the single-novel schema used inside one workspace PGlite directory. */
export async function initNovelSchema(db: PGlite): Promise<void> {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS novels (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      cover TEXT,
      category TEXT NOT NULL DEFAULT '玄幻',
      writing_style_id TEXT,
      chapter_count INTEGER NOT NULL DEFAULT 0,
      word_count INTEGER NOT NULL DEFAULT 0,
      blueprint_json JSONB NOT NULL DEFAULT '{}'::jsonb,
      outline_draft_md TEXT,
      outline_final_md TEXT,
      outline_status TEXT NOT NULL DEFAULT 'none',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS writing_styles (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      summary TEXT NOT NULL DEFAULT '',
      content TEXT NOT NULL DEFAULT '',
      origin TEXT NOT NULL DEFAULT 'user',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS form_templates (
      id TEXT PRIMARY KEY,
      novel_id TEXT NOT NULL UNIQUE,
      config JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS novel_entities (
      domain TEXT NOT NULL,
      id TEXT PRIMARY KEY,
      name TEXT,
      data JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_novel_entities_domain ON novel_entities (domain);
    CREATE INDEX IF NOT EXISTS idx_novel_entities_name ON novel_entities (domain, name);

    CREATE TABLE IF NOT EXISTS novel_skills (
      id TEXT PRIMARY KEY,
      section TEXT NOT NULL,
      folder TEXT NOT NULL DEFAULT '',
      agent_kind TEXT NOT NULL DEFAULT 'write',
      title TEXT NOT NULL,
      body TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    ALTER TABLE novel_skills ADD COLUMN IF NOT EXISTS folder TEXT NOT NULL DEFAULT '';
    UPDATE novel_skills SET folder = CASE
      WHEN folder <> '' THEN folder
      WHEN agent_kind = 'review' AND section IN ('outline') THEN '审查/大纲'
      WHEN agent_kind = 'review' AND section IN ('chapters', 'chapter') THEN '审查/章节'
      WHEN section = 'overview' THEN '概述'
      WHEN section = 'role' THEN '人物'
      WHEN section = 'creature' THEN '生物'
      WHEN section = 'item' THEN '物品'
      WHEN section = 'level' THEN '等级'
      WHEN section = 'world' THEN '世界'
      WHEN section = 'timeline' THEN '时间线'
      WHEN section = 'outline' THEN '大纲'
      WHEN section IN ('chapter', 'chapters') THEN '章节'
      ELSE '其他'
    END
    WHERE folder = '';


    CREATE TABLE IF NOT EXISTS novel_chapter_change_batches (
      id TEXT PRIMARY KEY,
      chapter_id TEXT NOT NULL,
      summary TEXT NOT NULL DEFAULT '',
      ops_json JSONB NOT NULL DEFAULT '[]'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      rolled_back_at TIMESTAMPTZ
    );
  `)
  await db.exec(`
    DELETE FROM novel_skills WHERE folder = '题材' OR folder LIKE '题材/%'
  `)
}

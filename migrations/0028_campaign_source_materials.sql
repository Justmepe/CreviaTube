-- Campaign source materials — what the creator gives clippers to
-- actually do the work. Until now the campaign creation form only
-- captured name/description/budget/duration/platforms/minFollowers
-- — clippers had no source video, no brand guidelines, no example
-- clips, no hashtag list. They had nothing to clip FROM and no idea
-- what good looked like.
--
-- All columns nullable so existing rows don't break. The creation
-- form treats them as recommended-but-not-required for v1; we can
-- tighten to required later once every active campaign has them.

ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS source_content_url TEXT,
  ADD COLUMN IF NOT EXISTS brand_guidelines TEXT,
  ADD COLUMN IF NOT EXISTS example_clip_urls TEXT[],
  ADD COLUMN IF NOT EXISTS required_hashtags TEXT[],
  ADD COLUMN IF NOT EXISTS clip_length_sec_min INTEGER,
  ADD COLUMN IF NOT EXISTS clip_length_sec_max INTEGER;

-- Phase 4 — view-polling snapshot columns on clipper_campaigns.
--
-- For "views" goals we poll the public platform API (YouTube v1, others
-- to follow) at the post_url and record a `view` tracking event with the
-- delta since the last poll. We store the cumulative view count and the
-- last poll timestamp on the clipper_campaign row itself rather than a
-- side table — there's exactly one in-flight post per row, the data is
-- update-only, and a side table would add a join to every progress query.
--
-- Both columns nullable / default sensible:
--   last_view_count     defaults to 0 — first poll's count becomes the
--                        baseline so we don't credit pre-existing views
--                        as if the clipper drove them.
--   last_view_polled_at  null until the first poll lands.

ALTER TABLE clipper_campaigns
  ADD COLUMN IF NOT EXISTS last_view_count     INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_view_polled_at TIMESTAMP;

-- Polling sweeps "all approved rows with a post_url whose campaign goal
-- is views". Index supports the predicate without scanning the full
-- table once we have many rows.
CREATE INDEX IF NOT EXISTS clipper_campaigns_post_url_polling_idx
  ON clipper_campaigns (application_status, post_url)
  WHERE application_status = 'approved' AND post_url IS NOT NULL;

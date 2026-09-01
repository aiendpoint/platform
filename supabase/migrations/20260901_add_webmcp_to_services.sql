-- WebMCP support flag: set at registration/validation time when the site
-- declares meta.webmcp in its /.well-known/ai manifest or the homepage
-- exposes the WebMCP API surface (heuristic).
alter table services add column if not exists webmcp boolean not null default false;

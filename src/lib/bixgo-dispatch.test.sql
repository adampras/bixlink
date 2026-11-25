-- Run against the application database. Division by zero fails any violated rule.
WITH checks(name, passed) AS (VALUES
  ('motor crosses city borders within 5km', public.bixgo_dispatch_matches(0,0,now(),'moto','city-a',0.01,0,'city-b')),
  ('motor excludes pickups beyond 5km', NOT public.bixgo_dispatch_matches(0,0,now(),'moto','city-a',0.054,0,'city-b')),
  ('car crosses city borders within 8km', public.bixgo_dispatch_matches(0,0,now(),'car','city-a',0.054,0,'city-b')),
  ('car excludes pickups beyond 8km', NOT public.bixgo_dispatch_matches(0,0,now(),'car','city-a',0.081,0,'city-b')),
  ('stale driver GPS is rejected', NOT public.bixgo_dispatch_matches(0,0,now()-interval '91 seconds','moto','city-a',0.01,0,'city-b')),
  ('missing driver GPS is rejected', NOT public.bixgo_dispatch_matches(NULL,NULL,NULL,'moto','city-a',0.01,0,'city-a')),
  ('missing pickup GPS falls back to matching city', public.bixgo_dispatch_matches(0,0,now(),'moto','city-a',NULL,NULL,'city-a')),
  ('missing pickup GPS does not expose other cities', NOT public.bixgo_dispatch_matches(0,0,now(),'moto','city-a',NULL,NULL,'city-b'))
)
SELECT name, 1 / CASE WHEN passed THEN 1 ELSE 0 END AS passed FROM checks;
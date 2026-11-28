-- Rollback test: attribution is fixed at insert and cannot be edited afterwards.
DO $$ DECLARE sid uuid; BEGIN
 SELECT id INTO sid FROM public.stakes LIMIT 1;
 UPDATE public.stakes SET attributed_owner1 = NOT attributed_owner1 WHERE id = sid;
 IF (SELECT attributed_owner1 FROM public.stakes WHERE id = sid) THEN RAISE EXCEPTION 'FAIL: attribution editable'; END IF;
 RAISE EXCEPTION 'PASS (rolled back)';
END $$;

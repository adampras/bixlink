CREATE OR REPLACE FUNCTION public.bixcare_guard() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NOT public.bix_is_owner1() THEN
    IF TG_OP='INSERT' THEN NEW.status:='pending'; NEW.review_note:=''; NEW.is_open:=false;
    ELSE
      IF NEW.status IS DISTINCT FROM OLD.status OR NEW.review_note IS DISTINCT FROM OLD.review_note THEN
        IF OLD.status='rejected' AND NEW.status='pending' THEN NEW.review_note:=OLD.review_note;
        ELSE NEW.status:=OLD.status; NEW.review_note:=OLD.review_note; END IF;
      END IF;
      IF NEW.is_open AND NOT OLD.is_open AND current_setting('bixcare.rpc',true) IS DISTINCT FROM '1' THEN NEW.is_open:=false; END IF;
    END IF;
  ELSIF TG_OP='UPDATE' AND NEW.status='approved' AND OLD.status<>'approved' THEN
    NEW.is_open := true;
  END IF;
  IF NEW.status<>'approved' THEN NEW.is_open:=false; END IF;
  RETURN NEW;
END $$;
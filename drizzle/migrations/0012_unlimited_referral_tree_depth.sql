CREATE OR REPLACE FUNCTION public.bix_referral_tree()
RETURNS TABLE(user_id uuid, parent_id uuid, depth integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  WITH RECURSIVE tree AS (
    SELECT r.user_id, r.referred_by, 1 AS depth, ARRAY[r.user_id] AS path
    FROM public.referral_codes r
    WHERE r.referred_by = auth.uid()
    UNION ALL
    SELECT child.user_id, child.referred_by, t.depth + 1, t.path || child.user_id
    FROM public.referral_codes child
    JOIN tree t ON child.referred_by = t.user_id
    WHERE NOT child.user_id = ANY(t.path)
  )
  SELECT tree.user_id, tree.referred_by, tree.depth
  FROM tree
$function$;

GRANT EXECUTE ON FUNCTION public.bix_referral_tree() TO authenticated;
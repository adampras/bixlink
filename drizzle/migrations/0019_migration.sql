create table public.kyc_submissions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null check (char_length(full_name) between 3 and 120),
  country text not null check (char_length(country) between 2 and 60),
  document_type text not null check (document_type in ('passport','national_id','driver_license')),
  document_last4 text not null check (document_last4 ~ '^[A-Za-z0-9]{4}$'),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.kyc_submissions enable row level security;
grant select, insert, update on public.kyc_submissions to authenticated;
create policy "kyc own read" on public.kyc_submissions for select to authenticated using (auth.uid() = user_id or public.is_bix_admin());
create policy "kyc own insert" on public.kyc_submissions for insert to authenticated with check (auth.uid() = user_id and status = 'pending');
create policy "kyc own resubmit" on public.kyc_submissions for update to authenticated using (auth.uid() = user_id and status <> 'approved') with check (auth.uid() = user_id and status = 'pending');
create policy "kyc admin review" on public.kyc_submissions for update to authenticated using (public.is_bix_admin()) with check (public.is_bix_admin());
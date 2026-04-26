alter table public.vocabulario
add column if not exists thema integer;

create index if not exists idx_vocabulario_thema
on public.vocabulario (thema);

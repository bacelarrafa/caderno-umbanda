-- Destaques e anotações por termo.
-- Se você já rodou o schema.sql antes, rode só este arquivo no SQL Editor.

create table if not exists public.destaques (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.perfis(id) on delete cascade,
  fonte_id uuid not null references public.fontes on delete cascade,
  texto text not null,
  pagina int,
  nota text not null default '',
  termos uuid[] not null default '{}',
  criado_em timestamptz not null default now()
);
create index if not exists destaques_user on public.destaques (user_id, criado_em desc);

create table if not exists public.notas_termo (
  user_id uuid not null default auth.uid() references public.perfis(id) on delete cascade,
  termo_id uuid not null references public.glossario on delete cascade,
  texto text not null default '',
  primary key (user_id, termo_id)
);

alter table public.destaques enable row level security;
alter table public.notas_termo enable row level security;

drop policy if exists "cada um com seus destaques" on public.destaques;
create policy "cada um com seus destaques" on public.destaques for all to authenticated
  using (user_id = auth.uid() and public.meu_papel() is not null) with check (user_id = auth.uid());

drop policy if exists "cada um com suas notas de termo" on public.notas_termo;
create policy "cada um com suas notas de termo" on public.notas_termo for all to authenticated
  using (user_id = auth.uid() and public.meu_papel() is not null) with check (user_id = auth.uid());

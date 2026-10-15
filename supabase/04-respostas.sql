-- Respostas da casa: o que você já sabe ou confirmou com as dirigentes.
-- Alimentam as próximas versões de estudo e aparecem nas fichas.
create table if not exists public.respostas (
  id uuid primary key default gen_random_uuid(),
  fonte_id uuid references public.fontes on delete set null,
  pergunta text not null,
  resposta text not null,
  termos uuid[] not null default '{}',
  criado_por uuid default auth.uid() references public.perfis(id) on delete set null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index if not exists respostas_fonte on public.respostas (fonte_id);

alter table public.respostas enable row level security;
drop policy if exists "aprovados veem respostas" on public.respostas;
create policy "aprovados veem respostas" on public.respostas for select to authenticated
  using (public.meu_papel() is not null);
drop policy if exists "editores gerenciam respostas" on public.respostas;
create policy "editores gerenciam respostas" on public.respostas for all to authenticated
  using (public.pode_editar()) with check (public.pode_editar());

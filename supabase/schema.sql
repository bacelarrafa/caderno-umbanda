-- Caderno da Umbanda: estrutura do banco no Supabase.
-- Rode este arquivo inteiro uma vez no SQL Editor do projeto.

create extension if not exists vector;

-- ---------- Pessoas ----------
create table public.perfis (
  id uuid primary key references auth.users on delete cascade,
  nome text not null default '',
  email text,
  papel text not null default 'membro' check (papel in ('admin', 'editor', 'membro')),
  aprovado boolean not null default false,
  criado_em timestamptz not null default now()
);

-- A primeira pessoa a se cadastrar vira admin já aprovada.
-- Todas as outras entram como membro aguardando aprovação.
create or replace function public.criar_perfil() returns trigger
language plpgsql security definer set search_path = public as $$
declare primeira boolean;
begin
  select not exists (select 1 from public.perfis) into primeira;
  insert into public.perfis (id, nome, email, papel, aprovado)
  values (new.id, coalesce(new.raw_user_meta_data->>'nome', ''), new.email,
          case when primeira then 'admin' else 'membro' end, primeira);
  return new;
end $$;

create trigger ao_criar_usuario after insert on auth.users
  for each row execute function public.criar_perfil();

-- Papel da pessoa logada, ou nulo se ainda não foi aprovada.
create or replace function public.meu_papel() returns text
language sql stable security definer set search_path = public as $$
  select papel from public.perfis where id = auth.uid() and aprovado
$$;

create or replace function public.pode_editar() returns boolean
language sql stable as $$ select coalesce(public.meu_papel() in ('admin', 'editor'), false) $$;

-- ---------- Conteúdo ----------
create table public.fontes (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('aula', 'leitura')),
  titulo text not null,
  autor text,
  data date,
  texto text not null default '',
  paginas jsonb,
  estudo text,
  visibilidade text not null default 'todos' check (visibilidade in ('todos', 'privada')),
  indexada boolean not null default false,
  criado_por uuid references public.perfis(id) default auth.uid(),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table public.trechos (
  id uuid primary key default gen_random_uuid(),
  fonte_id uuid not null references public.fontes on delete cascade,
  ordem int not null,
  pagina int,
  texto text not null,
  embedding vector(384),
  busca tsvector generated always as (to_tsvector('portuguese', texto)) stored
);
create index trechos_fonte on public.trechos (fonte_id);
create index trechos_busca on public.trechos using gin (busca);

create table public.glossario (
  id uuid primary key default gen_random_uuid(),
  termo text not null unique,
  significado text not null default '',
  variantes text[] not null default '{}',
  atualizado_em timestamptz not null default now()
);

create table public.ignorados (
  palavra text primary key
);

-- ---------- Dados pessoais de cada um ----------
create table public.progresso (
  user_id uuid not null default auth.uid() references public.perfis(id) on delete cascade,
  termo_id uuid not null references public.glossario on delete cascade,
  acertos int not null default 0,
  erros int not null default 0,
  primary key (user_id, termo_id)
);

create table public.notas (
  user_id uuid not null default auth.uid() references public.perfis(id) on delete cascade,
  fonte_id uuid not null references public.fontes on delete cascade,
  texto text not null default '',
  primary key (user_id, fonte_id)
);

-- ---------- Regras de acesso ----------
alter table public.perfis enable row level security;
alter table public.fontes enable row level security;
alter table public.trechos enable row level security;
alter table public.glossario enable row level security;
alter table public.ignorados enable row level security;
alter table public.progresso enable row level security;
alter table public.notas enable row level security;

create policy "ver o próprio perfil ou todos se admin" on public.perfis for select to authenticated
  using (id = auth.uid() or public.meu_papel() = 'admin');
create policy "admin gerencia pessoas" on public.perfis for update to authenticated
  using (public.meu_papel() = 'admin') with check (public.meu_papel() = 'admin');

create policy "aprovados veem conteúdo" on public.fontes for select to authenticated
  using (public.meu_papel() is not null and (visibilidade = 'todos' or criado_por = auth.uid()));
create policy "editores criam" on public.fontes for insert to authenticated
  with check (public.pode_editar() and criado_por = auth.uid());
create policy "editores alteram" on public.fontes for update to authenticated
  using (public.pode_editar() and (visibilidade = 'todos' or criado_por = auth.uid()));
create policy "editores excluem" on public.fontes for delete to authenticated
  using (public.pode_editar() and (visibilidade = 'todos' or criado_por = auth.uid()));

create policy "trechos seguem a fonte" on public.trechos for select to authenticated
  using (exists (select 1 from public.fontes f where f.id = fonte_id));
create policy "editores gerenciam trechos" on public.trechos for all to authenticated
  using (public.pode_editar() and exists (select 1 from public.fontes f where f.id = fonte_id))
  with check (public.pode_editar() and exists (select 1 from public.fontes f where f.id = fonte_id));

create policy "aprovados veem glossário" on public.glossario for select to authenticated
  using (public.meu_papel() is not null);
create policy "editores gerenciam glossário" on public.glossario for all to authenticated
  using (public.pode_editar()) with check (public.pode_editar());

create policy "aprovados veem ignorados" on public.ignorados for select to authenticated
  using (public.meu_papel() is not null);
create policy "editores gerenciam ignorados" on public.ignorados for all to authenticated
  using (public.pode_editar()) with check (public.pode_editar());

create policy "cada um com seu progresso" on public.progresso for all to authenticated
  using (user_id = auth.uid() and public.meu_papel() is not null) with check (user_id = auth.uid());
create policy "cada um com suas notas" on public.notas for all to authenticated
  using (user_id = auth.uid() and public.meu_papel() is not null) with check (user_id = auth.uid());

-- ---------- Busca ----------
-- Por sentido (vetores calculados no navegador).
create or replace function public.buscar_semantica(q vector(384), n int default 8, filtro_tipo text default null)
returns table (trecho_id uuid, fonte_id uuid, texto text, pagina int, score float)
language sql stable as $$
  select t.id, t.fonte_id, t.texto, t.pagina, 1 - (t.embedding <=> q)
  from public.trechos t join public.fontes f on f.id = t.fonte_id
  where t.embedding is not null and (filtro_tipo is null or f.tipo = filtro_tipo)
  order by t.embedding <=> q
  limit n
$$;

-- Por palavras, em português (funciona mesmo antes de preparar a busca por sentido).
create or replace function public.buscar_texto(q text, n int default 8, filtro_tipo text default null)
returns table (trecho_id uuid, fonte_id uuid, texto text, pagina int, score float)
language sql stable as $$
  select t.id, t.fonte_id, t.texto, t.pagina, ts_rank(t.busca, websearch_to_tsquery('portuguese', q))::float
  from public.trechos t join public.fontes f on f.id = t.fonte_id
  where t.busca @@ websearch_to_tsquery('portuguese', q)
    and (filtro_tipo is null or f.tipo = filtro_tipo)
  order by 5 desc
  limit n
$$;

-- Destaques e anotações por termo.

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

-- ---------- Glossário inicial ----------
insert into public.glossario (termo, significado, variantes) values
  ('atabaque', 'Tambor sagrado usado na gira para conduzir os pontos.', array['ababá', 'ababate', 'staaco', 'mataaco']::text[]),
  ('atabaqueiro', 'Quem toca o atabaque na gira, dentro da curimba.', array['praaqueiro', 'tabaqueiro']::text[]),
  ('curimba', 'Conjunto de quem toca e canta os pontos na gira.', array['coripa']::text[]),
  ('gira', 'A sessão de trabalho espiritual no terreiro.', array['aira']::text[]),
  ('ponto cantado', 'Cântico que chama, saúda ou despede uma linha ou entidade.', '{}'::text[]),
  ('puxar o ponto', 'Iniciar um ponto cantado. Na casa, quem define é a dirigente.', '{}'::text[]),
  ('atravessar', 'Sair do ritmo do toque, acelerando ou desencontrando dos outros.', '{}'::text[]),
  ('terreiro', 'A casa onde acontecem as giras.', array['telheiro', 'treiro', 'berreiro', 'trevereiro']::text[]),
  ('dirigente', 'Quem conduz a casa e a gira.', '{}'::text[]),
  ('doutrina', 'O conjunto de regras e fundamentos de uma casa.', array['douina']::text[]),
  ('fundamento', 'Base de conhecimento e prática que sustenta um ritual.', '{}'::text[]),
  ('sete linhas', 'Divisão das forças e entidades da umbanda em sete linhas.', '{}'::text[]),
  ('Exu', 'Guardião ligado à proteção e aos caminhos.', array['enxu']::text[]),
  ('Ogum', 'Orixá ligado à lei, à luta e à abertura de caminhos.', '{}'::text[]),
  ('Oxóssi', 'Orixá ligado ao conhecimento, às matas e à fartura.', array['xóço', 'choso', 'chosse', 'achosso']::text[]),
  ('Xangô', 'Orixá ligado à justiça.', '{}'::text[]),
  ('Iemanjá', 'Orixá ligada ao mar e à geração.', '{}'::text[]),
  ('Oxum', 'Orixá ligada às águas doces e ao amor.', '{}'::text[]),
  ('Oxalá', 'Orixá ligado à fé e à criação.', '{}'::text[]),
  ('caboclo', 'Entidade associada aos povos originários e às matas.', array['caboto', 'cabota']::text[]),
  ('preto-velho', 'Entidade associada à sabedoria e à paciência.', '{}'::text[]),
  ('baiano', 'Entidade da linha dos baianos.', array['Bahiano']::text[]),
  ('boiadeiro', 'Entidade da linha dos boiadeiros.', array['fuiadeira', 'boia-deira']::text[]),
  ('médium', 'Pessoa que serve de canal para a comunicação espiritual.', '{}'::text[]),
  ('incorporação', 'Quando a entidade se manifesta através do médium.', '{}'::text[]),
  ('descarrego', 'Trabalho para limpar energias negativas.', '{}'::text[]),
  ('consagração', 'Ritual que torna um objeto ou instrumento sagrado.', '{}'::text[]),
  ('obrigação', 'Compromisso ritual do médium com suas entidades e a casa.', '{}'::text[]),
  ('Nanã', 'Orixá ligada à sabedoria ancestral.', '{}'::text[]),
  ('Omulu', 'Orixá ligado à cura e à saúde.', '{}'::text[]),
  ('pemba', 'Giz sagrado usado para riscar pontos.', '{}'::text[]),
  ('ponto riscado', 'Desenho feito com pemba que identifica e firma uma entidade.', '{}'::text[]),
  ('chefe de linha', 'Entidade que comanda a linha de trabalho do médium.', '{}'::text[]),
  ('gira de desenvolvimento', 'Gira voltada para quem está desenvolvendo a mediunidade, em que se chamam as várias linhas.', '{}'::text[]),
  ('defumação', 'Queima de ervas para limpar o ambiente e as pessoas no início da gira.', '{}'::text[]);

-- Junta várias gravações do mesmo dia numa aula só, sem perder destaques,
-- respostas e anotações de ninguém.
create or replace function public.juntar_aulas(destino uuid, origens uuid[])
returns void language plpgsql security definer set search_path = public as $$
declare
  ids uuid[] := array[destino] || origens;
  novo text;
begin
  if not public.pode_editar() then raise exception 'Só editoras podem juntar aulas.'; end if;
  select string_agg(format(E'[Gravação %s]\n\n%s', x.n, regexp_replace(x.texto, E'^\\[Gravação \\d+\\]\\s*', '', 'g')), E'\n\n' order by x.n)
    into novo
    from (select f.texto, array_position(ids, f.id) as n from public.fontes f where f.id = any(ids) and f.tipo = 'aula') x;
  update public.destaques set fonte_id = destino where fonte_id = any(origens);
  update public.respostas set fonte_id = destino where fonte_id = any(origens);
  insert into public.notas (user_id, fonte_id, texto)
    select user_id, destino, string_agg(texto, E'\n\n' order by (fonte_id = destino) desc)
    from public.notas where fonte_id = any(ids) and texto <> '' group by user_id
    on conflict (user_id, fonte_id) do update set texto = excluded.texto;
  delete from public.fontes where id = any(origens);
  update public.fontes set texto = novo, estudo = null, indexada = false, atualizado_em = now() where id = destino;
end $$;

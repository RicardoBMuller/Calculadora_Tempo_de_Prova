-- ============================================================
-- FCC • Calculadora de duração de provas
-- Contador global de acessos para GitHub Pages + Supabase
-- ============================================================
-- Execute TODO este arquivo uma única vez no SQL Editor
-- do projeto "calculadora-fcc".
--
-- O site NÃO recebe permissão direta na tabela.
-- O navegador só pode executar as duas funções públicas abaixo.
-- ============================================================

begin;

create table if not exists public.site_counter (
  id smallint primary key,
  total_visits bigint not null default 0 check (total_visits >= 0),
  updated_at timestamptz not null default now(),
  constraint site_counter_single_row check (id = 1)
);

insert into public.site_counter (id, total_visits)
values (1, 0)
on conflict (id) do nothing;

-- RLS ligado e nenhuma policy pública para a tabela.
alter table public.site_counter enable row level security;

-- O frontend não pode consultar, inserir, alterar ou apagar a tabela diretamente.
revoke all on table public.site_counter from anon, authenticated;

-- Incrementa o contador de forma atômica e devolve o novo número.
create or replace function public.register_site_visit()
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_total bigint;
begin
  update public.site_counter
     set total_visits = total_visits + 1,
         updated_at = now()
   where id = 1
   returning total_visits into new_total;

  -- Proteção extra caso a linha tenha sido removida manualmente.
  if new_total is null then
    insert into public.site_counter (id, total_visits)
    values (1, 1)
    on conflict (id) do update
      set total_visits = public.site_counter.total_visits + 1,
          updated_at = now()
    returning total_visits into new_total;
  end if;

  return new_total;
end;
$$;

-- Consulta o total sem incrementar.
create or replace function public.get_site_visit_count()
returns bigint
language sql
stable
security definer
set search_path = ''
as $$
  select total_visits
    from public.site_counter
   where id = 1;
$$;

-- Remove permissões automáticas e libera apenas a execução das funções.
revoke all on function public.register_site_visit() from public;
revoke all on function public.get_site_visit_count() from public;

grant execute on function public.register_site_visit() to anon, authenticated;
grant execute on function public.get_site_visit_count() to anon, authenticated;

commit;

-- Teste opcional no próprio SQL Editor:
-- select public.get_site_visit_count();
-- select public.register_site_visit();
-- select public.get_site_visit_count();

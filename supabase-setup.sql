-- ============================================
-- SETUP DO SUPABASE — Kanban Engenharia Prometals
-- ============================================
-- Como usar: copie todo este conteúdo e cole no
-- SQL Editor do Supabase (menu lateral "SQL Editor")
-- depois clique em "Run".
-- ============================================

-- Tabela principal de itens (produtos internos, terceiros, recados)
create table if not exists kanban_items (
  id bigint generated always as identity primary key,
  title text not null,
  type text not null check (type in ('interna', 'terceiro', 'diversos')),
  prio text not null check (prio in ('Alta', 'Média', 'Baixa')),
  resp text not null check (resp in ('Gabriel', 'Anderson', 'Ambos')),
  day1 text check (day1 in ('seg','ter','qua','qui','sex')),
  day2 text check (day2 in ('seg','ter','qua','qui','sex')),
  period text default 'manha' check (period in ('manha','tarde','dia')),
  due_date date,
  obs text default '',
  status text not null default 'novo' check (status in ('novo', 'and', 'aguard', 'ok')),
  steps jsonb default '[]'::jsonb,
  status_log jsonb default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Atualiza automaticamente "updated_at" sempre que o item for editado
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_update_updated_at on kanban_items;
create trigger trg_update_updated_at
  before update on kanban_items
  for each row
  execute function update_updated_at();

-- Habilita Row Level Security (necessário no Supabase)
alter table kanban_items enable row level security;

-- Política simples: qualquer pessoa com a chave anon pode ler e escrever
-- (ideal para uso interno entre Gabriel e Anderson, sem login)
create policy "Permitir tudo para anon"
  on kanban_items
  for all
  using (true)
  with check (true);

-- Habilita Realtime (sincronização instantânea entre os dois usuários)
alter publication supabase_realtime add table kanban_items;

create extension if not exists pgcrypto;
create extension if not exists vector;
create table if not exists public.users(id uuid primary key default gen_random_uuid(),name text not null,email text unique not null,role text not null check(role in ('student','hod','company','admin')),department text,year int,college_id text not null);
create table if not exists public.skills(id uuid primary key default gen_random_uuid(),user_id uuid not null references public.users(id) on delete cascade,subject_name text not null,freshness_score numeric not null default 100 check(freshness_score between 0 and 100),last_practiced_at timestamptz,status text not null check(status in ('fresh','decaying','dead')),decay_history jsonb not null default '[]',weak_topic text);
create table if not exists public.quizzes(id uuid primary key default gen_random_uuid(),user_id uuid not null references public.users(id),skill_id uuid not null references public.skills(id),questions jsonb not null,score numeric,generated_by_agent text not null,created_at timestamptz default now());
create table if not exists public.agent_logs(id uuid primary key default gen_random_uuid(),agent_name text not null,action text not null,input text,output text,timestamp timestamptz default now());
create table if not exists public.college_insights(id uuid primary key default gen_random_uuid(),college_id text not null,report_data jsonb not null,generated_at timestamptz default now());
create table if not exists public.skill_memories(id uuid primary key default gen_random_uuid(),user_id uuid references public.users(id) on delete cascade,memory_text text not null,embedding vector(768),metadata jsonb default '{}',created_at timestamptz default now());
-- Configure Supabase Auth, row-level security, and policies before production use.

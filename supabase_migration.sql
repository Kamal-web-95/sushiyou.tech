-- 1. Добавляем статус аккаунта в таблицу profiles (если таблицы еще нет - она должна быть создана)
-- status: 'pending' (ждет одобрения), 'approved' (одобрен), 'blocked' (заблокирован)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending';

-- Устанавливаем статус 'approved' для всех действующих администраторов
UPDATE public.profiles SET status = 'approved' WHERE role = 'admin';

-- 2. Создаем таблицу audit_logs для ведения журнала
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    action text NOT NULL,
    details jsonb,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Настраиваем RLS (Row Level Security) для аудита:
-- Пользователи могут добавлять логи от своего имени, администраторы могут просматривать все.
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own logs" 
ON public.audit_logs FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all logs" 
ON public.audit_logs FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);

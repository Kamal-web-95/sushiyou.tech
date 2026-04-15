-- Включаем RLS для profiles таблиц на всякий случай, если он был выключен, либо добавляем правило
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Создаем политику, которая разрешает АДМИНИСТРАТОРАМ редактировать ЛЮБЫЕ профили (чтобы кнопки Одобрить/Отклонить работали)
-- Если политика с таким именем уже существует, SQL может выдать ошибку, поэтому используем аккуратный обход
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'Admins can update all profiles'
  ) THEN
    CREATE POLICY "Admins can update all profiles" 
    ON public.profiles FOR UPDATE 
    USING (
      EXISTS (
        SELECT 1 FROM public.profiles as admin_profile
        WHERE admin_profile.id = auth.uid() AND admin_profile.role = 'admin'
      )
    );
  END IF;
  
  -- Разрешаем каждому пользователю читать свой профиль, а администраторам все
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'Anyone can view profiles'
  ) THEN
    CREATE POLICY "Anyone can view profiles" 
    ON public.profiles FOR SELECT 
    USING ( true );
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'audit_logs' AND policyname = 'Admins can delete logs'
  ) THEN
    CREATE POLICY "Admins can delete logs" 
    ON public.audit_logs FOR DELETE 
    USING (
      EXISTS (
        SELECT 1 FROM public.profiles as admin_profile
        WHERE admin_profile.id = auth.uid() AND admin_profile.role = 'admin'
      )
    );
  END IF;
END $$;

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

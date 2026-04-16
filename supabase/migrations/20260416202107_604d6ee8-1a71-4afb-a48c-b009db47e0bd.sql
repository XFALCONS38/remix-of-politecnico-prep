-- Create admin user if not exists
DO $$
DECLARE
  new_user_id uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin@tilprep.com') THEN
    new_user_id := gen_random_uuid();
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data, is_super_admin, confirmation_token, email_change, email_change_token_new, recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      new_user_id,
      'authenticated',
      'authenticated',
      'admin@tilprep.com',
      crypt('Admin123!', gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{}'::jsonb,
      false, '', '', '', ''
    );
    INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    VALUES (gen_random_uuid(), new_user_id, jsonb_build_object('sub', new_user_id::text, 'email', 'admin@tilprep.com'), 'email', new_user_id::text, now(), now(), now());

    INSERT INTO public.profiles (id, email, access_expiry)
    VALUES (new_user_id, 'admin@tilprep.com', now() + interval '10 years')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.user_roles (user_id, role)
    VALUES (new_user_id, 'admin')
    ON CONFLICT DO NOTHING;
  END IF;
END $$;
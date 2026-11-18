CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  new_profile_id uuid;
  customer_role_id uuid;
BEGIN
  INSERT INTO public.profiles (
    id,
    "authUserId",
    "firstName",
    "lastName",
    phone,
    "countryCode"
  )
  VALUES (
    new.id,
    new.id,
    new.raw_user_meta_data ->> 'first_name',
    new.raw_user_meta_data ->> 'last_name',
    new.raw_user_meta_data ->> 'phone',
    new.raw_user_meta_data ->> 'country_code'
  )
  RETURNING id INTO new_profile_id;

  SELECT id
  INTO customer_role_id
  FROM public.roles
  WHERE name = 'CUSTOMER';

  IF customer_role_id IS NULL THEN
    RAISE EXCEPTION 'CUSTOMER role does not exist';
  END IF;

  INSERT INTO public.user_roles (
    id,
    "profileId",
    "roleId"
  )
  VALUES (
    gen_random_uuid(),
    new_profile_id,
    customer_role_id
  );

  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

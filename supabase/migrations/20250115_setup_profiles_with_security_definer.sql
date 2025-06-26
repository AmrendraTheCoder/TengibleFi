-- The Definitive Automatic Solution: The SECURITY DEFINER Trigger
-- This script sets up the profiles table, RLS policies, and trigger correctly.
-- It's safe to run multiple times as it handles existing objects cleanly.

-- 1. Create a table for public profiles if it doesn't exist
-- This ensures all columns are present.
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid NOT NULL,
  updated_at timestamp with time zone,
  full_name text,
  email text,
  wallet_address text,
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT profiles_wallet_address_key UNIQUE (wallet_address)
);

-- 2. Set up Row Level Security (RLS) for the profiles table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts before creating new ones
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile." ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile." ON public.profiles;

-- Create the policies
CREATE POLICY "Public profiles are viewable by everyone." ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile." ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile." ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- 3. Create the function that will be called by the trigger.
-- The "SECURITY DEFINER" part is crucial. It makes the function run with the permissions of the user who defined it (the database admin),
-- not the user who triggered it. This allows it to INSERT into the profiles table.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (new.id, new.email);
  RETURN new;
END;
$$;

-- 4. Create the trigger that calls the function whenever a new user is added to auth.users
-- We drop the old one first to make sure we're using the updated function.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Optional: Add a comment for documentation
COMMENT ON FUNCTION public.handle_new_user() IS 'Automatically creates a profile when a new user signs up. Uses SECURITY DEFINER to run with elevated privileges.';
COMMENT ON TRIGGER on_auth_user_created ON auth.users IS 'Triggers profile creation for new users with proper security permissions.'; 
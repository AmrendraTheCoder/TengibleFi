-- The Definitive Automatic Solution for Supabase: Profiles Setup
-- This script sets up the profiles table and RLS policies correctly.
-- Note: We cannot create triggers on auth.users due to permissions, 
-- so we'll use Supabase's built-in user management instead.

-- 1. Create a table for public profiles if it doesn't exist
-- This ensures all columns are present.
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
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

-- 3. Create the function that handles profile creation
-- This function can be called manually or from client code
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

-- Alternative function that can be called from client code
CREATE OR REPLACE FUNCTION public.create_profile_for_user(user_id uuid, user_email text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (user_id, user_email)
  ON CONFLICT (id) DO NOTHING;
END;
$$;

-- Grant execute permission on the function to authenticated users
GRANT EXECUTE ON FUNCTION public.create_profile_for_user(uuid, text) TO authenticated;

-- Add helpful comments
COMMENT ON TABLE public.profiles IS 'User profiles table with RLS policies';
COMMENT ON FUNCTION public.create_profile_for_user(uuid, text) IS 'Creates a profile for a user. Can be called from client code after signup.'; 
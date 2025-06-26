-- Add email column to profiles table and backfill existing users
-- Migration created: 2025-01-15

-- Step 1: Add the 'email' column to the profiles table
ALTER TABLE public.profiles
ADD COLUMN email TEXT;

-- Step 2: Backfill email for all existing users
-- This updates all existing profiles with the email from the auth.users table
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id;

-- Optional: Add a comment to document this change
COMMENT ON COLUMN public.profiles.email IS 'User email address synced from auth.users table'; 
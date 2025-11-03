-- Create profiles table for user information
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  bio TEXT,
  avatar_url TEXT,
  interests TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create events table
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  event_date TIMESTAMPTZ NOT NULL,
  location_name TEXT NOT NULL,
  location_lat DECIMAL(10, 8),
  location_lng DECIMAL(11, 8),
  category TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  capacity INTEGER NOT NULL,
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create event_registrations table
CREATE TABLE public.event_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  registered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(event_id, user_id)
);

-- Create event_ratings table for post-event feedback
CREATE TABLE public.event_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  host_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating TEXT NOT NULL CHECK (rating IN ('like', 'neutral', 'dislike')),
  review TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(event_id, user_id)
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_ratings ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Public profiles are viewable by everyone"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Events policies
CREATE POLICY "Events are viewable by everyone"
  ON public.events FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create events"
  ON public.events FOR INSERT
  WITH CHECK (auth.uid() = host_id);

CREATE POLICY "Hosts can update their own events"
  ON public.events FOR UPDATE
  USING (auth.uid() = host_id);

CREATE POLICY "Hosts can delete their own events"
  ON public.events FOR DELETE
  USING (auth.uid() = host_id);

-- Event registrations policies
CREATE POLICY "Users can view registrations for their events"
  ON public.event_registrations FOR SELECT
  USING (
    auth.uid() IN (
      SELECT host_id FROM public.events WHERE id = event_id
    )
    OR auth.uid() = user_id
  );

CREATE POLICY "Users can register for events"
  ON public.event_registrations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unregister from events"
  ON public.event_registrations FOR DELETE
  USING (auth.uid() = user_id);

-- Event ratings policies
CREATE POLICY "Ratings are viewable by everyone"
  ON public.event_ratings FOR SELECT
  USING (true);

CREATE POLICY "Attendees can rate events they attended"
  ON public.event_ratings FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.event_registrations
      WHERE event_id = event_ratings.event_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own ratings"
  ON public.event_ratings FOR UPDATE
  USING (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER events_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Function to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'New User')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to create profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Function to calculate host average rating
CREATE OR REPLACE FUNCTION public.get_host_rating(host_user_id UUID)
RETURNS DECIMAL AS $$
DECLARE
  total_ratings INTEGER;
  like_count INTEGER;
  neutral_count INTEGER;
  dislike_count INTEGER;
  rating_score DECIMAL;
BEGIN
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE rating = 'like'),
    COUNT(*) FILTER (WHERE rating = 'neutral'),
    COUNT(*) FILTER (WHERE rating = 'dislike')
  INTO total_ratings, like_count, neutral_count, dislike_count
  FROM public.event_ratings
  WHERE host_id = host_user_id;
  
  IF total_ratings = 0 THEN
    RETURN NULL;
  END IF;
  
  -- Calculate score: like=1, neutral=0.5, dislike=0
  rating_score := (like_count * 1.0 + neutral_count * 0.5) / total_ratings * 5.0;
  
  RETURN ROUND(rating_score, 1);
END;
$$ LANGUAGE plpgsql STABLE;
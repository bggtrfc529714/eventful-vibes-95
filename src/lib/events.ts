
import { supabase } from '@/integrations/supabase/client';
import { type Event, type EventsWithCount } from '@/integrations/supabase/types';

export const getEvents = async ({
  limit,
  offset,
  searchText,
  filter,
}: {
  limit: number;
  offset: number;
  searchText?: string;
  filter?: string;
}): Promise<EventsWithCount> => {
  const { data, error } = await supabase.rpc('get_events_with_details', {
    p_limit: limit,
    p_offset: offset,
    p_search_text: searchText,
    p_filter: filter,
  });

  if (error) {
    console.error('Error fetching events:', error);
    return { events: [], total_count: 0 };
  }

  const { events, total_count } = data;
  return { events: events || [], total_count: total_count || 0 };
};

export const getEventById = async (id: string) => {
  const { data, error } = await supabase
    .rpc('get_event_by_id', {
      p_event_id: id,
    })
    .single();

  if (error) {
    console.error('Error fetching event:', error);
    return null;
  }

  return data as Event;
};

export const getMyEvents = async (userId: string) => {
  const { data, error } = await supabase.rpc('get_my_events', {
    p_user_id: userId,
  });

  if (error) {
    console.error('Error fetching my events:', error);
    return { hosting: [], attending: [] };
  }

  const { hosting, attending } = data[0];
  return { hosting: hosting || [], attending: attending || [] };
};

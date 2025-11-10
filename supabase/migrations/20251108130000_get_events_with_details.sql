
create or replace function get_events_with_details(
    p_limit integer,
    p_offset integer,
    p_search_text text default null,
    p_filter text default null
)
returns table (
    id bigint,
    name text,
    description text,
    date timestamp with time zone,
    location text,
    image_url text,
    created_at timestamp with time zone,
    host_id uuid,
    latitude double precision,
    longitude double precision,
    registration_count bigint,
    host_rating double precision,
    host_profile json
)
language plpgsql
as $$
begin
    return query
    select
        e.id,
        e.name,
        e.description,
        e.date,
        e.location,
        e.image_url,
        e.created_at,
        e.host_id,
        e.latitude,
        e.longitude,
        (select count(*) from event_registrations er where er.event_id = e.id) as registration_count,
        (select avg(r.rating) from reviews r where r.reviewee_id = e.host_id) as host_rating,
        (select json_build_object('id', u.id, 'full_name', u.full_name, 'avatar_url', u.avatar_url) from users u where u.id = e.host_id) as host_profile
    from
        events e
    where
        (p_search_text is null or e.name ilike '%' || p_search_text || '%' or e.description ilike '%' || p_search_text || '%') and
        (p_filter is null or
            (p_filter = 'upcoming' and e.date > now()) or
            (p_filter = 'past' and e.date <= now())
        )
    order by
        e.date desc
    limit p_limit
    offset p_offset;
end;
$$;

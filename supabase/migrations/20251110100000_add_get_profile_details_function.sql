create or replace function get_profile_details(p_user_id uuid)
returns table (
    full_name text,
    bio text,
    interests text[],
    host_rating float,
    total_ratings bigint
)
language plpgsql
as $$
begin
    return query
    select
        p.full_name,
        p.bio,
        p.interests,
        (select avg(er.rating) from event_ratings er where er.host_id = p.id) as host_rating,
        (select count(*) from event_ratings er where er.host_id = p.id) as total_ratings
    from
        profiles p
    where
        p.id = p_user_id;
end;
$$;
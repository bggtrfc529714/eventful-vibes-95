
CREATE OR REPLACE FUNCTION get_event_by_id(p_event_id text)
RETURNS json
LANGUAGE plpgsql
AS $$
DECLARE
    event_data json;
BEGIN
    SELECT json_build_object(
        'id', e.id,
        'title', e.title,
        'description', e.description,
        'event_date', e.event_date,
        'location_name', e.location_name,
        'location_lat', e.location_lat,
        'location_lng', e.location_lng,
        'category', e.category,
        'tags', e.tags,
        'capacity', e.capacity,
        'image_url', e.image_url,
        'created_at', e.created_at,
        'host_id', e.host_id,
        'registration_count', (SELECT count(*) FROM event_registrations er WHERE er.event_id = e.id),
        'host_full_name', p.full_name,
        'host_avatar_url', p.avatar_url,
        'host_rating', (SELECT get_host_rating(e.host_id))
    )
    INTO event_data
    FROM events e
    JOIN profiles p ON e.host_id = p.id
    WHERE e.id = p_event_id;

    RETURN event_data;
END;
$$;

CREATE OR REPLACE FUNCTION get_my_events(p_user_id text)
RETURNS json
LANGUAGE plpgsql
AS $$
DECLARE
    hosting_events json;
    attending_events json;
BEGIN
    SELECT json_agg(t)
    INTO hosting_events
    FROM (
        SELECT
            e.id,
            e.title,
            e.description,
            e.event_date,
            e.location_name,
            e.location_lat,
            e.location_lng,
            e.category,
            e.tags,
            e.capacity,
            e.image_url,
            e.created_at,
            e.host_id,
            (SELECT count(*) FROM event_registrations er WHERE er.event_id = e.id) AS registration_count,
            p.full_name AS host_full_name,
            p.avatar_url AS host_avatar_url,
            (SELECT get_host_rating(e.host_id)) AS host_rating
        FROM
            events e
        JOIN
            profiles p ON e.host_id = p.id
        WHERE e.host_id = p_user_id
    ) t;

    SELECT json_agg(t)
    INTO attending_events
    FROM (
        SELECT
            e.id,
            e.title,
            e.description,
            e.event_date,
            e.location_name,
            e.location_lat,
            e.location_lng,
            e.category,
            e.tags,
            e.capacity,
            e.image_url,
            e.created_at,
            e.host_id,
            (SELECT count(*) FROM event_registrations er WHERE er.event_id = e.id) AS registration_count,
            p.full_name AS host_full_name,
            p.avatar_url AS host_avatar_url,
            (SELECT get_host_rating(e.host_id)) AS host_rating
        FROM
            events e
        JOIN
            profiles p ON e.host_id = p.id
        JOIN
            event_registrations er ON er.event_id = e.id
        WHERE er.user_id = p_user_id
    ) t;

    RETURN json_build_object('hosting', hosting_events, 'attending', attending_events);
END;
$$;

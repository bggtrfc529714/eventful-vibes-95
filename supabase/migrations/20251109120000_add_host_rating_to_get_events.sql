DROP FUNCTION IF EXISTS get_events_with_details;
CREATE OR REPLACE FUNCTION get_events_with_details(
    p_limit integer,
    p_offset integer,
    p_search_text text DEFAULT NULL,
    p_filter text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
AS $$
DECLARE
    events_data json;
    total_count integer;
BEGIN
    -- Get the total count
    SELECT count(*)
    INTO total_count
    FROM events e
    WHERE
        (p_search_text IS NULL OR e.title ILIKE '%' || p_search_text || '%' OR e.description ILIKE '%' || p_search_text || '%') AND
        (p_filter IS NULL OR
            (p_filter = 'upcoming' AND e.event_date > now()) OR
            (p_filter = 'past' AND e.event_date <= now()) OR
            (p_filter = 'category' AND e.category = p_filter)
        );

    -- Get the paginated events
    SELECT json_agg(t)
    INTO events_data
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
        WHERE
            (p_search_text IS NULL OR e.title ILIKE '%' || p_search_text || '%' OR e.description ILIKE '%' || p_search_text || '%') AND
            (p_filter IS NULL OR
                (p_filter = 'upcoming' AND e.event_date > now()) OR
                (p_filter = 'past' AND e.event_date <= now()) OR
                (p_filter = 'category' AND e.category = p_filter)
            )
        ORDER BY
            e.event_date DESC
        LIMIT p_limit
        OFFSET p_offset
    ) t;

    -- Return the result as a single JSON object
    RETURN json_build_object('events', events_data, 'total_count', total_count);
END;
$$;

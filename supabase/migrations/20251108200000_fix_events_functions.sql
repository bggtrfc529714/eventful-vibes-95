-- 1. Modify get_events_with_details to return total count
CREATE OR REPLACE FUNCTION get_events_with_details(
    p_limit integer,
    p_offset integer,
    p_search_text text DEFAULT NULL,
    p_filter text DEFAULT NULL
    -- REMOVED: OUT total_count integer (This was the error)
)
RETURNS TABLE (
    id uuid,
    title text,
    description text,
    event_date timestamptz,
    location_name text,
    location_lat decimal,
    location_lng decimal,
    category text,
    tags text[],
    capacity integer,
    image_url text,
    created_at timestamptz,
    host_id uuid,
    registration_count bigint,
    host_full_name text,
    host_avatar_url text,
    total_count integer -- ADDED: The total_count column here
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_total_count integer; -- ADDED: Declare a variable to hold the count
BEGIN
    -- Get the total count
    SELECT count(*)
    INTO v_total_count -- Use the declared variable
    FROM events e
    WHERE
        (p_search_text IS NULL OR e.title ILIKE '%' || p_search_text || '%' OR e.description ILIKE '%' || p_search_text || '%') AND
        (p_filter IS NULL OR
            (p_filter = 'upcoming' AND e.event_date > now()) OR
            (p_filter = 'past' AND e.event_date <= now()) OR
            (p_filter = 'category' AND e.category = p_filter) -- Example filter
        );

    -- Get the paginated events
    RETURN QUERY
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
        v_total_count -- ADDED: Return the calculated count on every row
    FROM
        events e
    JOIN
        profiles p ON e.host_id = p.id
    WHERE
        (p_search_text IS NULL OR e.title ILIKE '%' || p_search_text || '%' OR e.description ILIKE '%' || p_search_text || '%') AND
        (p_filter IS NULL OR
            (p_filter = 'upcoming' AND e.event_date > now()) OR
            (p_filter = 'past' AND e.event_date <= now()) OR
            (p_filter = 'category' AND e.category = p_filter) -- Example filter
        )
    ORDER BY
        e.event_date DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;

-- 2. Create get_event_by_id
CREATE OR REPLACE FUNCTION get_event_by_id(
    p_event_id uuid
)
RETURNS TABLE (
    id uuid,
    title text,
    description text,
    event_date timestamptz,
    location_name text,
    location_lat decimal,
    location_lng decimal,
    category text,
    tags text[],
    capacity integer,
    image_url text,
    created_at timestamptz,
    host_id uuid,
    registration_count bigint,
    host_full_name text,
    host_avatar_url text
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
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
        p.avatar_url AS host_avatar_url
    FROM
        events e
    JOIN
        profiles p ON e.host_id = p.id
    WHERE
        e.id = p_event_id;
END;
$$;

-- 3. Create get_my_events
CREATE OR REPLACE FUNCTION get_my_events(
    p_user_id uuid
)
RETURNS TABLE (
    hosting json,
    attending json
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        (
            SELECT json_agg(h)
            FROM (
                SELECT
                    e.id,
                    e.title,
                    e.event_date,
                    e.location_name,
                    e.image_url
                FROM events e
                WHERE e.host_id = p_user_id
            ) h
        ) AS hosting,
        (
            SELECT json_agg(a)
            FROM (
                SELECT
                    e.id,
                    e.title,
                    e.event_date,
                    e.location_name,
                    e.image_url
                FROM events e
                JOIN event_registrations er ON e.id = er.event_id
                WHERE er.user_id = p_user_id
            ) a
        ) AS attending;
END;
$$;

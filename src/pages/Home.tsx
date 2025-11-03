import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import EventCard from "@/components/EventCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Filter, Sparkles, Calendar } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface Event {
  id: string;
  title: string;
  description: string;
  event_date: string;
  location_name: string;
  category: string;
  capacity: number;
  image_url?: string;
  host_id: string;
  profiles?: {
    full_name: string;
  };
}

const Home = () => {
  const navigate = useNavigate();
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [registrations, setRegistrations] = useState<Record<string, number>>({});
  const [hostRatings, setHostRatings] = useState<Record<string, number>>({});

  useEffect(() => {
    checkAuth();
    fetchEvents();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
    }
  };

  const fetchEvents = async () => {
    try {
      const { data: eventsData, error } = await supabase
        .from("events")
        .select(`
          *,
          profiles (full_name)
        `)
        .gte("event_date", new Date().toISOString())
        .order("event_date", { ascending: true });

      if (error) throw error;

      setEvents((eventsData as any) || []);

      // Fetch registration counts
      const eventIds = eventsData?.map(e => e.id) || [];
      const { data: regsData } = await supabase
        .from("event_registrations")
        .select("event_id");

      const regCounts: Record<string, number> = {};
      regsData?.forEach(reg => {
        regCounts[reg.event_id] = (regCounts[reg.event_id] || 0) + 1;
      });
      setRegistrations(regCounts);

      // Fetch host ratings
      const hostIds = [...new Set(eventsData?.map(e => e.host_id) || [])];
      const ratings: Record<string, number> = {};
      
      for (const hostId of hostIds) {
        const { data } = await supabase.rpc("get_host_rating", {
          host_user_id: hostId,
        });
        if (data !== null) {
          ratings[hostId] = data;
        }
      }
      setHostRatings(ratings);
    } catch (error) {
      console.error("Error fetching events:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredEvents = events.filter(event =>
    event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    event.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    event.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="gradient-primary text-primary-foreground p-6 pb-8">
        <div className="max-w-lg mx-auto space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-6 w-6" />
            <h1 className="text-2xl font-bold">Discover Events</h1>
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Search events..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-12 bg-card text-foreground border-0"
            />
            <Button
              size="icon"
              variant="ghost"
              className="absolute right-1 top-1/2 transform -translate-y-1/2"
            >
              <Filter className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 -mt-4">
        <div className="space-y-4">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="h-48 w-full rounded-xl" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ))
          ) : filteredEvents.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No events found</p>
            </div>
          ) : (
            filteredEvents.map((event) => (
              <EventCard
                key={event.id}
                id={event.id}
                title={event.title}
                description={event.description}
                eventDate={event.event_date}
                locationName={event.location_name}
                category={event.category}
                capacity={event.capacity}
                imageUrl={event.image_url}
                hostName={event.profiles?.full_name || "Unknown Host"}
                hostRating={hostRatings[event.host_id]}
                registeredCount={registrations[event.id] || 0}
              />
            ))
          )}
        </div>
      </div>

      <Navigation />
    </div>
  );
};

export default Home;

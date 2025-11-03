import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import EventCard from "@/components/EventCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "lucide-react";
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

const MyEvents = () => {
  const [attendingEvents, setAttendingEvents] = useState<Event[]>([]);
  const [hostingEvents, setHostingEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [registrations, setRegistrations] = useState<Record<string, number>>({});
  const [hostRatings, setHostRatings] = useState<Record<string, number>>({});

  useEffect(() => {
    fetchMyEvents();
  }, []);

  const fetchMyEvents = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch events user is attending
      const { data: regs } = await supabase
        .from("event_registrations")
        .select("event_id")
        .eq("user_id", user.id);

      const eventIds = regs?.map((r) => r.event_id) || [];

      let attendingData: Event[] = [];
      if (eventIds.length > 0) {
        const { data: attending } = await supabase
          .from("events")
          .select(`
            *,
            profiles (full_name)
          `)
          .in("id", eventIds)
          .gte("event_date", new Date().toISOString())
          .order("event_date", { ascending: true });

        attendingData = (attending as any) || [];
      }
      setAttendingEvents(attendingData);

      // Fetch events user is hosting
      const { data: hosting } = await supabase
        .from("events")
        .select(`
          *,
          profiles (full_name)
        `)
        .eq("host_id", user.id)
        .gte("event_date", new Date().toISOString())
        .order("event_date", { ascending: true });

      setHostingEvents((hosting as any) || []);

      // Fetch registration counts
      const allEventIds = [
        ...eventIds,
        ...(hosting?.map((e) => e.id) || []),
      ];
      const { data: allRegs } = await supabase
        .from("event_registrations")
        .select("event_id");

      const regCounts: Record<string, number> = {};
      allRegs?.forEach((reg) => {
        regCounts[reg.event_id] = (regCounts[reg.event_id] || 0) + 1;
      });
      setRegistrations(regCounts);

      // Fetch host ratings
      const allEvents = [...attendingData, ...(hosting || [])];
      const hostIds = [...new Set(allEvents.map((e) => e.host_id))];
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

  const renderEventList = (events: Event[]) => {
    if (isLoading) {
      return Array.from({ length: 2 }).map((_, i) => (
        <div key={i} className="space-y-3">
          <Skeleton className="h-48 w-full rounded-xl" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      ));
    }

    if (events.length === 0) {
      return (
        <div className="text-center py-12">
          <Calendar className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No events found</p>
        </div>
      );
    }

    return events.map((event) => (
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
    ));
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="gradient-primary text-primary-foreground p-6">
        <div className="max-w-lg mx-auto">
          <h1 className="text-2xl font-bold">My Events</h1>
          <p className="opacity-90 mt-1">Events you're attending or hosting</p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 -mt-4">
        <Tabs defaultValue="attending" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="attending">Attending</TabsTrigger>
            <TabsTrigger value="hosting">Hosting</TabsTrigger>
          </TabsList>

          <TabsContent value="attending" className="space-y-4">
            {renderEventList(attendingEvents)}
          </TabsContent>

          <TabsContent value="hosting" className="space-y-4">
            {renderEventList(hostingEvents)}
          </TabsContent>
        </Tabs>
      </div>

      <Navigation />
    </div>
  );
};

export default MyEvents;

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import EventCard from "@/components/EventCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { getMyEvents } from "@/lib/events";
import { type Event } from "@/integrations/supabase/types";

const MyEvents = () => {
  const { data: session } = useQuery({
    queryKey: ["session"],
    queryFn: () => supabase.auth.getSession(),
  });

  const { data, isLoading } = useQuery({
    queryKey: ["myEvents", session?.data.session?.user?.id],
    queryFn: () => getMyEvents(session?.data.session?.user?.id ?? ''),
    enabled: !!session?.data.session?.user?.id,
  });

  const hostingEvents = data?.hosting || [];
  const attendingEvents = data?.attending || [];

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
        hostName={event.host_full_name || "Unknown Host"}
        hostRating={event.host_rating}
        registeredCount={event.registration_count || 0}
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

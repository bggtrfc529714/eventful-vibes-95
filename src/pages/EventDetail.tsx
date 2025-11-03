import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import { Calendar, MapPin, Users, Star, ArrowLeft, Loader2 } from "lucide-react";
import { format } from "date-fns";
import Navigation from "@/components/Navigation";

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
    bio?: string;
  };
}

const EventDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState<Event | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRegistered, setIsRegistered] = useState(false);
  const [registeredCount, setRegisteredCount] = useState(0);
  const [hostRating, setHostRating] = useState<number | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);

  useEffect(() => {
    if (id) {
      fetchEvent();
      checkRegistration();
    }
  }, [id]);

  const fetchEvent = async () => {
    try {
      const { data, error } = await supabase
        .from("events")
        .select(`
          *,
          profiles (full_name, bio)
        `)
        .eq("id", id)
        .single();

      if (error) throw error;
      setEvent(data as any);

      // Fetch registration count
      const { data: regs } = await supabase
        .from("event_registrations")
        .select("id")
        .eq("event_id", id);
      setRegisteredCount(regs?.length || 0);

      // Fetch host rating
      const { data: rating } = await supabase.rpc("get_host_rating", {
        host_user_id: data.host_id,
      });
      setHostRating(rating);
    } catch (error) {
      console.error("Error fetching event:", error);
      toast.error("Failed to load event");
    } finally {
      setIsLoading(false);
    }
  };

  const checkRegistration = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("event_registrations")
      .select("id")
      .eq("event_id", id)
      .eq("user_id", user.id)
      .maybeSingle();

    setIsRegistered(!!data);
  };

  const handleRegistration = async () => {
    setIsRegistering(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      if (isRegistered) {
        const { error } = await supabase
          .from("event_registrations")
          .delete()
          .eq("event_id", id)
          .eq("user_id", user.id);

        if (error) throw error;
        setIsRegistered(false);
        setRegisteredCount((prev) => prev - 1);
        toast.success("Unregistered from event");
      } else {
        const { error } = await supabase.from("event_registrations").insert({
          event_id: id!,
          user_id: user.id,
        });

        if (error) throw error;
        setIsRegistered(true);
        setRegisteredCount((prev) => prev + 1);
        toast.success("Registered for event!");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to update registration");
    } finally {
      setIsRegistering(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Event not found</p>
      </div>
    );
  }

  const isFull = registeredCount >= event.capacity;

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="relative h-64">
        {event.image_url ? (
          <img
            src={event.image_url}
            alt={event.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full gradient-primary" />
        )}
        <div className="absolute inset-0 gradient-overlay" />
        
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
          className="absolute top-4 left-4 bg-card/80 backdrop-blur hover:bg-card"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>

        <Badge className="absolute top-4 right-4 bg-card text-card-foreground">
          {event.category}
        </Badge>
      </div>

      <div className="max-w-lg mx-auto px-4 -mt-8">
        <Card className="p-6 space-y-6 shadow-elevated">
          <div>
            <h1 className="text-2xl font-bold mb-2">{event.title}</h1>
            <p className="text-muted-foreground">{event.description}</p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-primary" />
              <span className="font-medium">
                {format(new Date(event.event_date), "EEEE, MMMM d, yyyy 'at' h:mm a")}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <MapPin className="h-5 w-5 text-primary" />
              <span className="font-medium">{event.location_name}</span>
            </div>

            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-primary" />
              <span className="font-medium">
                {registeredCount} / {event.capacity} registered
              </span>
              {isFull && (
                <Badge variant="destructive" className="ml-auto">
                  Full
                </Badge>
              )}
            </div>
          </div>

          <div className="border-t pt-4">
            <h3 className="font-semibold mb-3">Hosted by</h3>
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarFallback>
                  {event.profiles?.full_name?.charAt(0) || "?"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="font-medium">{event.profiles?.full_name}</p>
                {event.profiles?.bio && (
                  <p className="text-sm text-muted-foreground">{event.profiles.bio}</p>
                )}
              </div>
              {hostRating && (
                <div className="flex items-center gap-1 bg-secondary/10 px-3 py-1.5 rounded-full">
                  <Star className="h-4 w-4 fill-secondary text-secondary" />
                  <span className="font-semibold text-secondary">
                    {hostRating.toFixed(1)}
                  </span>
                </div>
              )}
            </div>
          </div>

          <Button
            onClick={handleRegistration}
            disabled={isRegistering || (!isRegistered && isFull)}
            className="w-full h-12 text-base font-semibold"
            variant={isRegistered ? "outline" : "default"}
          >
            {isRegistering ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Please wait
              </>
            ) : isRegistered ? (
              "Unregister"
            ) : isFull ? (
              "Event Full"
            ) : (
              "Register for Event"
            )}
          </Button>
        </Card>
      </div>

      <Navigation />
    </div>
  );
};

export default EventDetail;

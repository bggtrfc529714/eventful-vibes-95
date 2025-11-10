import { useState, useCallback } from "react";
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
import { getEventById } from "@/lib/events";
import { type Event } from "@/integrations/supabase/types";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { categoryImages } from "@/lib/category-images";

const EventDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: event, isLoading } = useQuery({
    queryKey: ["event", id],
    queryFn: () => getEventById(id!),
    enabled: !!id,
  });

  const { data: session } = useQuery({
    queryKey: ["session"],
    queryFn: () => supabase.auth.getSession(),
  });

  const { data: isRegistered } = useQuery({
    queryKey: ["registration", id, session?.data.session?.user?.id],
    queryFn: async () => {
      if (!id || !session?.data.session?.user?.id) return false;
      const { data } = await supabase
        .from("event_registrations")
        .select("id")
        .eq("event_id", id)
        .eq("user_id", session.data.session.user.id)
        .maybeSingle();
      return !!data;
    },
    enabled: !!id && !!session?.data.session?.user?.id,
  });

  const mutation = useMutation({
    mutationFn: async (register: boolean) => {
      const user = session?.data.session?.user;
      if (!user) throw new Error("Not authenticated");

      if (register) {
        const { error } = await supabase.from("event_registrations").insert({
          event_id: id!,
          user_id: user.id,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("event_registrations")
          .delete()
          .eq("event_id", id)
          .eq("user_id", user.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event", id] });
      queryClient.invalidateQueries({ queryKey: ["registration", id, session?.data.session?.user?.id] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update registration");
    },
  });

  const handleRegistration = () => {
    mutation.mutate(!isRegistered);
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

  const isFull = event.registration_count >= event.capacity;
  const displayImageUrl = event.image_url || categoryImages[event.category] || categoryImages["Other"];

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="relative h-64">
        {displayImageUrl ? (
          <img
            src={displayImageUrl}
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
                {event.registration_count} / {event.capacity} registered
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
                  {event.host_full_name?.charAt(0) || "?"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="font-medium">{event.host_full_name}</p>
              </div>
              {event.host_rating && (
                <div className="flex items-center gap-1 bg-secondary/10 px-3 py-1.5 rounded-full">
                  <Star className="h-4 w-4 fill-secondary text-secondary" />
                  <span className="font-semibold text-secondary">
                    {event.host_rating.toFixed(1)}
                  </span>
                </div>
              )}
            </div>
          </div>

          <Button
            onClick={handleRegistration}
            disabled={mutation.isPending || (!isRegistered && isFull)}
            className="w-full h-12 text-base font-semibold"
            variant={isRegistered ? "outline" : "default"}
          >
            {mutation.isPending ? (
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

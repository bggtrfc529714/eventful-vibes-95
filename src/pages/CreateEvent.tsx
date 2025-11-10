import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import Navigation from "@/components/Navigation";
import { toast } from "sonner";
import { Loader2, ArrowLeft } from "lucide-react";
import { useLoadScript, Autocomplete } from "@react-google-maps/api";

const CreateEvent = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    eventDate: "",
    eventTime: "",
    locationName: "",
    category: "",
    capacity: "",
    lat: null as number | null,
    lng: null as number | null,
  });
  const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);

  const { isLoaded } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries: ["places"],
  });

  const onPlaceChanged = () => {
    if (autocomplete !== null) {
      const place = autocomplete.getPlace();
      if (place.geometry && place.geometry.location) {
        setFormData((prev) => ({
          ...prev,
          locationName: place.formatted_address || "",
          lat: place.geometry?.location?.lat() || null,
          lng: place.geometry?.location?.lng() || null,
        }));
      }
    }
  };

  const categories = [
    "Sports",
    "Music",
    "Art",
    "Food",
    "Tech",
    "Social",
    "Education",
    "Other",
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const eventDateTime = new Date(`${formData.eventDate}T${formData.eventTime}`);

      const { error } = await supabase.from("events").insert({
        host_id: user.id,
        title: formData.title,
        description: formData.description,
        event_date: eventDateTime.toISOString(),
        location_name: formData.locationName,
        category: formData.category,
        capacity: parseInt(formData.capacity),
        location_lat: formData.lat,
        location_lng: formData.lng,
      });

      if (error) throw error;

      toast.success("Event created successfully!");
      navigate("/my-events");
    } catch (error) {
      toast.error((error as Error).message || "Failed to create event");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="gradient-primary text-primary-foreground p-6">
        <div className="max-w-lg mx-auto">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="mb-4 text-primary-foreground hover:bg-primary-foreground/20"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">Create New Event</h1>
          <p className="opacity-90 mt-1">Share your event with the community</p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 -mt-4">
        <form onSubmit={handleSubmit} className="bg-card rounded-2xl p-6 shadow-card space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Event Title *</Label>
            <Input
              id="title"
              placeholder="e.g., Weekend Basketball Game"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              placeholder="Tell people what your event is about..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
              rows={4}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="eventDate">Date *</Label>
              <Input
                id="eventDate"
                type="date"
                value={formData.eventDate}
                onChange={(e) => setFormData({ ...formData, eventDate: e.target.value })}
                required
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="eventTime">Time *</Label>
              <Input
                id="eventTime"
                type="time"
                value={formData.eventTime}
                onChange={(e) => setFormData({ ...formData, eventTime: e.target.value })}
                required
              />
            </div>
          </div>

          {isLoaded && (
            <div className="space-y-2">
              <Label htmlFor="location">Location *</Label>
              <Autocomplete
                onLoad={(autocomplete) => setAutocomplete(autocomplete)}
                onPlaceChanged={onPlaceChanged}
              >
                <Input
                  id="location"
                  placeholder="e.g., Central Park, New York"
                  value={formData.locationName}
                  onChange={(e) => setFormData({ ...formData, locationName: e.target.value })}
                  required
                />
              </Autocomplete>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <ToggleGroup
                type="single"
                value={formData.category}
                onValueChange={(value) => {
                  if (value) setFormData({ ...formData, category: value });
                }}
                className="flex-wrap justify-start"
              >
                {categories.map((cat) => (
                  <ToggleGroupItem key={cat} value={cat} aria-label={`Toggle ${cat}`} variant="outline">
                    {cat}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </div>

            <div className="space-y-2">
              <Label htmlFor="capacity">Capacity *</Label>
              <Input
                id="capacity"
                type="number"
                min="1"
                placeholder="20"
                value={formData.capacity}
                onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                required
              />
            </div>
          </div>

          <Button
            type="submit"
            className="w-full h-12 text-base font-semibold mt-6"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Event"
            )}
          </Button>
        </form>
      </div>

      <Navigation />
    </div>
  );
};

export default CreateEvent;


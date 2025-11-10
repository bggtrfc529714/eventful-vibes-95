import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Navigation from "@/components/Navigation";
import EventCard from "@/components/EventCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Filter, Sparkles, Calendar, ChevronDown } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Label } from "@/components/ui/label";
import { getEvents } from "@/lib/events";
import { type Event } from "@/integrations/supabase/types";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Card } from "@/components/ui/card";

const suggestedInterests = [
  "Sports",
  "Music",
  "Art",
  "Food",
  "Tech",
  "Social",
  "Education",
  "Other",
  "Gaming",
  "Travel",
  "Movies",
  "Books",
  "Fashion",
  "Fitness",
  "Outdoors",
];

const Home = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<string | undefined>();
  const [isAdvancedSearchOpen, setIsAdvancedSearchOpen] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["events", { searchQuery, filter }],
    queryFn: () => getEvents({ limit: 10, offset: 0, searchText: searchQuery, filter }),
  });

  const events = data?.events || [];

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
          <Collapsible open={isAdvancedSearchOpen} onOpenChange={setIsAdvancedSearchOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="default" className="w-full justify-between">
                Advanced Filters
                <ChevronDown className={`h-4 w-4 transition-transform ${isAdvancedSearchOpen ? "rotate-180" : ""}`} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4">
              <Card className="p-4 bg-card shadow-md">
                <div className="space-y-2">
                  <Label>Filter by Interests</Label>
                  <ToggleGroup
                    type="single"
                    variant="outline"
                    value={filter}
                    onValueChange={setFilter}
                    className="flex-wrap justify-start"
                  >
                    {suggestedInterests.map((interest) => (
                      <ToggleGroupItem key={interest} value={interest}>
                        {interest}
                      </ToggleGroupItem>
                    ))}
                  </ToggleGroup>
                </div>
              </Card>
            </CollapsibleContent>
          </Collapsible>
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="h-48 w-full rounded-xl" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ))
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-destructive">Error fetching events.</p>
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No events found</p>
            </div>
          ) : (
            events.map((event: Event) => (
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
            ))
          )}
        </div>
      </div>

      <Navigation />
    </div>
  );
};

export default Home;

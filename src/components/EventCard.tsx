import { Calendar, MapPin, Users, Star } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { categoryImages } from "@/lib/category-images";

interface EventCardProps {
  id: string;
  title: string;
  description: string;
  eventDate: string;
  locationName: string;
  category: string;
  capacity: number;
  imageUrl: string | null;
  hostName: string;
  hostRating: number;
  registeredCount: number;
}

const EventCard = ({
  id,
  title,
  description,
  eventDate,
  locationName,
  category,
  capacity,
  imageUrl,
  hostName,
  hostRating,
  registeredCount,
}: EventCardProps) => {
  const displayImageUrl = imageUrl || categoryImages[category] || categoryImages["Other"];

  return (
    <Link to={`/event/${id}`}>
      <Card className="overflow-hidden shadow-card hover:shadow-elevated transition-smooth cursor-pointer">
        <div className="relative h-48 bg-gradient-primary">
          {displayImageUrl ? (
            <img
              src={displayImageUrl}
              alt={title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full gradient-primary flex items-center justify-center">
              <Calendar className="h-16 w-16 text-primary-foreground opacity-50" />
            </div>
          )}
          <div className="absolute inset-0 gradient-overlay" />
          <Badge className="absolute top-3 right-3 bg-card text-card-foreground">
            {category}
          </Badge>
        </div>

        <div className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-lg line-clamp-2 flex-1">{title}</h3>
            {hostRating && (
              <div className="flex items-center gap-1 bg-secondary/10 px-2 py-1 rounded-full">
                <Star className="h-4 w-4 fill-secondary text-secondary" />
                <span className="text-sm font-semibold text-secondary">
                  {hostRating.toFixed(1)}
                </span>
              </div>
            )}
          </div>

          <p className="text-sm text-muted-foreground line-clamp-2">
            {description}
          </p>

          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>{format(new Date(eventDate), "MMM d, yyyy • h:mm a")}</span>
            </div>

            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span className="line-clamp-1">{locationName}</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Users className="h-4 w-4" />
                <span>
                  {registeredCount} / {capacity} registered
                </span>
              </div>
              <span className="text-xs text-muted-foreground">by {hostName}</span>
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
};

export default EventCard;

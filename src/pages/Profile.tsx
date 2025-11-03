import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import Navigation from "@/components/Navigation";
import { toast } from "sonner";
import { Star, LogOut, Loader2 } from "lucide-react";

const Profile = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [profile, setProfile] = useState({
    full_name: "",
    bio: "",
    interests: [] as string[],
  });
  const [hostRating, setHostRating] = useState<number | null>(null);
  const [totalRatings, setTotalRatings] = useState(0);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) throw error;

      setProfile({
        full_name: data.full_name || "",
        bio: data.bio || "",
        interests: data.interests || [],
      });

      // Fetch host rating
      const { data: rating } = await supabase.rpc("get_host_rating", {
        host_user_id: user.id,
      });
      setHostRating(rating);

      // Fetch total ratings count
      const { data: ratings } = await supabase
        .from("event_ratings")
        .select("id")
        .eq("host_id", user.id);
      setTotalRatings(ratings?.length || 0);
    } catch (error) {
      console.error("Error fetching profile:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: profile.full_name,
          bio: profile.bio,
          interests: profile.interests,
        })
        .eq("id", user.id);

      if (error) throw error;
      toast.success("Profile updated successfully!");
    } catch (error: any) {
      toast.error(error.message || "Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="gradient-primary text-primary-foreground p-6 pb-12">
        <div className="max-w-lg mx-auto text-center">
          <Avatar className="h-24 w-24 mx-auto mb-4 border-4 border-primary-foreground">
            <AvatarFallback className="text-2xl bg-card text-card-foreground">
              {profile.full_name.charAt(0) || "?"}
            </AvatarFallback>
          </Avatar>
          <h1 className="text-2xl font-bold">{profile.full_name}</h1>
          {hostRating && (
            <div className="flex items-center justify-center gap-2 mt-2">
              <div className="flex items-center gap-1 bg-primary-foreground/20 px-3 py-1.5 rounded-full">
                <Star className="h-4 w-4 fill-primary-foreground text-primary-foreground" />
                <span className="font-semibold">{hostRating.toFixed(1)}</span>
              </div>
              <span className="text-sm opacity-90">
                ({totalRatings} rating{totalRatings !== 1 ? "s" : ""})
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 -mt-8">
        <Card className="p-6 space-y-4 shadow-elevated">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              value={profile.full_name}
              onChange={(e) =>
                setProfile({ ...profile, full_name: e.target.value })
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              placeholder="Tell people about yourself..."
              value={profile.bio}
              onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="interests">Interests (comma-separated)</Label>
            <Input
              id="interests"
              placeholder="e.g., Sports, Music, Art"
              value={profile.interests.join(", ")}
              onChange={(e) =>
                setProfile({
                  ...profile,
                  interests: e.target.value
                    .split(",")
                    .map((i) => i.trim())
                    .filter((i) => i),
                })
              }
            />
          </div>

          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full h-12 font-semibold"
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>

          <Button
            onClick={handleSignOut}
            variant="outline"
            className="w-full h-12 font-semibold"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </Card>
      </div>

      <Navigation />
    </div>
  );
};

export default Profile;

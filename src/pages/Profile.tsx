import { useState } from "react";
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
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";




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

const Profile = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [profile, setProfile] = useState({
    full_name: "",
    bio: "",
    interests: [] as string[],
  });

  const { data: session } = useQuery({
    queryKey: ["session"],
    queryFn: () => supabase.auth.getSession(),
  });

  const { data: profileDetails, isLoading: isLoadingProfile } = useQuery({
    queryKey: ["profileDetails", session?.data.session?.user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_profile_details", {
        p_user_id: session?.data.session?.user?.id ?? '',
      });
      if (error) throw error;
      return data[0]; // RPC returns an array, we expect a single object
    },
    enabled: !!session?.data.session?.user?.id,
    onSuccess: (data) => {
      if (data) {
        setProfile({
          full_name: data.full_name || "",
          bio: data.bio || "",
          interests: data.interests || [],
        });
      }
    },
  });

  const mutation = useMutation({
    mutationFn: async () => {
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
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profileDetails", session?.data.session?.user?.id] });
      toast.success("Profile updated successfully!");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update profile");
    },
  });

  const handleSave = () => {
    mutation.mutate();
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  if (isLoadingProfile) {
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
          {profileDetails?.host_rating && (
            <div className="flex items-center justify-center gap-2 mt-2">
              <div className="flex items-center gap-1 bg-primary-foreground/20 px-3 py-1.5 rounded-full">
                <Star className="h-4 w-4 fill-primary-foreground text-primary-foreground" />
                <span className="font-semibold">{profileDetails.host_rating.toFixed(1)}</span>
              </div>
              <span className="text-sm opacity-90">
                ({profileDetails.total_ratings} rating{profileDetails.total_ratings !== 1 ? "s" : ""})
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
            <Label>Interests</Label>
            <ToggleGroup
              type="multiple"
              variant="outline"
              value={profile.interests}
              onValueChange={(interests) =>
                setProfile({ ...profile, interests })
              }
              className="flex-wrap justify-start"
            >
              {suggestedInterests.map((interest) => (
                <ToggleGroupItem key={interest} value={interest}>
                  {interest}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>

          <Button
            onClick={handleSave}
            disabled={mutation.isPending}
            className="w-full h-12 font-semibold"
          >
            {mutation.isPending ? (
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


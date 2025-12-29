import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  CreditCard, 
  Camera, 
  ChevronRight,
  FileText,
  Shield,
  Settings,
  HelpCircle,
  LogOut,
  Calendar,
  Hash,
  Users,
  Pencil
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import { EditProfileDialog } from "@/components/EditProfileDialog";

export default function Profile() {
  const navigate = useNavigate();
  const { user, profile, loading, refetch } = useProfile();
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Signed out",
      description: "See you next time!",
    });
    navigate("/");
  };

  const menuItems = [
    { icon: FileText, label: "My Documents", path: "/documents" },
    { icon: Shield, label: "Insurance Policies", path: "/policies" },
    { icon: Settings, label: "Settings", path: "/settings" },
    { icon: HelpCircle, label: "Help & Support", path: "/support" },
  ];

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 glass-card border-b px-4 py-4">
        <div className="flex items-center justify-between max-w-md mx-auto">
          <h1 className="text-xl font-bold text-foreground">Profile</h1>
          <Button variant="ghost" size="icon" onClick={() => setIsEditingProfile(true)}>
            <Pencil className="w-5 h-5" />
          </Button>
        </div>
      </header>

      <main className="px-4 py-6 max-w-md mx-auto space-y-6">
        {/* Profile header */}
        <section className="flex flex-col items-center animate-slide-up">
          <div className="relative mb-4">
            <div className="w-24 h-24 rounded-full bg-secondary flex items-center justify-center">
              <User className="w-10 h-10 text-muted-foreground" />
            </div>
            <button className="absolute bottom-0 right-0 p-2 rounded-full bg-primary text-primary-foreground">
              <Camera className="w-4 h-4" />
            </button>
          </div>
          <h2 className="text-xl font-bold text-foreground">
            {profile?.full_name || user?.email?.split("@")[0] || "Driver"}
          </h2>
          <p className="text-sm text-muted-foreground">{user?.email}</p>
        </section>

        {/* Personal Information */}
        <section className="glass-card rounded-2xl p-5 space-y-4 animate-slide-up" style={{ animationDelay: "0.1s" }}>
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-foreground">Personal Information</h3>
            <Button variant="ghost" size="sm" onClick={() => setIsEditingProfile(true)}>
              <Pencil className="w-4 h-4" />
            </Button>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-border">
              <span className="text-muted-foreground flex items-center gap-2 text-sm">
                <User className="w-4 h-4" /> Full Name
              </span>
              <span className="text-foreground font-medium">{profile?.full_name || "N/A"}</span>
            </div>

            <div className="flex items-center justify-between py-2 border-b border-border">
              <span className="text-muted-foreground flex items-center gap-2 text-sm">
                <Hash className="w-4 h-4" /> ID Number
              </span>
              <span className="text-foreground font-medium">{profile?.id_number || "N/A"}</span>
            </div>

            <div className="flex items-center justify-between py-2 border-b border-border">
              <span className="text-muted-foreground flex items-center gap-2 text-sm">
                <Users className="w-4 h-4" /> Gender
              </span>
              <span className="text-foreground font-medium">{profile?.gender || "N/A"}</span>
            </div>

            <div className="flex items-center justify-between py-2 border-b border-border">
              <span className="text-muted-foreground flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4" /> Date of Birth
              </span>
              <span className="text-foreground font-medium">{formatDate(profile?.date_of_birth)}</span>
            </div>

            <div className="flex items-center justify-between py-2 border-b border-border">
              <span className="text-muted-foreground flex items-center gap-2 text-sm">
                <Mail className="w-4 h-4" /> Email
              </span>
              <span className="text-foreground font-medium text-right max-w-[60%] truncate">{user?.email || "N/A"}</span>
            </div>

            <div className="flex items-center justify-between py-2 border-b border-border">
              <span className="text-muted-foreground flex items-center gap-2 text-sm">
                <Phone className="w-4 h-4" /> Phone
              </span>
              <span className="text-foreground font-medium">{profile?.phone || "N/A"}</span>
            </div>

            <div className="flex items-center justify-between py-2">
              <span className="text-muted-foreground flex items-center gap-2 text-sm">
                <MapPin className="w-4 h-4" /> Address
              </span>
              <span className="text-foreground font-medium text-right max-w-[60%]">{profile?.address || "N/A"}</span>
            </div>
          </div>
        </section>

        {/* License Information */}
        <section className="glass-card rounded-2xl p-5 space-y-4 animate-slide-up" style={{ animationDelay: "0.15s" }}>
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-foreground">License Information</h3>
            <Button variant="ghost" size="sm" onClick={() => setIsEditingProfile(true)}>
              <Pencil className="w-4 h-4" />
            </Button>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-border">
              <span className="text-muted-foreground flex items-center gap-2 text-sm">
                <CreditCard className="w-4 h-4" /> License Number
              </span>
              <span className="text-foreground font-medium">{profile?.license_number || "N/A"}</span>
            </div>

            <div className="flex items-center justify-between py-2 border-b border-border">
              <span className="text-muted-foreground flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4" /> Year of Issue
              </span>
              <span className="text-foreground font-medium">{profile?.license_year_of_issue || "N/A"}</span>
            </div>

            <div className="flex items-center justify-between py-2">
              <span className="text-muted-foreground flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4" /> Expiry Date
              </span>
              <span className="text-foreground font-medium">{formatDate(profile?.license_expiry)}</span>
            </div>
          </div>
        </section>

        {/* Menu items */}
        <section className="glass-card rounded-2xl overflow-hidden animate-slide-up" style={{ animationDelay: "0.2s" }}>
          {menuItems.map((item, index) => (
            <button
              key={index}
              className="w-full flex items-center justify-between p-4 hover:bg-secondary/50 transition-colors border-b border-border last:border-0"
              onClick={() => item.path === "/policies" ? navigate("/my-policies") : toast({ title: "Coming soon", description: `${item.label} feature is under development.` })}
            >
              <div className="flex items-center gap-3">
                <item.icon className="w-5 h-5 text-muted-foreground" />
                <span className="text-foreground">{item.label}</span>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
          ))}
        </section>

        {/* Sign out */}
        <Button
          variant="outline"
          className="w-full text-destructive hover:bg-destructive/10"
          onClick={handleSignOut}
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </Button>
      </main>

      {/* Edit Profile Dialog */}
      <EditProfileDialog
        open={isEditingProfile}
        onOpenChange={setIsEditingProfile}
        profile={profile}
        userId={user?.id || ""}
        onSave={refetch}
      />

      <BottomNav />
    </div>
  );
}
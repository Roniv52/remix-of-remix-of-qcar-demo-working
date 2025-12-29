import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { BottomNav } from "@/components/BottomNav";
import { Logo } from "@/components/Logo";
import { QRDisplay } from "@/components/QRDisplay";
import { PolicyCard } from "@/components/PolicyCard";
import { Button } from "@/components/ui/button";
import { useProfile } from "@/hooks/useProfile";
import { 
  QrCode, 
  FileText, 
  Plus, 
  ChevronRight, 
  Bell,
  LogOut,
  Clock,
  AlertCircle,
  Trash2
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Claim {
  id: string;
  incident_location: string | null;
  incident_time: string | null;
  status: string | null;
  description: string | null;
  created_at: string;
  other_party_name: string | null;
  other_party_vehicle: string | null;
  photos: string[] | null;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, profile, vehicles, policies, loading, needsOnboarding } = useProfile();
  const [showQR, setShowQR] = useState(false);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [claimsLoading, setClaimsLoading] = useState(true);
  const [claimToDelete, setClaimToDelete] = useState<string | null>(null);

  // Fetch claims
  useEffect(() => {
    const fetchClaims = async () => {
      if (!user) return;
      
      const { data, error } = await supabase
        .from("claims")
        .select("id, incident_location, incident_time, status, description, created_at, other_party_name, other_party_vehicle, photos")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5);
      
      if (!error && data) {
        setClaims(data);
      }
      setClaimsLoading(false);
    };

    if (user) {
      fetchClaims();
    }
  }, [user]);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/");
    } else if (!loading && needsOnboarding && user) {
      navigate("/onboarding");
    }
  }, [loading, user, needsOnboarding, navigate]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Signed out",
      description: "See you next time!",
    });
    navigate("/");
  };

  const handleDeleteClaim = async (claimId: string) => {
    try {
      const { error } = await supabase
        .from("claims")
        .delete()
        .eq("id", claimId);

      if (error) throw error;

      setClaims(claims.filter(c => c.id !== claimId));
      toast({
        title: "Claim deleted",
        description: "The claim has been removed.",
      });
    } catch (error) {
      toast({
        title: "Delete failed",
        description: error instanceof Error ? error.message : "Could not delete claim",
        variant: "destructive",
      });
    }
    setClaimToDelete(null);
  };

  // Generate QR URL with token for secure sharing (no personal data in QR)
  const policyToken = (policies[0] as any)?.token;
  const qrUrl = policyToken 
    ? `${window.location.origin}/p/${policyToken}`
    : "";

  const displayName = profile?.full_name || user?.email?.split("@")[0] || "Driver";

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 glass-card border-b px-4 py-3">
        <div className="flex items-center justify-between max-w-md mx-auto">
          <Logo size="sm" />
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleSignOut}>
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="px-4 py-6 max-w-md mx-auto space-y-8">
        {/* Welcome section */}
        <section className="animate-slide-up">
          <p className="text-muted-foreground mb-1">Welcome back,</p>
          <h1 className="text-2xl font-bold text-foreground">
            {displayName}
          </h1>
        </section>

        {/* Quick QR Action */}
        <section className="animate-slide-up" style={{ animationDelay: "0.1s" }}>
          {showQR ? (
            <div className="space-y-4">
              {qrUrl ? (
                <QRDisplay
                  value={qrUrl}
                  userName={displayName}
                />
              ) : (
                <div className="glass-card rounded-2xl p-6 text-center">
                  <p className="text-muted-foreground text-sm">
                    Add a policy to generate your QR code
                  </p>
                </div>
              )}
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setShowQR(false)}
              >
                Hide QR Code
              </Button>
            </div>
          ) : (
            <Button
              variant="hero"
              size="xl"
              className="w-full"
              onClick={() => setShowQR(true)}
            >
              <QrCode className="w-5 h-5" />
              Show My QR
            </Button>
          )}
        </section>

        {/* Quick Actions */}
        <section className="animate-slide-up" style={{ animationDelay: "0.2s" }}>
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="glass"
              className="h-auto flex-col gap-2 py-4"
              onClick={() => navigate("/scan")}
            >
              <QrCode className="w-6 h-6 text-primary" />
              <span>Scan QR</span>
            </Button>
            <Button
              variant="glass"
              className="h-auto flex-col gap-2 py-4"
              onClick={() => navigate("/my-policies")}
            >
              <FileText className="w-6 h-6 text-primary" />
              <span>My Policies</span>
            </Button>
          </div>
        </section>

        {/* Policies section */}
        <section className="animate-slide-up" style={{ animationDelay: "0.3s" }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">My Vehicles</h2>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-primary"
              onClick={() => navigate("/my-policies")}
            >
              <Plus className="w-4 h-4" />
              Add
            </Button>
          </div>

          {policies.length > 0 ? (
            <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 snap-x snap-mandatory">
              {policies.map((policy) => (
                <div key={policy.id} className="snap-center shrink-0">
                  <PolicyCard
                    vehicleNumber={policy.vehicle?.vehicle_number || "No plate"}
                    carType={policy.vehicle ? `${policy.vehicle.make || ""} ${policy.vehicle.model || ""}`.trim() : "Unknown"}
                    color={policy.vehicle?.color || "N/A"}
                    year={policy.vehicle?.year?.toString() || "N/A"}
                    coverageType={policy.coverage_type || "N/A"}
                    insuranceCompany={policy.insurance_company || "N/A"}
                    validUntil={policy.valid_until || "N/A"}
                    isActive={policy.is_active}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="glass-card rounded-2xl p-6 text-center">
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-secondary flex items-center justify-center">
                <FileText className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground text-sm mb-4">
                No vehicles added yet
              </p>
              <Button variant="outline" size="sm" onClick={() => navigate("/my-policies")}>
                <Plus className="w-4 h-4" />
                Add Vehicle
              </Button>
            </div>
          )}
        </section>

        {/* Recent Claims */}
        <section className="animate-slide-up" style={{ animationDelay: "0.4s" }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">
              My Accidents & Claims
            </h2>
            {claims.length > 0 && (
              <Button variant="ghost" size="sm" className="text-muted-foreground">
                View all
                <ChevronRight className="w-4 h-4" />
              </Button>
            )}
          </div>

          {claimsLoading ? (
            <div className="glass-card rounded-2xl p-6 text-center">
              <p className="text-muted-foreground text-sm animate-pulse">Loading claims...</p>
            </div>
          ) : claims.length > 0 ? (
            <div className="space-y-3">
              {claims.map((claim) => (
                <div 
                  key={claim.id} 
                  className="glass-card rounded-xl p-4 cursor-pointer hover:border-primary/50 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div 
                      className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0"
                      onClick={() => navigate(`/claim/${claim.id}`)}
                    >
                      <AlertCircle className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0" onClick={() => navigate(`/claim/${claim.id}`)}>
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium text-foreground truncate">
                          {claim.incident_location || "Unknown Location"}
                        </p>
                        <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${
                          claim.status === "submitted" 
                            ? "bg-success/20 text-success" 
                            : "bg-secondary text-muted-foreground"
                        }`}>
                          {claim.status || "Draft"}
                        </span>
                      </div>
                      
                      {/* Other party info */}
                      {claim.other_party_name && (
                        <p className="text-sm text-primary mt-1">
                          vs. {claim.other_party_name} {claim.other_party_vehicle ? `(${claim.other_party_vehicle})` : ''}
                        </p>
                      )}
                      
                      <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
                        {claim.description || "No description"}
                      </p>
                      
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(claim.created_at).toLocaleDateString()}
                          </span>
                          {claim.photos && claim.photos.length > 0 && (
                            <span className="flex items-center gap-1">
                              📷 {claim.photos.length}
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-primary">View Report →</span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="shrink-0 text-destructive hover:bg-destructive/10"
                      onClick={(e) => {
                        e.stopPropagation();
                        setClaimToDelete(claim.id);
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="glass-card rounded-2xl p-6 text-center">
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-secondary flex items-center justify-center">
                <FileText className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground text-sm">
                No claims yet. Stay safe on the road!
              </p>
            </div>
          )}
        </section>
      </main>

      {/* Delete Claim Confirmation */}
      <AlertDialog open={!!claimToDelete} onOpenChange={() => setClaimToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Claim</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this claim? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => claimToDelete && handleDeleteClaim(claimToDelete)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <BottomNav />
    </div>
  );
}

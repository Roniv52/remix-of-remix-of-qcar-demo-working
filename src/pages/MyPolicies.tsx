import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useProfile } from "@/hooks/useProfile";
import { toast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  ArrowLeft, 
  Plus, 
  Car, 
  Shield, 
  Camera,
  Loader2,
  Trash2,
  Edit2,
  Upload,
  Pencil
} from "lucide-react";
import { EditPolicyDialog } from "@/components/EditPolicyDialog";
import { Policy, Vehicle } from "@/hooks/useProfile";

export default function MyPolicies() {
  const navigate = useNavigate();
  const { user, vehicles, policies, refetch } = useProfile();
  const [isAddingVehicle, setIsAddingVehicle] = useState(false);
  const [isAddingPolicy, setIsAddingPolicy] = useState(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<Policy | null>(null);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [vehicleForm, setVehicleForm] = useState({
    vehicle_number: "",
    make: "",
    model: "",
    year: "",
    color: "",
    vin: "",
  });

  const [policyForm, setPolicyForm] = useState({
    policy_number: "",
    insurance_company: "",
    coverage_type: "",
    valid_from: "",
    valid_until: "",
  });

  const handleScanPolicy = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;
        
        const { data, error } = await supabase.functions.invoke("ocr-extract", {
          body: { imageBase64: base64, documentType: "policy" },
        });

        if (error) throw error;
        if (!data.success) throw new Error(data.error || "Failed to extract data");

        // Fill forms with extracted data
        setVehicleForm({
          vehicle_number: data.data.vehicle_number || "",
          make: data.data.vehicle_make || "",
          model: data.data.vehicle_model || "",
          year: data.data.vehicle_year || "",
          color: data.data.vehicle_color || "",
          vin: data.data.vin || "",
        });

        setPolicyForm({
          policy_number: data.data.policy_number || "",
          insurance_company: data.data.insurance_company || "",
          coverage_type: data.data.coverage_type || "",
          valid_from: data.data.valid_from || "",
          valid_until: data.data.valid_until || "",
        });

        toast({
          title: "Document scanned!",
          description: "Policy information extracted. Please review and save.",
        });

        setIsAddingVehicle(true);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Scan error:", error);
      toast({
        title: "Scan failed",
        description: error instanceof Error ? error.message : "Could not read document",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleAddVehicle = async () => {
    if (!user || !vehicleForm.vehicle_number) return;

    setIsProcessing(true);
    try {
      const { data: vehicle, error: vehicleError } = await supabase
        .from("vehicles")
        .insert({
          user_id: user.id,
          vehicle_number: vehicleForm.vehicle_number,
          make: vehicleForm.make || null,
          model: vehicleForm.model || null,
          year: vehicleForm.year ? parseInt(vehicleForm.year) : null,
          color: vehicleForm.color || null,
          vin: vehicleForm.vin || null,
        })
        .select()
        .single();

      if (vehicleError) throw vehicleError;

      // If we have policy data, create policy too
      if (policyForm.insurance_company || policyForm.policy_number) {
        const { error: policyError } = await supabase
          .from("policies")
          .insert({
            user_id: user.id,
            vehicle_id: vehicle.id,
            policy_number: policyForm.policy_number || null,
            insurance_company: policyForm.insurance_company || null,
            coverage_type: policyForm.coverage_type || null,
            valid_from: policyForm.valid_from || null,
            valid_until: policyForm.valid_until || null,
            is_active: true,
          });

        if (policyError) throw policyError;
      }

      toast({
        title: "Vehicle added!",
        description: "Your vehicle and policy have been saved.",
      });

      setIsAddingVehicle(false);
      resetForms();
      refetch();
    } catch (error) {
      console.error("Add error:", error);
      toast({
        title: "Failed to add",
        description: error instanceof Error ? error.message : "Could not save vehicle",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteVehicle = async (vehicleId: string) => {
    try {
      const { error } = await supabase
        .from("vehicles")
        .delete()
        .eq("id", vehicleId);

      if (error) throw error;

      toast({
        title: "Vehicle deleted",
        description: "The vehicle and its policies have been removed.",
      });

      refetch();
    } catch (error) {
      toast({
        title: "Delete failed",
        description: error instanceof Error ? error.message : "Could not delete vehicle",
        variant: "destructive",
      });
    }
  };

  const resetForms = () => {
    setVehicleForm({
      vehicle_number: "",
      make: "",
      model: "",
      year: "",
      color: "",
      vin: "",
    });
    setPolicyForm({
      policy_number: "",
      insurance_company: "",
      coverage_type: "",
      valid_from: "",
      valid_until: "",
    });
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 glass-card border-b px-4 py-4">
        <div className="flex items-center gap-3 max-w-md mx-auto">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="font-semibold text-foreground">My Vehicles & Policies</h1>
        </div>
      </header>

      <main className="px-4 py-6 max-w-md mx-auto space-y-6">
        {/* Add new */}
        <div className="space-y-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf"
            capture="environment"
            className="hidden"
            onChange={handleScanPolicy}
          />
          
          <Button
            variant="hero"
            size="lg"
            className="w-full"
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Camera className="w-5 h-5" />
            )}
            {isProcessing ? "Processing..." : "Scan Insurance Card"}
          </Button>

          <Button
            variant="outline"
            size="lg"
            className="w-full"
            onClick={() => setIsAddingVehicle(true)}
          >
            <Plus className="w-5 h-5" />
            Add Manually
          </Button>
        </div>

        {/* Vehicles list */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Your Vehicles</h2>
          
          {vehicles.length === 0 ? (
            <div className="glass-card rounded-2xl p-6 text-center">
              <Car className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
              <p className="text-muted-foreground">No vehicles added yet</p>
            </div>
          ) : (
            vehicles.map((vehicle) => {
              const vehiclePolicy = policies.find(p => p.vehicle_id === vehicle.id);
              return (
                <div key={vehicle.id} className="glass-card rounded-2xl p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-primary/10">
                        <Car className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">{vehicle.vehicle_number}</p>
                        <p className="text-sm text-muted-foreground">
                          {vehicle.make} {vehicle.model} {vehicle.year}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditingVehicle(vehicle);
                          setEditingPolicy(vehiclePolicy || null);
                        }}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive"
                        onClick={() => handleDeleteVehicle(vehicle.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Vehicle Details */}
                  <div className="pt-3 border-t border-border space-y-2">
                    <h4 className="text-xs font-medium text-muted-foreground uppercase">Vehicle Details</h4>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-muted-foreground">Type: </span>
                        <span className="text-foreground">{vehicle.vehicle_type || "N/A"}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Color: </span>
                        <span className="text-foreground">{vehicle.color || "N/A"}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Year: </span>
                        <span className="text-foreground">{vehicle.year || "N/A"}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">VIN: </span>
                        <span className="text-foreground">{vehicle.vin || "N/A"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Policy Details */}
                  {vehiclePolicy && (
                    <div className="pt-3 border-t border-border space-y-2">
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-primary" />
                        <span className="text-sm font-medium text-foreground">
                          {vehiclePolicy.insurance_company}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-muted-foreground">Policy #: </span>
                          <span className="text-foreground">{vehiclePolicy.policy_number || "N/A"}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Coverage: </span>
                          <span className="text-foreground">{vehiclePolicy.coverage_type || "N/A"}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Holder: </span>
                          <span className="text-foreground">{vehiclePolicy.policyholder_name || "N/A"}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Holder ID: </span>
                          <span className="text-foreground">{vehiclePolicy.policyholder_id || "N/A"}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Agent: </span>
                          <span className="text-foreground">{vehiclePolicy.agent_name || "N/A"}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Valid From: </span>
                          <span className="text-foreground">{vehiclePolicy.valid_from || "N/A"}</span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-muted-foreground">Valid Until: </span>
                          <span className="text-foreground font-medium">{vehiclePolicy.valid_until || "N/A"}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </main>

      {/* Add Vehicle Dialog */}
      <Dialog open={isAddingVehicle} onOpenChange={setIsAddingVehicle}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Vehicle & Policy</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-3">
              <h3 className="font-medium text-sm text-foreground">Vehicle Details</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <Label className="text-xs">License Plate *</Label>
                  <Input
                    value={vehicleForm.vehicle_number}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, vehicle_number: e.target.value })}
                    placeholder="ABC 1234"
                  />
                </div>
                <div>
                  <Label className="text-xs">Make</Label>
                  <Input
                    value={vehicleForm.make}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, make: e.target.value })}
                    placeholder="Toyota"
                  />
                </div>
                <div>
                  <Label className="text-xs">Model</Label>
                  <Input
                    value={vehicleForm.model}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, model: e.target.value })}
                    placeholder="Camry"
                  />
                </div>
                <div>
                  <Label className="text-xs">Year</Label>
                  <Input
                    value={vehicleForm.year}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, year: e.target.value })}
                    placeholder="2022"
                  />
                </div>
                <div>
                  <Label className="text-xs">Color</Label>
                  <Input
                    value={vehicleForm.color}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, color: e.target.value })}
                    placeholder="Silver"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="font-medium text-sm text-foreground">Insurance Policy</h3>
              <div className="space-y-3">
                <div>
                  <Label className="text-xs">Insurance Company</Label>
                  <Input
                    value={policyForm.insurance_company}
                    onChange={(e) => setPolicyForm({ ...policyForm, insurance_company: e.target.value })}
                    placeholder="SafeDrive Insurance"
                  />
                </div>
                <div>
                  <Label className="text-xs">Policy Number</Label>
                  <Input
                    value={policyForm.policy_number}
                    onChange={(e) => setPolicyForm({ ...policyForm, policy_number: e.target.value })}
                    placeholder="POL-123456"
                  />
                </div>
                <div>
                  <Label className="text-xs">Coverage Type</Label>
                  <Input
                    value={policyForm.coverage_type}
                    onChange={(e) => setPolicyForm({ ...policyForm, coverage_type: e.target.value })}
                    placeholder="Comprehensive"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Valid From</Label>
                    <Input
                      type="date"
                      value={policyForm.valid_from}
                      onChange={(e) => setPolicyForm({ ...policyForm, valid_from: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Valid Until</Label>
                    <Input
                      type="date"
                      value={policyForm.valid_until}
                      onChange={(e) => setPolicyForm({ ...policyForm, valid_until: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            </div>

            <Button
              variant="hero"
              className="w-full"
              onClick={handleAddVehicle}
              disabled={!vehicleForm.vehicle_number || isProcessing}
            >
              {isProcessing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              Save Vehicle & Policy
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Policy Dialog */}
      <EditPolicyDialog
        open={!!editingPolicy || !!editingVehicle}
        onOpenChange={(open) => {
          if (!open) {
            setEditingPolicy(null);
            setEditingVehicle(null);
          }
        }}
        policy={editingPolicy}
        vehicle={editingVehicle}
        onSave={refetch}
      />

      <BottomNav />
    </div>
  );
}

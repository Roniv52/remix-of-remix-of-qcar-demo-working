import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { Policy, Vehicle } from "@/hooks/useProfile";

interface EditPolicyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  policy: Policy | null;
  vehicle: Vehicle | null;
  onSave: () => void;
}

export function EditPolicyDialog({
  open,
  onOpenChange,
  policy,
  vehicle,
  onSave,
}: EditPolicyDialogProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [vehicleForm, setVehicleForm] = useState({
    vehicle_number: "",
    make: "",
    model: "",
    year: "",
    color: "",
    vin: "",
    vehicle_type: "",
  });
  const [policyForm, setPolicyForm] = useState({
    policy_number: "",
    insurance_company: "",
    coverage_type: "",
    valid_from: "",
    valid_until: "",
    policyholder_name: "",
    policyholder_id: "",
    agent_name: "",
  });

  useEffect(() => {
    if (vehicle) {
      setVehicleForm({
        vehicle_number: vehicle.vehicle_number || "",
        make: vehicle.make || "",
        model: vehicle.model || "",
        year: vehicle.year?.toString() || "",
        color: vehicle.color || "",
        vin: vehicle.vin || "",
        vehicle_type: vehicle.vehicle_type || "",
      });
    }
    if (policy) {
      setPolicyForm({
        policy_number: policy.policy_number || "",
        insurance_company: policy.insurance_company || "",
        coverage_type: policy.coverage_type || "",
        valid_from: policy.valid_from || "",
        valid_until: policy.valid_until || "",
        policyholder_name: policy.policyholder_name || "",
        policyholder_id: policy.policyholder_id || "",
        agent_name: policy.agent_name || "",
      });
    }
  }, [vehicle, policy]);

  const handleSave = async () => {
    if (!vehicle || !policy) return;
    
    setIsProcessing(true);
    try {
      // Update vehicle
      const { error: vehicleError } = await supabase
        .from("vehicles")
        .update({
          vehicle_number: vehicleForm.vehicle_number,
          make: vehicleForm.make || null,
          model: vehicleForm.model || null,
          year: vehicleForm.year ? parseInt(vehicleForm.year) : null,
          color: vehicleForm.color || null,
          vin: vehicleForm.vin || null,
          vehicle_type: vehicleForm.vehicle_type || null,
        })
        .eq("id", vehicle.id);

      if (vehicleError) throw vehicleError;

      // Update policy
      const { error: policyError } = await supabase
        .from("policies")
        .update({
          policy_number: policyForm.policy_number || null,
          insurance_company: policyForm.insurance_company || null,
          coverage_type: policyForm.coverage_type || null,
          valid_from: policyForm.valid_from || null,
          valid_until: policyForm.valid_until || null,
          policyholder_name: policyForm.policyholder_name || null,
          policyholder_id: policyForm.policyholder_id || null,
          agent_name: policyForm.agent_name || null,
        })
        .eq("id", policy.id);

      if (policyError) throw policyError;

      toast({
        title: "Policy updated",
        description: "Your vehicle and policy have been saved.",
      });
      onSave();
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Update failed",
        description: error instanceof Error ? error.message : "Could not update policy",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Vehicle & Policy</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Vehicle Details */}
          <div className="space-y-3">
            <h3 className="font-medium text-sm text-foreground">Vehicle Details</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label className="text-xs">License Plate</Label>
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
              <div>
                <Label className="text-xs">Type</Label>
                <Input
                  value={vehicleForm.vehicle_type}
                  onChange={(e) => setVehicleForm({ ...vehicleForm, vehicle_type: e.target.value })}
                  placeholder="Sedan"
                />
              </div>
              <div>
                <Label className="text-xs">VIN</Label>
                <Input
                  value={vehicleForm.vin}
                  onChange={(e) => setVehicleForm({ ...vehicleForm, vin: e.target.value })}
                  placeholder="VIN123456"
                />
              </div>
            </div>
          </div>

          {/* Policy Details */}
          <div className="space-y-3">
            <h3 className="font-medium text-sm text-foreground">Insurance Policy</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
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
              <div>
                <Label className="text-xs">Policyholder Name</Label>
                <Input
                  value={policyForm.policyholder_name}
                  onChange={(e) => setPolicyForm({ ...policyForm, policyholder_name: e.target.value })}
                  placeholder="John Doe"
                />
              </div>
              <div>
                <Label className="text-xs">Policyholder ID</Label>
                <Input
                  value={policyForm.policyholder_id}
                  onChange={(e) => setPolicyForm({ ...policyForm, policyholder_id: e.target.value })}
                  placeholder="123456789"
                />
              </div>
              <div className="col-span-2">
                <Label className="text-xs">Agent Name</Label>
                <Input
                  value={policyForm.agent_name}
                  onChange={(e) => setPolicyForm({ ...policyForm, agent_name: e.target.value })}
                  placeholder="Agent Smith"
                />
              </div>
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

          <Button
            variant="hero"
            className="w-full"
            onClick={handleSave}
            disabled={isProcessing}
          >
            {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

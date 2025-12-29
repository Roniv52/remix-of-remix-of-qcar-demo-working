import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/Logo";
import { toast } from "@/hooks/use-toast";
import { 
  Camera, 
  Upload, 
  FileText, 
  Shield, 
  Check, 
  Loader2,
  ArrowRight,
  ArrowLeft,
  User,
  Car
} from "lucide-react";
import { cn } from "@/lib/utils";

interface LicenseData {
  full_name: string | null;
  id_number: string | null;
  gender: string | null;
  date_of_birth: string | null;
  license_number: string | null;
  license_year_of_issue: number | null;
  license_expiry: string | null;
  phone: string | null;
  address: string | null;
}

interface PolicyData {
  policy_number: string | null;
  insurance_company: string | null;
  policyholder_name: string | null;
  policyholder_id: string | null;
  vehicle_number: string | null;
  vehicle_type: string | null;
  vehicle_color: string | null;
  vehicle_make: string | null;
  vehicle_model: string | null;
  vehicle_year: number | null;
  coverage_type: string | null;
  valid_from: string | null;
  valid_until: string | null;
  agent_name: string | null;
}

export default function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [licenseData, setLicenseData] = useState<LicenseData>({
    full_name: null,
    id_number: null,
    gender: null,
    date_of_birth: null,
    license_number: null,
    license_year_of_issue: null,
    license_expiry: null,
    phone: null,
    address: null,
  });
  
  const [policyData, setPolicyData] = useState<PolicyData>({
    policy_number: null,
    insurance_company: null,
    policyholder_name: null,
    policyholder_id: null,
    vehicle_number: null,
    vehicle_type: null,
    vehicle_color: null,
    vehicle_make: null,
    vehicle_model: null,
    vehicle_year: null,
    coverage_type: null,
    valid_from: null,
    valid_until: null,
    agent_name: null,
  });

  const [licenseScanned, setLicenseScanned] = useState(false);
  const [policyScanned, setPolicyScanned] = useState(false);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>, documentType: "license" | "policy") => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;
        
        const { data, error } = await supabase.functions.invoke("ocr-extract", {
          body: { imageBase64: base64, documentType },
        });

        if (error) {
          throw error;
        }

        if (!data.success) {
          throw new Error(data.error || "Failed to extract data");
        }

        if (documentType === "license") {
          setLicenseData(prev => ({
            ...prev,
            ...data.data,
          }));
          setLicenseScanned(true);
          toast({
            title: "License scanned!",
            description: "Your driver license information has been extracted.",
          });
        } else {
          setPolicyData(prev => ({
            ...prev,
            ...data.data,
          }));
          setPolicyScanned(true);
          toast({
            title: "Policy scanned!",
            description: "Your insurance policy information has been extracted.",
          });
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("OCR error:", error);
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

  const handleSaveAndContinue = async () => {
    setIsProcessing(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Upsert profile with license data (insert if not exists, update if exists)
      const { error: profileError } = await supabase
        .from("profiles")
        .upsert({
          user_id: user.id,
          full_name: licenseData.full_name,
          id_number: licenseData.id_number,
          gender: licenseData.gender,
          date_of_birth: licenseData.date_of_birth,
          license_number: licenseData.license_number,
          license_year_of_issue: licenseData.license_year_of_issue,
          license_expiry: licenseData.license_expiry,
          phone: licenseData.phone,
          address: licenseData.address,
        }, { onConflict: 'user_id' });

      if (profileError) throw profileError;

      // Create vehicle if we have vehicle data
      if (policyData.vehicle_number) {
        const { data: vehicle, error: vehicleError } = await supabase
          .from("vehicles")
          .insert({
            user_id: user.id,
            vehicle_number: policyData.vehicle_number,
            vehicle_type: policyData.vehicle_type,
            color: policyData.vehicle_color,
            make: policyData.vehicle_make,
            model: policyData.vehicle_model,
            year: policyData.vehicle_year,
          })
          .select()
          .single();

        if (vehicleError) throw vehicleError;

        // Create policy linked to vehicle
        if (policyData.policy_number || policyData.insurance_company) {
          const { error: policyError } = await supabase
            .from("policies")
            .insert({
              user_id: user.id,
              vehicle_id: vehicle.id,
              policy_number: policyData.policy_number,
              insurance_company: policyData.insurance_company,
              policyholder_name: policyData.policyholder_name,
              policyholder_id: policyData.policyholder_id,
              coverage_type: policyData.coverage_type,
              valid_from: policyData.valid_from,
              valid_until: policyData.valid_until,
              agent_name: policyData.agent_name,
              is_active: true,
            });

          if (policyError) throw policyError;
        }
      }

      toast({
        title: "Setup complete!",
        description: "Your profile and vehicle have been saved.",
      });

      navigate("/dashboard");
    } catch (error) {
      console.error("Save error:", error);
      toast({
        title: "Save failed",
        description: error instanceof Error ? error.message : "Could not save data",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSkip = () => {
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="px-4 py-6">
        <Logo size="sm" />
      </header>

      {/* Progress */}
      <div className="h-1 bg-secondary">
        <div
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${(step / 3) * 100}%` }}
        />
      </div>

      <main className="flex-1 px-4 py-6 max-w-md mx-auto w-full overflow-y-auto">
        {step === 1 && (
          <div className="space-y-6 animate-slide-up">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/20 flex items-center justify-center">
                <FileText className="w-8 h-8 text-primary" />
              </div>
              <h1 className="text-2xl font-bold text-foreground mb-2">
                Scan Your Driver License
              </h1>
              <p className="text-muted-foreground">
                Take a photo or upload your license to auto-fill your details
              </p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf"
              capture="environment"
              className="hidden"
              onChange={(e) => handleFileSelect(e, "license")}
            />

            <div className="space-y-3">
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
                {isProcessing ? "Processing..." : "Take Photo / Upload"}
              </Button>

              {licenseScanned && (
                <div className="glass-card rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-2 text-success">
                    <Check className="w-5 h-5" />
                    <span className="font-medium">License scanned</span>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Name</span>
                      <span className="text-foreground">{licenseData.full_name || "-"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">ID Number</span>
                      <span className="text-foreground">{licenseData.id_number || "-"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">License #</span>
                      <span className="text-foreground">{licenseData.license_number || "-"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Expires</span>
                      <span className="text-foreground">{licenseData.license_expiry || "-"}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={handleSkip}>
                Skip for now
              </Button>
              <Button
                variant="hero"
                className="flex-1"
                onClick={() => setStep(2)}
                disabled={!licenseScanned}
              >
                Continue
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 animate-slide-up">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/20 flex items-center justify-center">
                <Shield className="w-8 h-8 text-primary" />
              </div>
              <h1 className="text-2xl font-bold text-foreground mb-2">
                Scan Insurance Policy
              </h1>
              <p className="text-muted-foreground">
                Take a photo of your insurance card or upload the policy document
              </p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf"
              capture="environment"
              className="hidden"
              onChange={(e) => handleFileSelect(e, "policy")}
            />

            <div className="space-y-3">
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
                  <Upload className="w-5 h-5" />
                )}
                {isProcessing ? "Processing..." : "Take Photo / Upload"}
              </Button>

              {policyScanned && (
                <div className="glass-card rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-2 text-success">
                    <Check className="w-5 h-5" />
                    <span className="font-medium">Policy scanned</span>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Company</span>
                      <span className="text-foreground">{policyData.insurance_company || "-"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Policy #</span>
                      <span className="text-foreground">{policyData.policy_number || "-"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Vehicle</span>
                      <span className="text-foreground">
                        {policyData.vehicle_number || "-"} {policyData.vehicle_type}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Valid until</span>
                      <span className="text-foreground">{policyData.valid_until || "-"}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
              <Button
                variant="hero"
                className="flex-1"
                onClick={() => setStep(3)}
              >
                Continue
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6 animate-slide-up pb-8">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-success/20 flex items-center justify-center">
                <Check className="w-8 h-8 text-success" />
              </div>
              <h1 className="text-2xl font-bold text-foreground mb-2">
                Review Your Details
              </h1>
              <p className="text-muted-foreground">
                Confirm everything looks correct
              </p>
            </div>

            <div className="space-y-4">
              {/* Driver info */}
              <div className="glass-card rounded-xl p-4 space-y-4">
                <div className="flex items-center gap-2">
                  <User className="w-5 h-5 text-primary" />
                  <h3 className="font-semibold text-foreground">Driver Information</h3>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <Label className="text-muted-foreground text-xs">Full Name</Label>
                    <Input
                      value={licenseData.full_name || ""}
                      onChange={(e) => setLicenseData({ ...licenseData, full_name: e.target.value })}
                      className="bg-secondary"
                    />
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">ID Number</Label>
                    <Input
                      value={licenseData.id_number || ""}
                      onChange={(e) => setLicenseData({ ...licenseData, id_number: e.target.value })}
                      className="bg-secondary"
                    />
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Gender</Label>
                    <Input
                      value={licenseData.gender || ""}
                      onChange={(e) => setLicenseData({ ...licenseData, gender: e.target.value })}
                      className="bg-secondary"
                    />
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Date of Birth</Label>
                    <Input
                      type="date"
                      value={licenseData.date_of_birth || ""}
                      onChange={(e) => setLicenseData({ ...licenseData, date_of_birth: e.target.value })}
                      className="bg-secondary"
                    />
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">License Number</Label>
                    <Input
                      value={licenseData.license_number || ""}
                      onChange={(e) => setLicenseData({ ...licenseData, license_number: e.target.value })}
                      className="bg-secondary"
                    />
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Year of Issue</Label>
                    <Input
                      type="number"
                      value={licenseData.license_year_of_issue || ""}
                      onChange={(e) => setLicenseData({ ...licenseData, license_year_of_issue: parseInt(e.target.value) || null })}
                      className="bg-secondary"
                    />
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Expiration Date</Label>
                    <Input
                      type="date"
                      value={licenseData.license_expiry || ""}
                      onChange={(e) => setLicenseData({ ...licenseData, license_expiry: e.target.value })}
                      className="bg-secondary"
                    />
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Mobile Number *</Label>
                    <Input
                      type="tel"
                      placeholder="Enter mobile number"
                      value={licenseData.phone || ""}
                      onChange={(e) => setLicenseData({ ...licenseData, phone: e.target.value })}
                      className="bg-secondary"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-muted-foreground text-xs">Address *</Label>
                    <Input
                      placeholder="Enter your address"
                      value={licenseData.address || ""}
                      onChange={(e) => setLicenseData({ ...licenseData, address: e.target.value })}
                      className="bg-secondary"
                    />
                  </div>
                </div>
              </div>

              {/* Vehicle & Policy info */}
              <div className="glass-card rounded-xl p-4 space-y-4">
                <div className="flex items-center gap-2">
                  <Car className="w-5 h-5 text-primary" />
                  <h3 className="font-semibold text-foreground">Vehicle & Policy</h3>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-muted-foreground text-xs">Policy Number</Label>
                    <Input
                      value={policyData.policy_number || ""}
                      onChange={(e) => setPolicyData({ ...policyData, policy_number: e.target.value })}
                      className="bg-secondary"
                    />
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Insurance Company</Label>
                    <Input
                      value={policyData.insurance_company || ""}
                      onChange={(e) => setPolicyData({ ...policyData, insurance_company: e.target.value })}
                      className="bg-secondary"
                    />
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Policyholder Name</Label>
                    <Input
                      value={policyData.policyholder_name || ""}
                      onChange={(e) => setPolicyData({ ...policyData, policyholder_name: e.target.value })}
                      className="bg-secondary"
                    />
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Policyholder ID</Label>
                    <Input
                      value={policyData.policyholder_id || ""}
                      onChange={(e) => setPolicyData({ ...policyData, policyholder_id: e.target.value })}
                      className="bg-secondary"
                    />
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Vehicle Number</Label>
                    <Input
                      value={policyData.vehicle_number || ""}
                      onChange={(e) => setPolicyData({ ...policyData, vehicle_number: e.target.value })}
                      className="bg-secondary"
                    />
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Vehicle Type</Label>
                    <Input
                      value={policyData.vehicle_type || ""}
                      onChange={(e) => setPolicyData({ ...policyData, vehicle_type: e.target.value })}
                      className="bg-secondary"
                    />
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Vehicle Make</Label>
                    <Input
                      value={policyData.vehicle_make || ""}
                      onChange={(e) => setPolicyData({ ...policyData, vehicle_make: e.target.value })}
                      className="bg-secondary"
                    />
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Vehicle Model</Label>
                    <Input
                      value={policyData.vehicle_model || ""}
                      onChange={(e) => setPolicyData({ ...policyData, vehicle_model: e.target.value })}
                      className="bg-secondary"
                    />
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Vehicle Color</Label>
                    <Input
                      value={policyData.vehicle_color || ""}
                      onChange={(e) => setPolicyData({ ...policyData, vehicle_color: e.target.value })}
                      className="bg-secondary"
                    />
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Manufacture Year</Label>
                    <Input
                      type="number"
                      value={policyData.vehicle_year || ""}
                      onChange={(e) => setPolicyData({ ...policyData, vehicle_year: parseInt(e.target.value) || null })}
                      className="bg-secondary"
                    />
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Coverage Type</Label>
                    <Input
                      value={policyData.coverage_type || ""}
                      onChange={(e) => setPolicyData({ ...policyData, coverage_type: e.target.value })}
                      className="bg-secondary"
                    />
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Policy Valid From</Label>
                    <Input
                      type="date"
                      value={policyData.valid_from || ""}
                      onChange={(e) => setPolicyData({ ...policyData, valid_from: e.target.value })}
                      className="bg-secondary"
                    />
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Policy Valid Until</Label>
                    <Input
                      type="date"
                      value={policyData.valid_until || ""}
                      onChange={(e) => setPolicyData({ ...policyData, valid_until: e.target.value })}
                      className="bg-secondary"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-muted-foreground text-xs">Agent Name</Label>
                    <Input
                      value={policyData.agent_name || ""}
                      onChange={(e) => setPolicyData({ ...policyData, agent_name: e.target.value })}
                      className="bg-secondary"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setStep(2)}>
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
              <Button
                variant="hero"
                className="flex-1"
                onClick={handleSaveAndContinue}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                Save & Continue
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

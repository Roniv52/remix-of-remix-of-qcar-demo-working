import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { 
  Camera, 
  X, 
  User, 
  Car, 
  Shield, 
  MapPin, 
  Clock, 
  CloudSun,
  AlertTriangle,
  Loader2
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface ScannedData {
  // Personal details
  name: string;
  idNumber: string;
  gender: string;
  dateOfBirth: string;
  phone: string;
  address: string;
  // License details
  licenseNumber: string;
  licenseYearOfIssue: string;
  licenseExpiry: string;
  // Vehicle details
  vehicleNumber: string;
  vehicleType: string;
  vehicleMake: string;
  vehicleModel: string;
  vehicleColor: string;
  vehicleYear: string;
  // Policy details
  policyNumber: string;
  insuranceCompany: string;
  policyholderName: string;
  policyholderId: string;
  coverageType: string;
  policyValidFrom: string;
  policyValidUntil: string;
  agentName: string;
}

export default function ScanQR() {
  const navigate = useNavigate();
  const [isScanning, setIsScanning] = useState(false);
  const [scannedData, setScannedData] = useState<ScannedData | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle file/image upload for QR scanning
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanning(true);

    try {
      const imageBitmap = await createImageBitmap(file);
      
      // Try to use BarcodeDetector if available
      if ("BarcodeDetector" in window) {
        try {
          // @ts-ignore
          const detector = new window.BarcodeDetector({ formats: ["qr_code"] });
          const barcodes = await detector.detect(imageBitmap);
          
          if (barcodes.length > 0) {
            const qrValue = barcodes[0].rawValue;
            handleQRDetected(qrValue);
            return;
          } else {
            toast({
              title: "No QR Code Found",
              description: "Could not detect a QR code in the image.",
              variant: "destructive",
            });
          }
        } catch (e) {
          console.log("BarcodeDetector error:", e);
          // Fallback to demo
          handleMockScan();
        }
      } else {
        // No BarcodeDetector, use demo data
        handleMockScan();
      }
    } catch (error) {
      console.error("Scan error:", error);
      toast({
        title: "Scan Failed",
        description: "Could not process the image.",
        variant: "destructive",
      });
    } finally {
      setIsScanning(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleQRDetected = async (rawValue: string) => {
    setIsScanning(false);
    
    // Check if it's a URL with token format
    const tokenMatch = rawValue.match(/\/p\/([a-f0-9-]+)/i);
    if (tokenMatch) {
      const token = tokenMatch[1];
      setIsScanning(true);
      
      try {
        // Fetch policy data by token
        const { data: policy, error } = await supabase
          .from("policies")
          .select(`
            id,
            policy_number,
            insurance_company,
            coverage_type,
            valid_from,
            valid_until,
            policyholder_name,
            policyholder_id,
            agent_name,
            vehicle_id,
            user_id
          `)
          .eq("token", token)
          .maybeSingle();

        if (error || !policy) {
          toast({
            title: "Invalid QR Code",
            description: "This QR code is not valid or has expired.",
            variant: "destructive",
          });
          setIsScanning(false);
          return;
        }

        // Fetch vehicle data
        let vehicleData: any = null;
        if (policy.vehicle_id) {
          const { data: vehicle } = await supabase
            .from("vehicles")
            .select("vehicle_number, make, model, year, color, vehicle_type")
            .eq("id", policy.vehicle_id)
            .maybeSingle();
          vehicleData = vehicle;
        }

        // Fetch profile data
        let profileData: any = null;
        if (policy.user_id) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name, id_number, gender, date_of_birth, phone, address, license_number, license_year_of_issue, license_expiry")
            .eq("user_id", policy.user_id)
            .maybeSingle();
          profileData = profile;
        }

        setScannedData({
          name: profileData?.full_name || policy.policyholder_name || "Unknown Driver",
          idNumber: profileData?.id_number || policy.policyholder_id || "",
          gender: profileData?.gender || "",
          dateOfBirth: profileData?.date_of_birth || "",
          phone: profileData?.phone || "",
          address: profileData?.address || "",
          licenseNumber: profileData?.license_number || "",
          licenseYearOfIssue: profileData?.license_year_of_issue?.toString() || "",
          licenseExpiry: profileData?.license_expiry || "",
          vehicleNumber: vehicleData?.vehicle_number || "N/A",
          vehicleType: vehicleData?.vehicle_type || "",
          vehicleMake: vehicleData?.make || "",
          vehicleModel: vehicleData?.model || "",
          vehicleColor: vehicleData?.color || "",
          vehicleYear: vehicleData?.year?.toString() || "",
          policyNumber: policy.policy_number || "",
          insuranceCompany: policy.insurance_company || "N/A",
          policyholderName: policy.policyholder_name || "",
          policyholderId: policy.policyholder_id || "",
          coverageType: policy.coverage_type || "N/A",
          policyValidFrom: policy.valid_from || "",
          policyValidUntil: policy.valid_until || "",
          agentName: policy.agent_name || "",
        });
        
        toast({
          title: "QR Code Scanned!",
          description: "Driver details retrieved from database.",
        });
      } catch (err) {
        console.error("Error fetching policy:", err);
        toast({
          title: "Error",
          description: "Could not retrieve policy information.",
          variant: "destructive",
        });
      } finally {
        setIsScanning(false);
      }
      return;
    }

    // Fallback: try to parse as JSON (legacy format)
    try {
      const data = JSON.parse(rawValue);
      
      if (data.type === "qcar") {
        setScannedData({
          name: data.name || "Unknown Driver",
          idNumber: data.idNumber || "",
          gender: data.gender || "",
          dateOfBirth: data.dateOfBirth || "",
          phone: data.phone || "",
          address: data.address || "",
          licenseNumber: data.licenseNumber || "",
          licenseYearOfIssue: data.licenseYearOfIssue || "",
          licenseExpiry: data.licenseExpiry || "",
          vehicleNumber: data.vehicleNumber || "N/A",
          vehicleType: data.vehicleType || "",
          vehicleMake: data.vehicleMake || "",
          vehicleModel: data.vehicleModel || "",
          vehicleColor: data.vehicleColor || "",
          vehicleYear: data.vehicleYear || "",
          policyNumber: data.policyNumber || "",
          insuranceCompany: data.insuranceCompany || "N/A",
          policyholderName: data.policyholderName || "",
          policyholderId: data.policyholderId || "",
          coverageType: data.coverageType || "N/A",
          policyValidFrom: data.policyValidFrom || "",
          policyValidUntil: data.policyValidUntil || "",
          agentName: data.agentName || "",
        });
        
        toast({
          title: "QR Code Scanned!",
          description: "Driver details retrieved successfully.",
        });
      } else {
        toast({
          title: "Invalid QR Code",
          description: "This doesn't appear to be a QCAR code.",
          variant: "destructive",
        });
      }
    } catch (e) {
      // Not valid JSON or URL
      toast({
        title: "Invalid QR Code",
        description: "This QR code is not a valid QCAR code. Please scan a QCAR driver code.",
        variant: "destructive",
      });
    }
  };

  // Mock scan for demo/testing
  const handleMockScan = () => {
    setIsScanning(true);
    setTimeout(() => {
      setScannedData({
        name: "David Ben Avi",
        idNumber: "305847291",
        gender: "Male",
        dateOfBirth: "1982-03-22",
        phone: "052-8765432",
        address: "45 Herzl Street, Apt 7, Haifa 3104502",
        licenseNumber: "87654321",
        licenseYearOfIssue: "2005",
        licenseExpiry: "2027-03-22",
        vehicleNumber: "78-456-32",
        vehicleType: "Private Car",
        vehicleMake: "Toyota",
        vehicleModel: "Corolla",
        vehicleColor: "Silver",
        vehicleYear: "2020",
        policyNumber: "INS-2024-78542",
        insuranceCompany: "Migdal Insurance Ltd",
        policyholderName: "David Ben Avi",
        policyholderId: "305847291",
        coverageType: "Full Comprehensive",
        policyValidFrom: "2024-06-01",
        policyValidUntil: "2025-06-01",
        agentName: "Sarah Levi",
      });
      setIsScanning(false);
      toast({
        title: "Demo Scan Complete",
        description: "Using demo data for testing.",
      });
    }, 1500);
  };

  const handleStartClaim = () => {
    navigate("/claim", { state: { otherParty: scannedData } });
  };

  const handleScanAgain = () => {
    setScannedData(null);
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 glass-card border-b px-4 py-4">
        <div className="flex items-center justify-between max-w-md mx-auto">
          <h1 className="text-xl font-bold text-foreground">Scan QR Code</h1>
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <X className="w-5 h-5" />
          </Button>
        </div>
      </header>

      <main className="px-4 py-6 max-w-md mx-auto space-y-6">
        {!scannedData ? (
          // Scanner view
          <div className="animate-slide-up">
            <div className="relative aspect-square rounded-3xl overflow-hidden bg-secondary mb-6">
              <div className="absolute inset-0 flex flex-col items-center justify-center p-8">
                <Camera className="w-16 h-16 text-muted-foreground mb-4" />
                <p className="text-center text-muted-foreground">
                  Upload a photo of the other driver's QCAR code
                </p>
              </div>
              
              {/* Corner brackets */}
              <div className="absolute inset-8 pointer-events-none">
                <div className="absolute top-0 left-0 w-8 h-8 border-l-2 border-t-2 border-primary rounded-tl-lg" />
                <div className="absolute top-0 right-0 w-8 h-8 border-r-2 border-t-2 border-primary rounded-tr-lg" />
                <div className="absolute bottom-0 left-0 w-8 h-8 border-l-2 border-b-2 border-primary rounded-bl-lg" />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-r-2 border-b-2 border-primary rounded-br-lg" />
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleFileSelect}
            />

            <div className="space-y-3">
              <Button
                variant="hero"
                size="xl"
                className="w-full"
                onClick={() => fileInputRef.current?.click()}
                disabled={isScanning}
              >
                {isScanning ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Camera className="w-5 h-5" />
                    Take Photo / Upload QR
                  </>
                )}
              </Button>

              <Button
                variant="outline"
                size="lg"
                className="w-full"
                onClick={handleMockScan}
                disabled={isScanning}
              >
                Try Demo Scan
              </Button>
            </div>

            <p className="text-center text-sm text-muted-foreground mt-4">
              Ask the other driver to show their QCAR code
            </p>
          </div>
        ) : (
          // Scanned data view
          <div className="space-y-6 animate-slide-up">
            <div className="text-center mb-6">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-success/20 flex items-center justify-center">
                <Shield className="w-8 h-8 text-success" />
              </div>
              <h2 className="text-xl font-bold text-foreground">
                Driver Details Retrieved
              </h2>
              <p className="text-sm text-muted-foreground">
                Information scanned successfully
              </p>
            </div>

            {/* Other party details */}
            <div className="glass-card rounded-2xl p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-primary/10">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">Driver Name</p>
                  <p className="font-semibold text-foreground">{scannedData.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    ID: {scannedData.idNumber || "N/A"} • {scannedData.gender || "N/A"} • DOB: {scannedData.dateOfBirth || "N/A"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Phone: {scannedData.phone || "N/A"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-primary/10">
                  <Car className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">Vehicle</p>
                  <p className="font-semibold text-foreground">
                    {scannedData.vehicleNumber} • {scannedData.vehicleMake} {scannedData.vehicleModel}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {scannedData.vehicleType} • {scannedData.vehicleColor} • {scannedData.vehicleYear}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-primary/10">
                  <Shield className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">Insurance</p>
                  <p className="font-semibold text-foreground">
                    {scannedData.insuranceCompany}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Policy: {scannedData.policyNumber || "N/A"} • {scannedData.coverageType}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Valid: {scannedData.policyValidFrom || "N/A"} to {scannedData.policyValidUntil || "N/A"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Agent: {scannedData.agentName || "N/A"}
                  </p>
                </div>
              </div>
            </div>

            {/* Auto-captured data */}
            <div className="glass-card rounded-2xl p-5 space-y-3">
              <h3 className="font-semibold text-foreground mb-3">
                Incident Data (Auto-captured)
              </h3>
              
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="w-4 h-4" />
                  Location
                </span>
                <span className="text-foreground">Main St & 5th Ave</span>
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  Time
                </span>
                <span className="text-foreground">
                  {new Date().toLocaleString()}
                </span>
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <CloudSun className="w-4 h-4" />
                  Weather
                </span>
                <span className="text-foreground">Clear, 72°F</span>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-3">
              <Button
                variant="hero"
                size="xl"
                className="w-full"
                onClick={handleStartClaim}
              >
                <AlertTriangle className="w-5 h-5" />
                File Claim Report
              </Button>
              
              <Button
                variant="outline"
                size="lg"
                className="w-full"
                onClick={handleScanAgain}
              >
                Scan Another Code
              </Button>
            </div>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}

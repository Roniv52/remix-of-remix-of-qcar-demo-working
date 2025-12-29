import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { 
  Shield, 
  User, 
  Car, 
  FileText,
  AlertTriangle,
  Loader2,
  Calendar,
  MapPin,
  Clock,
  Camera,
  Check,
  Upload,
  X,
  Download,
  CloudSun,
  ArrowLeft,
  ArrowRight,
  Eye,
  Users,
  CheckCircle2,
  Image as ImageIcon
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useBlurDetection } from "@/hooks/useBlurDetection";
import jsPDF from "jspdf";

interface PolicyData {
  id: string;
  token: string;
  policy_number: string | null;
  insurance_company: string | null;
  coverage_type: string | null;
  valid_from: string | null;
  valid_until: string | null;
  policyholder_name: string | null;
  policyholder_id: string | null;
  agent_name: string | null;
  vehicle: {
    vehicle_number: string;
    make: string | null;
    model: string | null;
    year: number | null;
    color: string | null;
    vehicle_type: string | null;
  } | null;
  profile: {
    full_name: string | null;
    id_number: string | null;
    gender: string | null;
    date_of_birth: string | null;
    phone: string | null;
    address: string | null;
    license_number: string | null;
    license_year_of_issue: number | null;
    license_expiry: string | null;
  } | null;
}

// Insured party (person filing the claim - OCR scanned data)
interface InsuredPartyLicense {
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

interface InsuredPartyPolicy {
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

interface PhotoData {
  id: number;
  file: File;
  preview: string;
  blurScore?: number;
  blurMessage?: string;
  isBlurry?: boolean;
}

const photoGuides = [
  { id: 1, label: "Front Damage", tip: "Capture the front of the vehicle showing any damage" },
  { id: 2, label: "Rear Damage", tip: "Show the back of the vehicle including trunk, taillights" },
  { id: 3, label: "Driver Side", tip: "Photograph the entire left side of the vehicle" },
  { id: 4, label: "Passenger Side", tip: "Photograph the entire right side of the vehicle" },
  { id: 5, label: "Traffic & Signs", tip: "Capture traffic lights, stop signs, road markings" },
  { id: 6, label: "Wide Shot", tip: "Stand back and capture both vehicles showing positions" },
];

export default function PublicClaim() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [policyData, setPolicyData] = useState<PolicyData | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  
  // Multi-step flow: 1=License OCR, 2=Policy OCR, 3=Photos, 4=Details, 5=Summary
  const [step, setStep] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoInputRefs = useRef<{ [key: number]: HTMLInputElement | null }>({});
  
  // OCR scanned data for INSURED party (person filing the claim)
  const [insuredLicense, setInsuredLicense] = useState<InsuredPartyLicense>({
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
  
  const [insuredPolicy, setInsuredPolicy] = useState<InsuredPartyPolicy>({
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

  // Photo state
  const [photos, setPhotos] = useState<PhotoData[]>([]);
  const { analyzeImage, analyzing } = useBlurDetection();

  // Incident details
  const [incidentLocation, setIncidentLocation] = useState("Detecting location...");
  const [weather, setWeather] = useState("Clear");
  const [description, setDescription] = useState("");
  
  // Witness state
  const [hasWitnesses, setHasWitnesses] = useState(false);
  const [witness1, setWitness1] = useState({ name: "", phone: "", address: "", statement: "" });
  const [witness2, setWitness2] = useState({ name: "", phone: "", address: "", statement: "" });

  // Reporter contact info
  const [reporterName, setReporterName] = useState("");
  const [reporterPhone, setReporterPhone] = useState("");
  const [reporterEmail, setReporterEmail] = useState("");

  // Other party manual input fields (from QR but some fields need manual input)
  const [otherPartyPhone, setOtherPartyPhone] = useState("");
  const [otherPartyAddress, setOtherPartyAddress] = useState("");

  // Fetch policy data and location on mount
  useEffect(() => {
    const fetchPolicyByToken = async () => {
      if (!token) {
        setError("Invalid or expired insurance QR code");
        setLoading(false);
        return;
      }

      try {
        const { data: policy, error: fetchError } = await supabase
          .from("policies")
          .select(`
            id,
            token,
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

        if (fetchError || !policy) {
          setError("Invalid or expired insurance QR code");
          setLoading(false);
          return;
        }

        let vehicleData = null;
        if (policy.vehicle_id) {
          const { data: vehicle } = await supabase
            .from("vehicles")
            .select("vehicle_number, make, model, year, color, vehicle_type")
            .eq("id", policy.vehicle_id)
            .maybeSingle();
          vehicleData = vehicle;
        }

        let profileData = null;
        if (policy.user_id) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name, id_number, gender, date_of_birth, phone, address, license_number, license_year_of_issue, license_expiry")
            .eq("user_id", policy.user_id)
            .maybeSingle();
          profileData = profile;
        }

        setPolicyData({
          ...policy,
          vehicle: vehicleData,
          profile: profileData,
        });
      } catch (err) {
        console.error("Error:", err);
        setError("Invalid or expired insurance QR code");
      } finally {
        setLoading(false);
      }
    };

    fetchPolicyByToken();
  }, [token]);

  // Get current location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?lat=${position.coords.latitude}&lon=${position.coords.longitude}&format=json`
            );
            const data = await response.json();
            const road = data.address?.road || data.address?.street || "";
            const city = data.address?.city || data.address?.town || data.address?.village || "";
            setIncidentLocation(road && city ? `${road}, ${city}` : data.display_name?.split(",").slice(0, 2).join(",") || "Location detected");
          } catch {
            setIncidentLocation("Location detected");
          }
        },
        () => setIncidentLocation("Location unavailable")
      );
    }
  }, []);

  // OCR file handling
  const handleOCRFileSelect = async (e: React.ChangeEvent<HTMLInputElement>, documentType: "license" | "policy") => {
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

        if (error) throw error;
        if (!data.success) throw new Error(data.error || "Failed to extract data");

        if (documentType === "license") {
          setInsuredLicense(prev => ({ ...prev, ...data.data }));
          setLicenseScanned(true);
          toast({
            title: "License scanned!",
            description: "Your license information extracted.",
          });
        } else {
          setInsuredPolicy(prev => ({ ...prev, ...data.data }));
          setPolicyScanned(true);
          toast({
            title: "Policy scanned!",
            description: "Your insurance policy extracted.",
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

  // Photo handling
  const handlePhotoCapture = (guideId: number, source: "camera" | "file") => {
    const input = photoInputRefs.current[guideId];
    if (input) {
      input.accept = "image/*";
      if (source === "camera") {
        input.capture = "environment";
      } else {
        input.removeAttribute("capture");
      }
      input.click();
    }
  };

  const handlePhotoChange = async (guideId: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const preview = URL.createObjectURL(file);
      
      setPhotos((prev) => {
        const filtered = prev.filter((p) => p.id !== guideId);
        return [...filtered, { id: guideId, file, preview }];
      });
      
      const result = await analyzeImage(file, guideId);
      
      setPhotos((prev) => 
        prev.map((p) => 
          p.id === guideId 
            ? { ...p, blurScore: result.score, blurMessage: result.message, isBlurry: result.isBlurry }
            : p
        )
      );
      
      if (result.isBlurry) {
        toast({
          title: "Photo may be blurry",
          description: result.message,
          variant: "destructive",
        });
      }
    }
    e.target.value = "";
  };

  const removePhoto = (guideId: number) => {
    setPhotos((prev) => {
      const photo = prev.find((p) => p.id === guideId);
      if (photo) URL.revokeObjectURL(photo.preview);
      return prev.filter((p) => p.id !== guideId);
    });
  };

  const getPhotoForGuide = (guideId: number) => photos.find((p) => p.id === guideId);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString();
  };

  // PDF generation
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const generatePDF = async (): Promise<Blob> => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let yPos = 20;

    const checkNewPage = (requiredSpace: number) => {
      if (yPos + requiredSpace > pageHeight - 20) {
        doc.addPage();
        yPos = 20;
        return true;
      }
      return false;
    };

    const drawSectionHeader = (title: string, color: [number, number, number] = [245, 197, 24]) => {
      checkNewPage(20);
      doc.setFillColor(color[0], color[1], color[2]);
      doc.rect(15, yPos - 5, pageWidth - 30, 10, "F");
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0);
      doc.text(title, 20, yPos + 2);
      yPos += 12;
      doc.setTextColor(50, 50, 50);
    };

    const drawInfoRow = (label: string, value: string, indent: number = 20) => {
      checkNewPage(8);
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(80, 80, 80);
      doc.text(label + ":", indent, yPos);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(30, 30, 30);
      const labelWidth = doc.getTextWidth(label + ": ");
      const maxValueWidth = pageWidth - indent - labelWidth - 20;
      const splitValue = doc.splitTextToSize(value || "N/A", maxValueWidth);
      doc.text(splitValue, indent + labelWidth, yPos);
      yPos += splitValue.length * 5 + 2;
    };

    const drawTwoColumnRow = (label1: string, value1: string, label2: string, value2: string) => {
      checkNewPage(8);
      doc.setFontSize(9);
      const col1X = 20;
      const col2X = pageWidth / 2 + 5;
      
      doc.setFont("helvetica", "bold");
      doc.setTextColor(80, 80, 80);
      doc.text(label1 + ":", col1X, yPos);
      doc.text(label2 + ":", col2X, yPos);
      
      doc.setFont("helvetica", "normal");
      doc.setTextColor(30, 30, 30);
      doc.text(value1 || "N/A", col1X + 45, yPos);
      doc.text(value2 || "N/A", col2X + 45, yPos);
      yPos += 7;
    };

    const claimId = `CLM-${Date.now().toString(36).toUpperCase()}`;

    // Header
    doc.setFillColor(245, 197, 24);
    doc.rect(0, 0, pageWidth, 35, "F");
    doc.setFontSize(24);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text("QCAR", 20, 18);
    doc.setFontSize(14);
    doc.setFont("helvetica", "normal");
    doc.text("Insurance Claim Report", 20, 28);
    doc.setFontSize(10);
    doc.setTextColor(40, 40, 40);
    doc.text(`Report ID: ${claimId}`, pageWidth - 20, 18, { align: "right" });
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth - 20, 26, { align: "right" });
    
    yPos = 50;

    // Status box
    doc.setFillColor(240, 240, 240);
    doc.roundedRect(15, yPos - 5, pageWidth - 30, 25, 3, 3, "F");
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(50, 50, 50);
    doc.text("CLAIM STATUS:", 20, yPos + 5);
    doc.setTextColor(34, 139, 34);
    doc.text("SUBMITTED", 70, yPos + 5);
    doc.setTextColor(50, 50, 50);
    doc.text("DATE FILED:", 120, yPos + 5);
    doc.setFont("helvetica", "normal");
    doc.text(new Date().toLocaleDateString(), 155, yPos + 5);
    yPos += 35;

    // Incident Details
    drawSectionHeader("INCIDENT DETAILS");
    drawTwoColumnRow("Location", incidentLocation, "Date & Time", new Date().toLocaleString());
    drawInfoRow("Weather Conditions", weather);
    yPos += 5;
    
    doc.setFont("helvetica", "bold");
    doc.setTextColor(80, 80, 80);
    doc.text("Description of Incident:", 20, yPos);
    yPos += 6;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(30, 30, 30);
    const descLines = doc.splitTextToSize(description || "No description provided", pageWidth - 40);
    descLines.forEach((line: string) => {
      checkNewPage(6);
      doc.text(line, 20, yPos);
      yPos += 5;
    });
    yPos += 10;

    // OTHER PARTY (QR scanned - the person whose QR was scanned)
    drawSectionHeader("OTHER PARTY DETAILS (QR SCANNED)", [220, 53, 69]);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(220, 53, 69);
    doc.text("Personal Information", 20, yPos);
    yPos += 8;
    
    drawTwoColumnRow("Full Name", policyData?.profile?.full_name || policyData?.policyholder_name || "N/A", "ID Number", policyData?.profile?.id_number || policyData?.policyholder_id || "N/A");
    drawTwoColumnRow("Gender", policyData?.profile?.gender || "N/A", "Date of Birth", formatDate(policyData?.profile?.date_of_birth || null));
    drawTwoColumnRow("Phone", otherPartyPhone || policyData?.profile?.phone || "N/A", "Address", otherPartyAddress || policyData?.profile?.address || "N/A");
    yPos += 5;

    doc.setFont("helvetica", "bold");
    doc.setTextColor(220, 53, 69);
    doc.text("Driver's License", 20, yPos);
    yPos += 8;
    
    drawTwoColumnRow("License Number", policyData?.profile?.license_number || "N/A", "Year of Issue", String(policyData?.profile?.license_year_of_issue || "N/A"));
    drawInfoRow("License Expiry", formatDate(policyData?.profile?.license_expiry || null));
    yPos += 5;

    doc.setFont("helvetica", "bold");
    doc.setTextColor(220, 53, 69);
    doc.text("Vehicle Information", 20, yPos);
    yPos += 8;
    
    drawTwoColumnRow("Vehicle Number", policyData?.vehicle?.vehicle_number || "N/A", "Vehicle Type", policyData?.vehicle?.vehicle_type || "N/A");
    drawTwoColumnRow("Make", policyData?.vehicle?.make || "N/A", "Model", policyData?.vehicle?.model || "N/A");
    drawTwoColumnRow("Year", String(policyData?.vehicle?.year || "N/A"), "Color", policyData?.vehicle?.color || "N/A");
    yPos += 5;

    doc.setFont("helvetica", "bold");
    doc.setTextColor(220, 53, 69);
    doc.text("Insurance Policy", 20, yPos);
    yPos += 8;
    
    drawTwoColumnRow("Policy Number", policyData?.policy_number || "N/A", "Insurance Company", policyData?.insurance_company || "N/A");
    drawTwoColumnRow("Policyholder Name", policyData?.policyholder_name || "N/A", "Policyholder ID", policyData?.policyholder_id || "N/A");
    drawTwoColumnRow("Coverage Type", policyData?.coverage_type || "N/A", "Agent Name", policyData?.agent_name || "N/A");
    drawTwoColumnRow("Valid From", policyData?.valid_from || "N/A", "Valid Until", policyData?.valid_until || "N/A");
    yPos += 10;

    // INSURED PARTY (OCR scanned - the person filing the claim)
    if (licenseScanned || policyScanned) {
      drawSectionHeader("INSURED PARTY DETAILS (OCR SCANNED)", [66, 135, 245]);
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(66, 135, 245);
      doc.text("Personal Information", 20, yPos);
      yPos += 8;
      
      drawTwoColumnRow("Full Name", insuredLicense.full_name || "N/A", "ID Number", insuredLicense.id_number || "N/A");
      drawTwoColumnRow("Gender", insuredLicense.gender || "N/A", "Date of Birth", insuredLicense.date_of_birth || "N/A");
      drawTwoColumnRow("Phone", insuredLicense.phone || "N/A", "Address", insuredLicense.address || "N/A");
      yPos += 5;

      doc.setFont("helvetica", "bold");
      doc.setTextColor(66, 135, 245);
      doc.text("Driver's License", 20, yPos);
      yPos += 8;
      
      drawTwoColumnRow("License Number", insuredLicense.license_number || "N/A", "Year of Issue", String(insuredLicense.license_year_of_issue || "N/A"));
      drawInfoRow("License Expiry", insuredLicense.license_expiry || "N/A");
      yPos += 5;

      doc.setFont("helvetica", "bold");
      doc.setTextColor(66, 135, 245);
      doc.text("Vehicle Information", 20, yPos);
      yPos += 8;
      
      drawTwoColumnRow("Vehicle Number", insuredPolicy.vehicle_number || "N/A", "Vehicle Type", insuredPolicy.vehicle_type || "N/A");
      drawTwoColumnRow("Make", insuredPolicy.vehicle_make || "N/A", "Model", insuredPolicy.vehicle_model || "N/A");
      drawTwoColumnRow("Year", String(insuredPolicy.vehicle_year || "N/A"), "Color", insuredPolicy.vehicle_color || "N/A");
      yPos += 5;

      doc.setFont("helvetica", "bold");
      doc.setTextColor(66, 135, 245);
      doc.text("Insurance Policy", 20, yPos);
      yPos += 8;
      
      drawTwoColumnRow("Policy Number", insuredPolicy.policy_number || "N/A", "Insurance Company", insuredPolicy.insurance_company || "N/A");
      drawTwoColumnRow("Policyholder Name", insuredPolicy.policyholder_name || "N/A", "Policyholder ID", insuredPolicy.policyholder_id || "N/A");
      drawTwoColumnRow("Coverage Type", insuredPolicy.coverage_type || "N/A", "Agent Name", insuredPolicy.agent_name || "N/A");
      drawTwoColumnRow("Valid From", insuredPolicy.valid_from || "N/A", "Valid Until", insuredPolicy.valid_until || "N/A");
      yPos += 10;
    }

    // Reporter Info
    drawSectionHeader("REPORTER CONTACT INFORMATION", [100, 100, 100]);
    drawTwoColumnRow("Name", reporterName, "Phone", reporterPhone);
    drawInfoRow("Email", reporterEmail || "Not provided");
    yPos += 10;

    // Witness Details
    if (hasWitnesses && (witness1.name || witness2.name)) {
      checkNewPage(60);
      drawSectionHeader("WITNESS INFORMATION", [75, 0, 130]);
      
      if (witness1.name) {
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(75, 0, 130);
        doc.text("Witness 1", 20, yPos);
        yPos += 8;
        
        drawTwoColumnRow("Full Name", witness1.name, "Phone", witness1.phone || "N/A");
        drawInfoRow("Address", witness1.address || "N/A");
        
        if (witness1.statement) {
          doc.setFont("helvetica", "bold");
          doc.setTextColor(80, 80, 80);
          doc.text("Statement:", 20, yPos);
          yPos += 6;
          doc.setFont("helvetica", "italic");
          doc.setTextColor(50, 50, 50);
          const stmtLines = doc.splitTextToSize(`"${witness1.statement}"`, pageWidth - 40);
          stmtLines.forEach((line: string) => {
            checkNewPage(6);
            doc.text(line, 20, yPos);
            yPos += 5;
          });
        }
        yPos += 5;
      }

      if (witness2.name) {
        checkNewPage(40);
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(75, 0, 130);
        doc.text("Witness 2", 20, yPos);
        yPos += 8;
        
        drawTwoColumnRow("Full Name", witness2.name, "Phone", witness2.phone || "N/A");
        drawInfoRow("Address", witness2.address || "N/A");
        
        if (witness2.statement) {
          doc.setFont("helvetica", "bold");
          doc.setTextColor(80, 80, 80);
          doc.text("Statement:", 20, yPos);
          yPos += 6;
          doc.setFont("helvetica", "italic");
          doc.setTextColor(50, 50, 50);
          const stmtLines = doc.splitTextToSize(`"${witness2.statement}"`, pageWidth - 40);
          stmtLines.forEach((line: string) => {
            checkNewPage(6);
            doc.text(line, 20, yPos);
            yPos += 5;
          });
        }
      }
      yPos += 5;
    }

    // Photos
    if (photos.length > 0) {
      doc.addPage();
      yPos = 20;
      
      doc.setFillColor(245, 197, 24);
      doc.rect(0, 0, pageWidth, 25, "F");
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0);
      doc.text("SCENE PHOTOGRAPHS", 20, 16);
      doc.setFontSize(10);
      doc.text(`${photos.length} Photos Attached`, pageWidth - 20, 16, { align: "right" });
      
      yPos = 40;

      for (let i = 0; i < photos.length; i++) {
        const photo = photos[i];
        const guide = photoGuides.find((g) => g.id === photo.id);
        
        if (yPos > pageHeight - 90) {
          doc.addPage();
          yPos = 20;
        }

        doc.setFillColor(66, 135, 245);
        doc.circle(25, yPos + 3, 4, "F");
        doc.setFontSize(8);
        doc.setTextColor(255, 255, 255);
        doc.text(String(i + 1), 23.5, yPos + 5);
        
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(40, 40, 40);
        doc.text(guide?.label || `Photo ${i + 1}`, 35, yPos + 5);
        yPos += 12;

        try {
          const imgData = await fileToBase64(photo.file);
          doc.setDrawColor(200, 200, 200);
          doc.setLineWidth(0.5);
          doc.rect(19, yPos - 1, 82, 62);
          doc.addImage(imgData, "JPEG", 20, yPos, 80, 60);
          yPos += 70;
        } catch {
          doc.setFontSize(9);
          doc.setTextColor(150, 150, 150);
          doc.text("[Photo could not be embedded]", 20, yPos + 10);
          yPos += 20;
        }
      }
    }

    // Footer
    doc.addPage();
    yPos = 20;
    
    doc.setFillColor(245, 197, 24);
    doc.rect(0, 0, pageWidth, 45, "F");
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text("CLAIM SUMMARY", pageWidth / 2, 20, { align: "center" });
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Quick Reference Card - Claim ID: ${claimId}`, pageWidth / 2, 32, { align: "center" });
    
    yPos = 60;

    let witnessCount = 0;
    if (hasWitnesses) {
      if (witness1.name) witnessCount++;
      if (witness2.name) witnessCount++;
    }

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(50, 50, 50);
    doc.text("INCIDENT SUMMARY", 20, yPos);
    yPos += 10;
    
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    drawInfoRow("Location", incidentLocation);
    drawInfoRow("Date/Time", new Date().toLocaleString());
    drawInfoRow("Weather", weather);
    drawInfoRow("Photos", `${photos.length} attached`);
    drawInfoRow("Witnesses", witnessCount > 0 ? `${witnessCount} witness${witnessCount > 1 ? "es" : ""}` : "None");

    yPos = pageHeight - 30;
    doc.setDrawColor(200, 200, 200);
    doc.line(20, yPos, pageWidth - 20, yPos);
    yPos += 10;
    
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text("This document was generated by QCAR Insurance Claims System.", pageWidth / 2, yPos, { align: "center" });
    doc.text("Please retain this report for your records.", pageWidth / 2, yPos + 6, { align: "center" });

    return doc.output("blob");
  };

  const uploadPhotosToStorage = async (photoFiles: PhotoData[]): Promise<string[]> => {
    const uploadedUrls: string[] = [];
    
    for (const photo of photoFiles) {
      const fileExt = photo.file.name.split('.').pop() || 'jpg';
      const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
      const filePath = `guest/${fileName}`;
      
      const { data, error } = await supabase.storage
        .from('claim-photos')
        .upload(filePath, photo.file, {
          cacheControl: '3600',
          upsert: false
        });
      
      if (error) {
        console.error('Error uploading photo:', error);
        continue;
      }
      
      const { data: urlData } = supabase.storage
        .from('claim-photos')
        .getPublicUrl(data.path);
      
      uploadedUrls.push(urlData.publicUrl);
    }
    
    return uploadedUrls;
  };

  const handleSubmit = async () => {
    if (!description.trim()) {
      toast({
        title: "Missing information",
        description: "Please provide an incident description.",
        variant: "destructive",
      });
      return;
    }

    if (!reporterName || !reporterPhone) {
      toast({
        title: "Missing contact information",
        description: "Please provide your name and phone number.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);

    try {
      // Generate unique session ID for this guest
      const sessionId = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Generate IDs client-side to avoid needing SELECT after INSERT
      const accidentCaseId = crypto.randomUUID();
      const claimId = crypto.randomUUID();
      
      // Upload photos to storage (not base64)
      const photoUrls = await uploadPhotosToStorage(photos);

      // Get the policy owner's user_id from the policy
      const { data: policyWithUser, error: policyFetchError } = await supabase
        .from("policies")
        .select("user_id")
        .eq("token", token)
        .maybeSingle();

      if (policyFetchError || !policyWithUser?.user_id) {
        console.error("Policy fetch error:", policyFetchError);
        throw new Error("Could not find policy owner");
      }

      const policyOwnerId = policyWithUser.user_id;

      // Step 1: Create accident_case - NO .select() to avoid RLS SELECT requirement
      const accidentCaseData = {
        id: accidentCaseId, // Use client-generated ID
        user1_id: policyOwnerId,
        user2_session_id: sessionId,
        user2_user_id: null,
        status: 'pending_user2_details',
        user1_data: {
          full_name: policyData?.profile?.full_name || policyData?.policyholder_name,
          id_number: policyData?.profile?.id_number || policyData?.policyholder_id,
          phone: policyData?.profile?.phone,
          vehicle_number: policyData?.vehicle?.vehicle_number,
          vehicle_make: policyData?.vehicle?.make,
          vehicle_model: policyData?.vehicle?.model,
          policy_number: policyData?.policy_number,
          insurance_company: policyData?.insurance_company,
        },
        user2_data: {
          full_name: insuredLicense.full_name,
          id_number: insuredLicense.id_number,
          gender: insuredLicense.gender,
          date_of_birth: insuredLicense.date_of_birth,
          phone: insuredLicense.phone || reporterPhone,
          address: insuredLicense.address,
          license_number: insuredLicense.license_number,
          license_year_of_issue: insuredLicense.license_year_of_issue,
          license_expiry: insuredLicense.license_expiry,
          vehicle_number: insuredPolicy.vehicle_number,
          vehicle_type: insuredPolicy.vehicle_type,
          vehicle_make: insuredPolicy.vehicle_make,
          vehicle_model: insuredPolicy.vehicle_model,
          vehicle_color: insuredPolicy.vehicle_color,
          vehicle_year: insuredPolicy.vehicle_year,
          policy_number: insuredPolicy.policy_number,
          insurance_company: insuredPolicy.insurance_company,
          coverage_type: insuredPolicy.coverage_type,
          reporter_name: reporterName,
          reporter_phone: reporterPhone,
          reporter_email: reporterEmail,
        },
      };

      const { error: accidentError } = await supabase
        .from("accident_cases")
        .insert(accidentCaseData);

      if (accidentError) {
        console.error("Error creating accident case:", accidentError);
        throw new Error(`Failed to create accident record: ${accidentError.message}`);
      }

      // Step 2: Create claim - NO .select() to avoid RLS SELECT requirement
      const claimData = {
        id: claimId, // Use client-generated ID
        user_id: policyOwnerId,
        policy_id: policyData?.id,
        accident_case_id: accidentCaseId, // Use the client-generated ID
        incident_location: incidentLocation,
        incident_time: new Date().toISOString(),
        weather_conditions: weather,
        description: description,
        photos: photoUrls,
        status: 'submitted',
        has_witnesses: hasWitnesses,
        other_party_name: insuredLicense.full_name,
        other_party_id_number: insuredLicense.id_number,
        other_party_gender: insuredLicense.gender,
        other_party_date_of_birth: insuredLicense.date_of_birth,
        other_party_phone: insuredLicense.phone || reporterPhone,
        other_party_address: insuredLicense.address,
        other_party_license_number: insuredLicense.license_number,
        other_party_license_year_of_issue: insuredLicense.license_year_of_issue,
        other_party_license_expiry: insuredLicense.license_expiry,
        other_party_vehicle: insuredPolicy.vehicle_number,
        other_party_vehicle_type: insuredPolicy.vehicle_type,
        other_party_vehicle_make: insuredPolicy.vehicle_make,
        other_party_vehicle_model: insuredPolicy.vehicle_model,
        other_party_vehicle_color: insuredPolicy.vehicle_color,
        other_party_vehicle_year: insuredPolicy.vehicle_year,
        other_party_policy_number: insuredPolicy.policy_number,
        other_party_insurance: insuredPolicy.insurance_company,
        other_party_policyholder_name: insuredPolicy.policyholder_name,
        other_party_policyholder_id: insuredPolicy.policyholder_id,
        other_party_coverage_type: insuredPolicy.coverage_type,
        other_party_policy_valid_from: insuredPolicy.valid_from,
        other_party_policy_valid_until: insuredPolicy.valid_until,
        other_party_agent_name: insuredPolicy.agent_name,
        witness_1_name: hasWitnesses ? witness1.name : null,
        witness_1_phone: hasWitnesses ? witness1.phone : null,
        witness_1_address: hasWitnesses ? witness1.address : null,
        witness_1_statement: hasWitnesses ? witness1.statement : null,
        witness_2_name: hasWitnesses ? witness2.name : null,
        witness_2_phone: hasWitnesses ? witness2.phone : null,
        witness_2_address: hasWitnesses ? witness2.address : null,
        witness_2_statement: hasWitnesses ? witness2.statement : null,
      };

      const { error: claimError } = await supabase
        .from("claims")
        .insert(claimData);

      if (claimError) {
        console.error("Error creating claim:", claimError);
        // Rollback: delete the accident case (this may fail due to RLS but that's ok)
        await supabase.from("accident_cases").delete().eq("id", accidentCaseId);
        throw new Error(`Failed to create claim: ${claimError.message}`);
      }

      // Step 3: Create pending_claim_scan (non-critical, but log errors)
      const { error: pendingError } = await supabase
        .from("pending_claim_scans")
        .insert({
          policy_id: policyData?.id,
          policy_owner_id: policyOwnerId,
          scanner_phone: reporterPhone,
          scanner_email: reporterEmail || '',
          status: 'pending',
        });

      if (pendingError) {
        console.error("Error creating pending scan (non-critical):", pendingError);
      }

      // Step 4: Create notification with all IDs for linking
      await supabase.from("notifications").insert({
        user_id: policyOwnerId,
        type: 'new_accident_scan',
        title: 'New Accident Report',
        message: `Someone scanned your QR code and submitted an accident report. Location: ${incidentLocation}`,
        data: {
          accident_case_id: accidentCaseId,
          claim_id: claimId,
          scanner_name: insuredLicense.full_name || reporterName,
          scanner_phone: reporterPhone,
          incident_location: incidentLocation,
        },
      });

      // Generate and download PDF
      const pdfBlob = await generatePDF();
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `QCAR-Claim-${new Date().toISOString().split("T")[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setSubmitted(true);
      toast({
        title: "Claim submitted!",
        description: "Report saved and PDF downloaded.",
      });
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to submit claim. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const totalSteps = 5;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
        <p className="text-muted-foreground">Loading policy information...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="glass-card rounded-3xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-destructive/20 flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-destructive" />
          </div>
          <h1 className="text-xl font-bold text-foreground mb-2">Invalid QR Code</h1>
          <p className="text-muted-foreground mb-6">{error}</p>
          <Button variant="outline" onClick={() => navigate("/")}>Go to Home</Button>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="glass-card rounded-3xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-success/20 flex items-center justify-center">
            <Check className="w-8 h-8 text-success" />
          </div>
          <h1 className="text-xl font-bold text-foreground mb-2">Claim Submitted Successfully</h1>
          <p className="text-muted-foreground mb-6">Your claim report PDF has been downloaded.</p>
          <div className="glass-card rounded-xl p-4 text-left mb-6">
            <p className="text-sm text-muted-foreground">Reference Number</p>
            <p className="font-mono font-semibold text-foreground">CLM-{Date.now().toString(36).toUpperCase()}</p>
          </div>
          <Button variant="outline" onClick={() => window.close()}>Close</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-8">
      {/* Header */}
      <header className="sticky top-0 z-40 glass-card border-b px-4 py-4">
        <div className="flex items-center justify-center max-w-md mx-auto">
          <Logo size="sm" />
        </div>
      </header>

      {/* Progress bar */}
      <div className="h-1 bg-secondary">
        <div className="h-full bg-primary transition-all duration-300" style={{ width: `${(step / totalSteps) * 100}%` }} />
      </div>

      <main className="px-4 py-6 max-w-md mx-auto space-y-6">
        {/* Step 1: Scan YOUR License (Insured Party) */}
        {step === 1 && (
          <div className="space-y-6 animate-slide-up">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/20 flex items-center justify-center">
                <FileText className="w-8 h-8 text-primary" />
              </div>
              <h1 className="text-2xl font-bold text-foreground mb-2">Scan Your License</h1>
              <p className="text-muted-foreground">Take a photo of your driver license</p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf"
              capture="environment"
              className="hidden"
              onChange={(e) => handleOCRFileSelect(e, "license")}
            />

            <Button
              variant="hero"
              size="lg"
              className="w-full"
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
            >
              {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Camera className="w-5 h-5" />}
              {isProcessing ? "Processing..." : "Take Photo / Upload"}
            </Button>

            {licenseScanned && (
              <div className="glass-card rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2 text-success">
                  <Check className="w-5 h-5" />
                  <span className="font-medium">Your license scanned</span>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Name</span>
                    <span className="text-foreground">{insuredLicense.full_name || "-"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">ID Number</span>
                    <span className="text-foreground">{insuredLicense.id_number || "-"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">License #</span>
                    <span className="text-foreground">{insuredLicense.license_number || "-"}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setStep(2)}>
                Skip
              </Button>
              <Button variant="hero" className="flex-1" onClick={() => setStep(2)} disabled={!licenseScanned}>
                Continue <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Scan YOUR Policy (Insured Party) */}
        {step === 2 && (
          <div className="space-y-6 animate-slide-up">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/20 flex items-center justify-center">
                <Shield className="w-8 h-8 text-primary" />
              </div>
              <h1 className="text-2xl font-bold text-foreground mb-2">Scan Your Policy</h1>
              <p className="text-muted-foreground">Take a photo of your insurance card</p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf"
              capture="environment"
              className="hidden"
              onChange={(e) => handleOCRFileSelect(e, "policy")}
            />

            <Button
              variant="hero"
              size="lg"
              className="w-full"
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
            >
              {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
              {isProcessing ? "Processing..." : "Take Photo / Upload"}
            </Button>

            {policyScanned && (
              <div className="glass-card rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2 text-success">
                  <Check className="w-5 h-5" />
                  <span className="font-medium">Your policy scanned</span>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Company</span>
                    <span className="text-foreground">{insuredPolicy.insurance_company || "-"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Policy #</span>
                    <span className="text-foreground">{insuredPolicy.policy_number || "-"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Vehicle</span>
                    <span className="text-foreground">{insuredPolicy.vehicle_number || "-"}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>
                <ArrowLeft className="w-4 h-4" /> Back
              </Button>
              <Button variant="hero" className="flex-1" onClick={() => setStep(3)}>
                Continue <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Photos */}
        {step === 3 && (
          <div className="space-y-6 animate-slide-up">
            <div className="text-center">
              <h2 className="text-xl font-bold text-foreground mb-2">Document the Scene</h2>
              <p className="text-sm text-muted-foreground">Take photos or upload from gallery</p>
            </div>

            <div className="space-y-3">
              {photoGuides.map((guide) => {
                const photo = getPhotoForGuide(guide.id);
                return (
                  <div key={guide.id} className="relative">
                    <input
                      type="file"
                      ref={(el) => (photoInputRefs.current[guide.id] = el)}
                      onChange={(e) => handlePhotoChange(guide.id, e)}
                      className="hidden"
                      accept="image/*"
                    />
                    
                    {photo ? (
                      <div className={cn(
                        "glass-card rounded-xl p-3",
                        analyzing[guide.id] ? "border-primary/50" :
                        photo.isBlurry ? "border-destructive" : "border-success"
                      )}>
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <img src={photo.preview} alt={guide.label} className="w-16 h-16 rounded-lg object-cover" />
                            <button
                              onClick={() => removePhoto(guide.id)}
                              className="absolute -top-2 -right-2 w-6 h-6 bg-destructive rounded-full flex items-center justify-center"
                            >
                              <X className="w-4 h-4 text-destructive-foreground" />
                            </button>
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-foreground text-sm">{guide.label}</p>
                            {analyzing[guide.id] ? (
                              <p className="text-xs text-primary flex items-center gap-1">
                                <Loader2 className="w-3 h-3 animate-spin" /> Analyzing...
                              </p>
                            ) : photo.isBlurry ? (
                              <p className="text-xs text-destructive">{photo.blurMessage}</p>
                            ) : (
                              <p className="text-xs text-success">{photo.blurMessage || "Added"}</p>
                            )}
                          </div>
                          {photo.isBlurry ? (
                            <AlertTriangle className="w-5 h-5 text-destructive" />
                          ) : (
                            <CheckCircle2 className="w-5 h-5 text-success" />
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="glass-card rounded-xl p-4">
                        <div className="flex items-start gap-4 mb-3">
                          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                            <Camera className="w-6 h-6 text-primary" />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-foreground">{guide.label}</p>
                            <p className="text-xs text-muted-foreground mt-1">{guide.tip}</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" className="flex-1" onClick={() => handlePhotoCapture(guide.id, "camera")}>
                            <Camera className="w-4 h-4 mr-1" /> Camera
                          </Button>
                          <Button variant="outline" size="sm" className="flex-1" onClick={() => handlePhotoCapture(guide.id, "file")}>
                            <Upload className="w-4 h-4 mr-1" /> Gallery
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex gap-3">
              <Button variant="outline" size="lg" className="flex-1" onClick={() => setStep(2)}>
                <ArrowLeft className="w-4 h-4" /> Back
              </Button>
              <Button variant="hero" size="lg" className="flex-1" onClick={() => setStep(4)} disabled={photos.length < 3}>
                Continue ({photos.length}/6)
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Incident Details */}
        {step === 4 && (
          <div className="space-y-6 animate-slide-up">
            <div className="text-center">
              <h2 className="text-xl font-bold text-foreground mb-2">Incident Details</h2>
              <p className="text-sm text-muted-foreground">Describe what happened</p>
            </div>

            {/* Auto-detected location/weather */}
            <div className="glass-card rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="w-4 h-4" /> Location
                </span>
                <span className="text-foreground text-right max-w-[60%] truncate">{incidentLocation}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="w-4 h-4" /> Time
                </span>
                <span className="text-foreground">{new Date().toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <CloudSun className="w-4 h-4" /> Weather
                </span>
                <Input
                  value={weather}
                  onChange={(e) => setWeather(e.target.value)}
                  className="w-32 h-8 text-right bg-secondary"
                  placeholder="Weather"
                />
              </div>
            </div>

            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe how the accident occurred..."
              className="min-h-[120px] bg-secondary border-border"
            />

            {/* Witnesses */}
            <div className="glass-card rounded-xl p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-primary" />
                  <Label className="font-semibold text-foreground">Were there any witnesses?</Label>
                </div>
                <Switch checked={hasWitnesses} onCheckedChange={setHasWitnesses} />
              </div>

              {hasWitnesses && (
                <div className="space-y-4 pt-2 border-t border-border">
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-foreground flex items-center gap-2">
                      <Users className="w-4 h-4 text-primary" /> Witness 1
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <Input placeholder="Full Name" value={witness1.name} onChange={(e) => setWitness1({ ...witness1, name: e.target.value })} className="bg-secondary" />
                      <Input placeholder="Phone" value={witness1.phone} onChange={(e) => setWitness1({ ...witness1, phone: e.target.value })} className="bg-secondary" />
                    </div>
                    <Input placeholder="Address" value={witness1.address} onChange={(e) => setWitness1({ ...witness1, address: e.target.value })} className="bg-secondary" />
                    <Textarea placeholder="Statement" value={witness1.statement} onChange={(e) => setWitness1({ ...witness1, statement: e.target.value })} className="min-h-[60px] bg-secondary" />
                  </div>

                  <div className="space-y-3 pt-3 border-t border-border/50">
                    <p className="text-sm font-medium text-foreground flex items-center gap-2">
                      <Users className="w-4 h-4 text-muted-foreground" /> Witness 2 <span className="text-xs text-muted-foreground">(Optional)</span>
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <Input placeholder="Full Name" value={witness2.name} onChange={(e) => setWitness2({ ...witness2, name: e.target.value })} className="bg-secondary" />
                      <Input placeholder="Phone" value={witness2.phone} onChange={(e) => setWitness2({ ...witness2, phone: e.target.value })} className="bg-secondary" />
                    </div>
                    <Input placeholder="Address" value={witness2.address} onChange={(e) => setWitness2({ ...witness2, address: e.target.value })} className="bg-secondary" />
                    <Textarea placeholder="Statement" value={witness2.statement} onChange={(e) => setWitness2({ ...witness2, statement: e.target.value })} className="min-h-[60px] bg-secondary" />
                  </div>
                </div>
              )}
            </div>

            {/* Reporter contact */}
            <div className="glass-card rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <User className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-foreground">Your Contact Info</h3>
              </div>
              <Input placeholder="Your Name *" value={reporterName} onChange={(e) => setReporterName(e.target.value)} className="bg-secondary" />
              <Input placeholder="Your Phone *" value={reporterPhone} onChange={(e) => setReporterPhone(e.target.value)} className="bg-secondary" />
              <Input placeholder="Your Email (optional)" value={reporterEmail} onChange={(e) => setReporterEmail(e.target.value)} className="bg-secondary" />
            </div>

            <div className="flex gap-3">
              <Button variant="outline" size="lg" className="flex-1" onClick={() => setStep(3)}>
                <ArrowLeft className="w-4 h-4" /> Back
              </Button>
              <Button variant="hero" size="lg" className="flex-1" onClick={() => setStep(5)} disabled={!description.trim()}>
                Continue <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 5: Summary */}
        {step === 5 && (
          <div className="space-y-6 animate-slide-up">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-success/20 flex items-center justify-center">
                <FileText className="w-8 h-8 text-success" />
              </div>
              <h2 className="text-xl font-bold text-foreground mb-2">Claim Summary</h2>
              <p className="text-sm text-muted-foreground">Review before downloading PDF</p>
            </div>

            {/* QR Scanned Party = Other Party */}
            <div className="glass-card rounded-xl p-4 space-y-4">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <Car className="w-4 h-4 text-destructive" /> Other Party (QR Scanned)
              </h3>
              
              {/* Driver Details */}
              <div className="space-y-2 border-b border-border pb-3">
                <p className="text-xs font-medium text-muted-foreground uppercase">Driver Details</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                  <p className="text-muted-foreground">Name: <span className="text-foreground">{policyData?.profile?.full_name || "N/A"}</span></p>
                  <p className="text-muted-foreground">ID: <span className="text-foreground">{policyData?.profile?.id_number || "N/A"}</span></p>
                  <p className="text-muted-foreground">Gender: <span className="text-foreground">{policyData?.profile?.gender || "N/A"}</span></p>
                  <p className="text-muted-foreground">DOB: <span className="text-foreground">{formatDate(policyData?.profile?.date_of_birth || null)}</span></p>
                  <p className="text-muted-foreground">License #: <span className="text-foreground">{policyData?.profile?.license_number || "N/A"}</span></p>
                  <p className="text-muted-foreground">Issue Year: <span className="text-foreground">{policyData?.profile?.license_year_of_issue || "N/A"}</span></p>
                  <p className="text-muted-foreground">Expiry: <span className="text-foreground">{formatDate(policyData?.profile?.license_expiry || null)}</span></p>
                  <p className="text-muted-foreground">Phone: <span className="text-foreground">{otherPartyPhone || policyData?.profile?.phone || "N/A"}</span></p>
                </div>
                <p className="text-sm text-muted-foreground">Address: <span className="text-foreground">{otherPartyAddress || policyData?.profile?.address || "N/A"}</span></p>
              </div>

              {/* Vehicle & Policy Details */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase">Vehicle & Policy</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                  <p className="text-muted-foreground">Policy #: <span className="text-foreground">{policyData?.policy_number || "N/A"}</span></p>
                  <p className="text-muted-foreground">Company: <span className="text-foreground">{policyData?.insurance_company || "N/A"}</span></p>
                  <p className="text-muted-foreground">Holder: <span className="text-foreground">{policyData?.policyholder_name || "N/A"}</span></p>
                  <p className="text-muted-foreground">Holder ID: <span className="text-foreground">{policyData?.policyholder_id || "N/A"}</span></p>
                  <p className="text-muted-foreground">Vehicle #: <span className="text-foreground">{policyData?.vehicle?.vehicle_number || "N/A"}</span></p>
                  <p className="text-muted-foreground">Type: <span className="text-foreground">{policyData?.vehicle?.vehicle_type || "N/A"}</span></p>
                  <p className="text-muted-foreground">Make: <span className="text-foreground">{policyData?.vehicle?.make || "N/A"}</span></p>
                  <p className="text-muted-foreground">Model: <span className="text-foreground">{policyData?.vehicle?.model || "N/A"}</span></p>
                  <p className="text-muted-foreground">Color: <span className="text-foreground">{policyData?.vehicle?.color || "N/A"}</span></p>
                  <p className="text-muted-foreground">Year: <span className="text-foreground">{policyData?.vehicle?.year || "N/A"}</span></p>
                  <p className="text-muted-foreground">Coverage: <span className="text-foreground">{policyData?.coverage_type || "N/A"}</span></p>
                  <p className="text-muted-foreground">Valid From: <span className="text-foreground">{policyData?.valid_from || "N/A"}</span></p>
                  <p className="text-muted-foreground">Valid Until: <span className="text-foreground">{policyData?.valid_until || "N/A"}</span></p>
                  <p className="text-muted-foreground">Agent: <span className="text-foreground">{policyData?.agent_name || "N/A"}</span></p>
                </div>
              </div>

              {/* Manual input for phone/address if not available */}
              {(!policyData?.profile?.phone || !policyData?.profile?.address) && (
                <div className="border-t border-border pt-3 space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase">Add Missing Info</p>
                  {!policyData?.profile?.phone && (
                    <Input 
                      placeholder="Other Party Phone" 
                      value={otherPartyPhone} 
                      onChange={(e) => setOtherPartyPhone(e.target.value)} 
                      className="bg-secondary h-9"
                    />
                  )}
                  {!policyData?.profile?.address && (
                    <Input 
                      placeholder="Other Party Address" 
                      value={otherPartyAddress} 
                      onChange={(e) => setOtherPartyAddress(e.target.value)} 
                      className="bg-secondary h-9"
                    />
                  )}
                </div>
              )}
            </div>

            {/* OCR Scanned Party = Insured Party (You) */}
            {(licenseScanned || policyScanned) && (
              <div className="glass-card rounded-xl p-4 space-y-3">
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <Shield className="w-4 h-4 text-primary" /> Insured Party (Your Details)
                </h3>
                <div className="text-sm space-y-1">
                  <p className="text-muted-foreground">Name: <span className="text-foreground">{insuredLicense.full_name || "N/A"}</span></p>
                  <p className="text-muted-foreground">Vehicle: <span className="text-foreground">{insuredPolicy.vehicle_number || "N/A"}</span></p>
                  <p className="text-muted-foreground">Insurance: <span className="text-foreground">{insuredPolicy.insurance_company || "N/A"}</span></p>
                </div>
              </div>
            )}

            {/* Photos */}
            <div className="glass-card rounded-xl p-4 space-y-3">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-primary" /> Photos ({photos.length})
              </h3>
              <div className="flex gap-2 flex-wrap">
                {photos.map((photo) => (
                  <img key={photo.id} src={photo.preview} alt={`Photo ${photo.id}`} className="w-16 h-16 rounded-lg object-cover" />
                ))}
              </div>
            </div>

            {/* Witnesses */}
            {hasWitnesses && (witness1.name || witness2.name) && (
              <div className="glass-card rounded-xl p-4 space-y-3">
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <Eye className="w-4 h-4 text-primary" /> Witnesses
                </h3>
                <div className="text-sm space-y-2">
                  {witness1.name && <p className="text-foreground">{witness1.name} • {witness1.phone}</p>}
                  {witness2.name && <p className="text-foreground">{witness2.name} • {witness2.phone}</p>}
                </div>
              </div>
            )}

            {/* Description */}
            <div className="glass-card rounded-xl p-4 space-y-3">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" /> Description
              </h3>
              <p className="text-sm text-muted-foreground">{description}</p>
            </div>

            <div className="flex flex-col gap-3">
              <Button 
                variant="hero" 
                size="lg" 
                className="w-full" 
                onClick={handleSubmit} 
                disabled={submitting || !reporterPhone.trim()}
              >
                {submitting ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</>
                ) : (
                  <><Check className="w-4 h-4" /> Submit Accident Report</>
                )}
              </Button>
              {!reporterPhone.trim() && (
                <p className="text-xs text-destructive text-center">Please provide your phone number in the previous step</p>
              )}
              <Button variant="outline" size="lg" className="w-full" onClick={() => setStep(4)} disabled={submitting}>
                <ArrowLeft className="w-4 h-4" /> Back to Edit
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

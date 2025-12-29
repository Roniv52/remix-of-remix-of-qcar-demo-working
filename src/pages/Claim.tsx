import { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { 
  ArrowLeft, 
  Camera, 
  Check, 
  Download, 
  MapPin, 
  Clock, 
  CloudSun,
  Car,
  User,
  Shield,
  Image as ImageIcon,
  FileText,
  Upload,
  X,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Users,
  Eye
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { useBlurDetection } from "@/hooks/useBlurDetection";
import jsPDF from "jspdf";

const photoGuides = [
  { 
    id: 1, 
    label: "Front Damage", 
    tip: "Capture the front of your vehicle showing any damage to bumper, hood, or headlights" 
  },
  { 
    id: 2, 
    label: "Rear Damage", 
    tip: "Show the back of your vehicle including trunk, taillights, and rear bumper" 
  },
  { 
    id: 3, 
    label: "Driver Side", 
    tip: "Photograph the entire left side of your vehicle from door to fender" 
  },
  { 
    id: 4, 
    label: "Passenger Side", 
    tip: "Photograph the entire right side of your vehicle from door to fender" 
  },
  { 
    id: 5, 
    label: "Traffic & Signs", 
    tip: "Capture any traffic lights, stop signs, speed limits, or road markings near the scene" 
  },
  { 
    id: 6, 
    label: "Wide Shot of Cars", 
    tip: "Stand back 10-15 feet and capture both vehicles showing their positions after impact" 
  },
];

interface PhotoData {
  id: number;
  file: File;
  preview: string;
  blurScore?: number;
  blurMessage?: string;
  isBlurry?: boolean;
}

export default function Claim() {
  const navigate = useNavigate();
  const location = useLocation();
  const otherParty = location.state?.otherParty;
  const fileInputRefs = useRef<{ [key: number]: HTMLInputElement | null }>({});

  const { user, profile, vehicles, policies } = useProfile();
  const { analyzeImage, analyzing } = useBlurDetection();
  
  const [step, setStep] = useState(1);
  const [photos, setPhotos] = useState<PhotoData[]>([]);
  const [description, setDescription] = useState("");
  const [incidentLocation, setIncidentLocation] = useState("Detecting location...");
  const [weather, setWeather] = useState("Clear");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Witness state
  const [hasWitnesses, setHasWitnesses] = useState(false);
  const [witness1, setWitness1] = useState({ name: "", phone: "", address: "", statement: "" });
  const [witness2, setWitness2] = useState({ name: "", phone: "", address: "", statement: "" });

  // Get current location on mount
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

  const handlePhotoCapture = (guideId: number, source: "camera" | "file") => {
    const input = fileInputRefs.current[guideId];
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

  const handleFileChange = async (guideId: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const preview = URL.createObjectURL(file);
      
      // Add photo immediately with pending status
      setPhotos((prev) => {
        const filtered = prev.filter((p) => p.id !== guideId);
        return [...filtered, { id: guideId, file, preview }];
      });
      
      // Analyze for blur
      const result = await analyzeImage(file, guideId);
      
      // Update photo with blur analysis
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
      } else {
        toast({
          title: "Photo added",
          description: result.message,
        });
      }
    }
    e.target.value = "";
  };

  const removePhoto = (guideId: number) => {
    setPhotos((prev) => {
      const photo = prev.find((p) => p.id === guideId);
      if (photo) {
        URL.revokeObjectURL(photo.preview);
      }
      return prev.filter((p) => p.id !== guideId);
    });
  };

  const getPhotoForGuide = (guideId: number) => {
    return photos.find((p) => p.id === guideId);
  };

  const generatePDF = async (): Promise<Blob> => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let yPos = 20;

    const myVehicle = vehicles[0];
    const myPolicy = policies[0];

    // Helper function to check and add new page
    const checkNewPage = (requiredSpace: number) => {
      if (yPos + requiredSpace > pageHeight - 20) {
        doc.addPage();
        yPos = 20;
        return true;
      }
      return false;
    };

    // Helper to draw section header with colored background
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

    // Helper to draw info row
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

    // Helper to draw two column row
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

    const formatDate = (dateStr: string | null | undefined) => {
      if (!dateStr) return "N/A";
      return new Date(dateStr).toLocaleDateString();
    };

    // Generate a temporary claim ID
    const claimId = `CLM-${Date.now().toString(36).toUpperCase()}`;

    // ==================== HEADER ====================
    // Gold header bar
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

    // ==================== CLAIM STATUS BOX ====================
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

    // ==================== INCIDENT DETAILS ====================
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

    // ==================== MY DETAILS ====================
    drawSectionHeader("CLAIMANT DETAILS (YOUR INFORMATION)", [66, 135, 245]);
    
    // Personal Information
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(66, 135, 245);
    doc.text("Personal Information", 20, yPos);
    yPos += 8;
    
    drawTwoColumnRow("Full Name", profile?.full_name || "N/A", "ID Number", profile?.id_number || "N/A");
    drawTwoColumnRow("Gender", profile?.gender || "N/A", "Date of Birth", formatDate(profile?.date_of_birth));
    drawTwoColumnRow("Phone", profile?.phone || "N/A", "Address", profile?.address || "N/A");
    yPos += 5;

    // License Information
    doc.setFont("helvetica", "bold");
    doc.setTextColor(66, 135, 245);
    doc.text("Driver's License", 20, yPos);
    yPos += 8;
    
    drawTwoColumnRow("License Number", profile?.license_number || "N/A", "Year of Issue", String(profile?.license_year_of_issue || "N/A"));
    drawInfoRow("License Expiry", formatDate(profile?.license_expiry));
    yPos += 5;

    // Vehicle Information
    doc.setFont("helvetica", "bold");
    doc.setTextColor(66, 135, 245);
    doc.text("Vehicle Information", 20, yPos);
    yPos += 8;
    
    drawTwoColumnRow("Vehicle Number", myVehicle?.vehicle_number || "N/A", "Vehicle Type", myVehicle?.vehicle_type || "N/A");
    drawTwoColumnRow("Make", myVehicle?.make || "N/A", "Model", myVehicle?.model || "N/A");
    drawTwoColumnRow("Year", String(myVehicle?.year || "N/A"), "Color", myVehicle?.color || "N/A");
    drawInfoRow("VIN", myVehicle?.vin || "N/A");
    yPos += 5;

    // Insurance Policy
    doc.setFont("helvetica", "bold");
    doc.setTextColor(66, 135, 245);
    doc.text("Insurance Policy", 20, yPos);
    yPos += 8;
    
    drawTwoColumnRow("Policy Number", myPolicy?.policy_number || "N/A", "Insurance Company", myPolicy?.insurance_company || "N/A");
    drawTwoColumnRow("Policyholder Name", myPolicy?.policyholder_name || "N/A", "Policyholder ID", myPolicy?.policyholder_id || "N/A");
    drawTwoColumnRow("Coverage Type", myPolicy?.coverage_type || "N/A", "Agent Name", myPolicy?.agent_name || "N/A");
    drawTwoColumnRow("Valid From", myPolicy?.valid_from || "N/A", "Valid Until", myPolicy?.valid_until || "N/A");
    yPos += 10;

    // ==================== THIRD PARTY DETAILS ====================
    if (otherParty) {
      drawSectionHeader("THIRD PARTY DETAILS", [220, 53, 69]);
      
      // Personal Information
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(220, 53, 69);
      doc.text("Personal Information", 20, yPos);
      yPos += 8;
      
      drawTwoColumnRow("Full Name", otherParty.name || "N/A", "ID Number", otherParty.idNumber || "N/A");
      drawTwoColumnRow("Gender", otherParty.gender || "N/A", "Date of Birth", otherParty.dateOfBirth || "N/A");
      drawTwoColumnRow("Phone", otherParty.phone || "N/A", "Address", otherParty.address || "N/A");
      yPos += 5;

      // License Information
      doc.setFont("helvetica", "bold");
      doc.setTextColor(220, 53, 69);
      doc.text("Driver's License", 20, yPos);
      yPos += 8;
      
      drawTwoColumnRow("License Number", otherParty.licenseNumber || "N/A", "Year of Issue", String(otherParty.licenseYearOfIssue || "N/A"));
      drawInfoRow("License Expiry", otherParty.licenseExpiry || "N/A");
      yPos += 5;

      // Vehicle Information
      doc.setFont("helvetica", "bold");
      doc.setTextColor(220, 53, 69);
      doc.text("Vehicle Information", 20, yPos);
      yPos += 8;
      
      drawTwoColumnRow("Vehicle Number", otherParty.vehicleNumber || "N/A", "Vehicle Type", otherParty.vehicleType || "N/A");
      drawTwoColumnRow("Make", otherParty.vehicleMake || "N/A", "Model", otherParty.vehicleModel || "N/A");
      drawTwoColumnRow("Year", String(otherParty.vehicleYear || "N/A"), "Color", otherParty.vehicleColor || "N/A");
      yPos += 5;

      // Insurance Policy
      doc.setFont("helvetica", "bold");
      doc.setTextColor(220, 53, 69);
      doc.text("Insurance Policy", 20, yPos);
      yPos += 8;
      
      drawTwoColumnRow("Policy Number", otherParty.policyNumber || "N/A", "Insurance Company", otherParty.insuranceCompany || "N/A");
      drawTwoColumnRow("Policyholder Name", otherParty.policyholderName || "N/A", "Policyholder ID", otherParty.policyholderId || "N/A");
      drawTwoColumnRow("Coverage Type", otherParty.coverageType || "N/A", "Agent Name", otherParty.agentName || "N/A");
      drawTwoColumnRow("Valid From", otherParty.policyValidFrom || "N/A", "Valid Until", otherParty.policyValidUntil || "N/A");
      yPos += 10;
    }

    // ==================== WITNESS DETAILS ====================
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
        yPos += 5;
      }
      yPos += 5;
    }

    // ==================== SCENE PHOTOS ====================
    if (photos.length > 0) {
      doc.addPage();
      yPos = 20;
      
      // Header for photos page
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

        // Photo label with number badge
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
          // Add border around photo
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

    // ==================== SUMMARY PAGE ====================
    doc.addPage();
    
    // Full page gold header
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

    // Summary boxes
    const drawSummaryBox = (title: string, items: [string, string][], x: number, width: number, color: [number, number, number]) => {
      const boxHeight = items.length * 7 + 15;
      
      // Box header
      doc.setFillColor(color[0], color[1], color[2]);
      doc.roundedRect(x, yPos, width, 12, 2, 2, "F");
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(255, 255, 255);
      doc.text(title, x + 5, yPos + 8);
      
      // Box body
      doc.setFillColor(250, 250, 250);
      doc.rect(x, yPos + 12, width, boxHeight - 12, "F");
      doc.setDrawColor(220, 220, 220);
      doc.rect(x, yPos, width, boxHeight);
      
      let itemY = yPos + 20;
      doc.setFontSize(8);
      items.forEach(([label, value]) => {
        doc.setFont("helvetica", "bold");
        doc.setTextColor(100, 100, 100);
        doc.text(label + ":", x + 5, itemY);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(30, 30, 30);
        const truncatedValue = value.length > 25 ? value.slice(0, 22) + "..." : value;
        doc.text(truncatedValue, x + 5, itemY + 5);
        itemY += 12;
      });
      
      return boxHeight;
    };

    const claimantItems: [string, string][] = [
      ["Name", profile?.full_name || "N/A"],
      ["ID Number", profile?.id_number || "N/A"],
      ["Phone", profile?.phone || "N/A"],
      ["Vehicle", myVehicle?.vehicle_number || "N/A"],
      ["Policy #", myPolicy?.policy_number || "N/A"],
      ["Insurance", myPolicy?.insurance_company || "N/A"],
    ];

    const thirdPartyItems: [string, string][] = [
      ["Name", otherParty?.name || "N/A"],
      ["ID Number", otherParty?.idNumber || "N/A"],
      ["Phone", otherParty?.phone || "N/A"],
      ["Vehicle", otherParty?.vehicleNumber || "N/A"],
      ["Policy #", otherParty?.policyNumber || "N/A"],
      ["Insurance", otherParty?.insuranceCompany || "N/A"],
    ];

    // Count witnesses
    let witnessCount = 0;
    if (hasWitnesses) {
      if (witness1.name) witnessCount++;
      if (witness2.name) witnessCount++;
    }

    const incidentItems: [string, string][] = [
      ["Location", incidentLocation || "N/A"],
      ["Date/Time", new Date().toLocaleString()],
      ["Weather", weather || "N/A"],
      ["Photos", `${photos.length} attached`],
      ["Witnesses", witnessCount > 0 ? `${witnessCount} witness${witnessCount > 1 ? "es" : ""}` : "None"],
      ["Status", "SUBMITTED"],
    ];

    const colWidth = (pageWidth - 50) / 3;
    drawSummaryBox("CLAIMANT", claimantItems, 15, colWidth, [66, 135, 245]);
    drawSummaryBox("THIRD PARTY", thirdPartyItems, 20 + colWidth, colWidth, [220, 53, 69]);
    drawSummaryBox("INCIDENT", incidentItems, 25 + colWidth * 2, colWidth, [245, 197, 24]);

    // Footer
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

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleExportPDF = async () => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to file a claim",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Generate PDF
      const pdfBlob = await generatePDF();

      // Download PDF to device
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `QCAR-Claim-${new Date().toISOString().split("T")[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      // Convert photos to base64 for storage
      const photoUrls = await Promise.all(
        photos.map(async (photo) => {
          const base64 = await fileToBase64(photo.file);
          return base64;
        })
      );

      // Save claim to database with ALL third party details
      const { error } = await supabase.from("claims").insert({
        user_id: user.id,
        policy_id: policies[0]?.id || null,
        incident_location: incidentLocation,
        incident_time: new Date().toISOString(),
        weather_conditions: weather,
        description,
        // Third party personal details
        other_party_name: otherParty?.name || null,
        other_party_id_number: otherParty?.idNumber || null,
        other_party_gender: otherParty?.gender || null,
        other_party_date_of_birth: otherParty?.dateOfBirth || null,
        other_party_phone: otherParty?.phone || null,
        other_party_address: otherParty?.address || null,
        // Third party license details
        other_party_license_number: otherParty?.licenseNumber || null,
        other_party_license_year_of_issue: otherParty?.licenseYearOfIssue ? parseInt(otherParty.licenseYearOfIssue) : null,
        other_party_license_expiry: otherParty?.licenseExpiry || null,
        // Third party vehicle details
        other_party_vehicle: otherParty?.vehicleNumber || null,
        other_party_vehicle_type: otherParty?.vehicleType || null,
        other_party_vehicle_make: otherParty?.vehicleMake || null,
        other_party_vehicle_model: otherParty?.vehicleModel || null,
        other_party_vehicle_color: otherParty?.vehicleColor || null,
        other_party_vehicle_year: otherParty?.vehicleYear ? parseInt(otherParty.vehicleYear) : null,
        // Third party policy details
        other_party_policy_number: otherParty?.policyNumber || null,
        other_party_insurance: otherParty?.insuranceCompany || null,
        other_party_policyholder_name: otherParty?.policyholderName || null,
        other_party_policyholder_id: otherParty?.policyholderId || null,
        other_party_coverage_type: otherParty?.coverageType || null,
        other_party_policy_valid_from: otherParty?.policyValidFrom || null,
        other_party_policy_valid_until: otherParty?.policyValidUntil || null,
        other_party_agent_name: otherParty?.agentName || null,
        // Witness details
        has_witnesses: hasWitnesses,
        witness_1_name: hasWitnesses && witness1.name ? witness1.name : null,
        witness_1_phone: hasWitnesses && witness1.phone ? witness1.phone : null,
        witness_1_address: hasWitnesses && witness1.address ? witness1.address : null,
        witness_1_statement: hasWitnesses && witness1.statement ? witness1.statement : null,
        witness_2_name: hasWitnesses && witness2.name ? witness2.name : null,
        witness_2_phone: hasWitnesses && witness2.phone ? witness2.phone : null,
        witness_2_address: hasWitnesses && witness2.address ? witness2.address : null,
        witness_2_statement: hasWitnesses && witness2.statement ? witness2.statement : null,
        photos: photoUrls,
        status: "submitted",
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Claim Submitted",
        description: "PDF downloaded and claim saved to your account",
      });

      navigate("/dashboard");
    } catch (error) {
      console.error("Error submitting claim:", error);
      toast({
        title: "Error",
        description: "Failed to submit claim. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 glass-card border-b px-4 py-4">
        <div className="flex items-center gap-3 max-w-md mx-auto">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="font-semibold text-foreground">File Claim Report</h1>
            <p className="text-xs text-muted-foreground">Step {step} of 3</p>
          </div>
        </div>
      </header>

      {/* Progress bar */}
      <div className="h-1 bg-secondary">
        <div
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${(step / 3) * 100}%` }}
        />
      </div>

      <main className="px-4 py-6 max-w-md mx-auto space-y-6">
        {step === 1 && (
          <div className="space-y-6 animate-slide-up">
            <div className="text-center">
              <h2 className="text-xl font-bold text-foreground mb-2">
                Document the Scene
              </h2>
              <p className="text-sm text-muted-foreground">
                Take photos or upload from your gallery
              </p>
            </div>

            <div className="space-y-3">
              {photoGuides.map((guide) => {
                const photo = getPhotoForGuide(guide.id);
                return (
                  <div key={guide.id} className="relative">
                    <input
                      type="file"
                      ref={(el) => (fileInputRefs.current[guide.id] = el)}
                      onChange={(e) => handleFileChange(guide.id, e)}
                      className="hidden"
                      accept="image/*"
                    />
                    
                    {photo ? (
                      <div className={cn(
                        "glass-card rounded-xl p-3",
                        analyzing[guide.id] ? "border-primary/50" :
                        photo.isBlurry ? "border-destructive" : "border-success glow-yellow-sm"
                      )}>
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <img
                              src={photo.preview}
                              alt={guide.label}
                              className="w-16 h-16 rounded-lg object-cover"
                            />
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
                                <Loader2 className="w-3 h-3 animate-spin" />
                                Analyzing quality...
                              </p>
                            ) : photo.isBlurry ? (
                              <p className="text-xs text-destructive">{photo.blurMessage}</p>
                            ) : (
                              <p className="text-xs text-success">{photo.blurMessage || "Photo added"}</p>
                            )}
                          </div>
                          {analyzing[guide.id] ? (
                            <Loader2 className="w-5 h-5 text-primary animate-spin" />
                          ) : photo.isBlurry ? (
                            <AlertTriangle className="w-5 h-5 text-destructive" />
                          ) : (
                            <CheckCircle2 className="w-5 h-5 text-success" />
                          )}
                        </div>
                        {photo.isBlurry && (
                          <div className="mt-2 flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 border-destructive text-destructive hover:bg-destructive/10"
                              onClick={() => handlePhotoCapture(guide.id, "camera")}
                            >
                              <Camera className="w-4 h-4 mr-1" />
                              Retake
                            </Button>
                          </div>
                        )}
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
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={() => handlePhotoCapture(guide.id, "camera")}
                          >
                            <Camera className="w-4 h-4 mr-1" />
                            Camera
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={() => handlePhotoCapture(guide.id, "file")}
                          >
                            <Upload className="w-4 h-4 mr-1" />
                            Gallery
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <Button
              variant="hero"
              size="lg"
              className="w-full"
              onClick={() => setStep(2)}
              disabled={photos.length < 3}
            >
              Continue ({photos.length}/6 photos)
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 animate-slide-up">
            <div className="text-center">
              <h2 className="text-xl font-bold text-foreground mb-2">
                Describe the Incident
              </h2>
              <p className="text-sm text-muted-foreground">
                Provide details about what happened
              </p>
            </div>

            <div className="space-y-4">
              <div className="glass-card rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="w-4 h-4" />
                    Location
                  </span>
                  <span className="text-foreground text-right max-w-[60%] truncate">{incidentLocation}</span>
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
                  <span className="text-foreground">{weather}</span>
                </div>
              </div>

              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe how the accident occurred. Include details about speed, direction of travel, traffic conditions, etc."
                className="min-h-[120px] bg-secondary border-border"
              />

              {/* Witnesses Section */}
              <div className="glass-card rounded-xl p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4 text-primary" />
                    <Label htmlFor="witnesses" className="font-semibold text-foreground">Were there any witnesses?</Label>
                  </div>
                  <Switch
                    id="witnesses"
                    checked={hasWitnesses}
                    onCheckedChange={setHasWitnesses}
                  />
                </div>

                {hasWitnesses && (
                  <div className="space-y-4 pt-2 border-t border-border">
                    {/* Witness 1 */}
                    <div className="space-y-3">
                      <p className="text-sm font-medium text-foreground flex items-center gap-2">
                        <Users className="w-4 h-4 text-primary" />
                        Witness 1
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          placeholder="Full Name"
                          value={witness1.name}
                          onChange={(e) => setWitness1({ ...witness1, name: e.target.value })}
                          className="bg-secondary border-border"
                        />
                        <Input
                          placeholder="Phone Number"
                          value={witness1.phone}
                          onChange={(e) => setWitness1({ ...witness1, phone: e.target.value })}
                          className="bg-secondary border-border"
                        />
                      </div>
                      <Input
                        placeholder="Address"
                        value={witness1.address}
                        onChange={(e) => setWitness1({ ...witness1, address: e.target.value })}
                        className="bg-secondary border-border"
                      />
                      <Textarea
                        placeholder="Witness statement (what they saw)"
                        value={witness1.statement}
                        onChange={(e) => setWitness1({ ...witness1, statement: e.target.value })}
                        className="min-h-[80px] bg-secondary border-border"
                      />
                    </div>

                    {/* Witness 2 (Optional) */}
                    <div className="space-y-3 pt-3 border-t border-border/50">
                      <p className="text-sm font-medium text-foreground flex items-center gap-2">
                        <Users className="w-4 h-4 text-muted-foreground" />
                        Witness 2 <span className="text-xs text-muted-foreground">(Optional)</span>
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          placeholder="Full Name"
                          value={witness2.name}
                          onChange={(e) => setWitness2({ ...witness2, name: e.target.value })}
                          className="bg-secondary border-border"
                        />
                        <Input
                          placeholder="Phone Number"
                          value={witness2.phone}
                          onChange={(e) => setWitness2({ ...witness2, phone: e.target.value })}
                          className="bg-secondary border-border"
                        />
                      </div>
                      <Input
                        placeholder="Address"
                        value={witness2.address}
                        onChange={(e) => setWitness2({ ...witness2, address: e.target.value })}
                        className="bg-secondary border-border"
                      />
                      <Textarea
                        placeholder="Witness statement (what they saw)"
                        value={witness2.statement}
                        onChange={(e) => setWitness2({ ...witness2, statement: e.target.value })}
                        className="min-h-[80px] bg-secondary border-border"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                size="lg"
                className="flex-1"
                onClick={() => setStep(1)}
              >
                Back
              </Button>
              <Button
                variant="hero"
                size="lg"
                className="flex-1"
                onClick={() => setStep(3)}
                disabled={!description.trim()}
              >
                Continue
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6 animate-slide-up">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-success/20 flex items-center justify-center">
                <FileText className="w-8 h-8 text-success" />
              </div>
              <h2 className="text-xl font-bold text-foreground mb-2">
                Claim Summary
              </h2>
              <p className="text-sm text-muted-foreground">
                Review your claim before exporting
              </p>
            </div>

            {/* Your details */}
            <div className="glass-card rounded-xl p-4 space-y-3">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <User className="w-4 h-4 text-primary" />
                Your Details
              </h3>
              <div className="text-sm space-y-1">
                <p className="text-muted-foreground">Name: <span className="text-foreground">{profile?.full_name || "N/A"}</span></p>
                <p className="text-muted-foreground">Vehicle: <span className="text-foreground">{vehicles[0]?.vehicle_number || "N/A"} • {vehicles[0]?.make} {vehicles[0]?.model}</span></p>
                <p className="text-muted-foreground">Insurance: <span className="text-foreground">{policies[0]?.insurance_company || "N/A"}</span></p>
              </div>
            </div>

            {/* Other party */}
            {otherParty && (
              <div className="glass-card rounded-xl p-4 space-y-3">
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <Car className="w-4 h-4 text-primary" />
                  Other Party
                </h3>
                <div className="text-sm space-y-1">
                  <p className="text-muted-foreground">Name: <span className="text-foreground">{otherParty.name}</span></p>
                  <p className="text-muted-foreground">Vehicle: <span className="text-foreground">{otherParty.vehicleNumber}</span></p>
                  <p className="text-muted-foreground">Insurance: <span className="text-foreground">{otherParty.insuranceCompany}</span></p>
                </div>
              </div>
            )}

            {/* Photos */}
            <div className="glass-card rounded-xl p-4 space-y-3">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-primary" />
                Photos Captured ({photos.length})
              </h3>
              <div className="flex gap-2 flex-wrap">
                {photos.map((photo) => (
                  <img
                    key={photo.id}
                    src={photo.preview}
                    alt={`Photo ${photo.id}`}
                    className="w-16 h-16 rounded-lg object-cover"
                  />
                ))}
              </div>
            </div>

            {/* Witnesses */}
            {hasWitnesses && (
              <div className="glass-card rounded-xl p-4 space-y-3">
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <Eye className="w-4 h-4 text-primary" />
                  Witnesses
                </h3>
                <div className="text-sm space-y-2">
                  {witness1.name && (
                    <div className="space-y-1">
                      <p className="text-muted-foreground font-medium">Witness 1:</p>
                      <p className="text-foreground">{witness1.name} • {witness1.phone}</p>
                      {witness1.statement && <p className="text-muted-foreground text-xs italic">"{witness1.statement}"</p>}
                    </div>
                  )}
                  {witness2.name && (
                    <div className="space-y-1 pt-2 border-t border-border/50">
                      <p className="text-muted-foreground font-medium">Witness 2:</p>
                      <p className="text-foreground">{witness2.name} • {witness2.phone}</p>
                      {witness2.statement && <p className="text-muted-foreground text-xs italic">"{witness2.statement}"</p>}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Description */}
            <div className="glass-card rounded-xl p-4 space-y-3">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                Incident Description
              </h3>
              <p className="text-sm text-muted-foreground">{description}</p>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                size="lg"
                className="flex-1"
                onClick={() => setStep(2)}
                disabled={isSubmitting}
              >
                Back
              </Button>
              <Button
                variant="hero"
                size="lg"
                className="flex-1"
                onClick={handleExportPDF}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Export PDF
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

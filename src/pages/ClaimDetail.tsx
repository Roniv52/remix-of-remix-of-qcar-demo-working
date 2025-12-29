import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { 
  ArrowLeft, 
  MapPin, 
  Clock, 
  CloudSun, 
  Car, 
  User, 
  Shield,
  FileText,
  Download,
  Loader2,
  Eye,
  Users,
  Pencil,
  Lock
} from "lucide-react";
import { useProfile } from "@/hooks/useProfile";
import { EditClaimDialog } from "@/components/EditClaimDialog";
import jsPDF from "jspdf";
import { toast } from "@/hooks/use-toast";

interface ClaimData {
  id: string;
  incident_location: string | null;
  incident_time: string | null;
  weather_conditions: string | null;
  description: string | null;
  // Third party personal details
  other_party_name: string | null;
  other_party_id_number: string | null;
  other_party_gender: string | null;
  other_party_date_of_birth: string | null;
  other_party_phone: string | null;
  other_party_address: string | null;
  // Third party license details
  other_party_license_number: string | null;
  other_party_license_year_of_issue: number | null;
  other_party_license_expiry: string | null;
  // Third party vehicle details
  other_party_vehicle: string | null;
  other_party_vehicle_type: string | null;
  other_party_vehicle_make: string | null;
  other_party_vehicle_model: string | null;
  other_party_vehicle_color: string | null;
  other_party_vehicle_year: number | null;
  // Third party policy details
  other_party_policy_number: string | null;
  other_party_insurance: string | null;
  other_party_policyholder_name: string | null;
  other_party_policyholder_id: string | null;
  other_party_coverage_type: string | null;
  other_party_policy_valid_from: string | null;
  other_party_policy_valid_until: string | null;
  other_party_agent_name: string | null;
  // Witness details
  has_witnesses: boolean | null;
  witness_1_name: string | null;
  witness_1_phone: string | null;
  witness_1_address: string | null;
  witness_1_statement: string | null;
  witness_2_name: string | null;
  witness_2_phone: string | null;
  witness_2_address: string | null;
  witness_2_statement: string | null;
  photos: string[] | null;
  status: string | null;
  created_at: string;
  policy_id: string | null;
}

const photoLabels = [
  "Front Damage",
  "Rear Damage",
  "Driver Side",
  "Passenger Side",
  "Traffic & Signs",
  "Wide Shot of Cars"
];

export default function ClaimDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile, vehicles, policies } = useProfile();
  const [claim, setClaim] = useState<ClaimData | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const fetchClaim = async () => {
    if (!id) return;
    
    const { data, error } = await supabase
      .from("claims")
      .select("*")
      .eq("id", id)
      .single();
    
    if (error) {
      toast({
        title: "Error",
        description: "Claim not found",
        variant: "destructive",
      });
      navigate("/dashboard");
      return;
    }
    
    setClaim(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchClaim();
  }, [id, navigate]);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString();
  };

  const handleDownloadPDF = async () => {
    if (!claim) return;
    
    setDownloading(true);
    
    try {
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
      doc.text(`Report ID: ${claim.id.slice(0, 8).toUpperCase()}`, pageWidth - 20, 18, { align: "right" });
      doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth - 20, 26, { align: "right" });
      
      yPos = 50;

      // ==================== CLAIM STATUS BOX ====================
      doc.setFillColor(240, 240, 240);
      doc.roundedRect(15, yPos - 5, pageWidth - 30, 25, 3, 3, "F");
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(50, 50, 50);
      doc.text("CLAIM STATUS:", 20, yPos + 5);
      
      const statusColor = claim.status === "submitted" ? [34, 139, 34] : [100, 100, 100];
      doc.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
      doc.text((claim.status || "DRAFT").toUpperCase(), 70, yPos + 5);
      
      doc.setTextColor(50, 50, 50);
      doc.text("DATE FILED:", 120, yPos + 5);
      doc.setFont("helvetica", "normal");
      doc.text(new Date(claim.created_at).toLocaleDateString(), 155, yPos + 5);
      
      yPos += 35;

      // ==================== INCIDENT DETAILS ====================
      drawSectionHeader("INCIDENT DETAILS");
      
      drawTwoColumnRow("Location", claim.incident_location || "N/A", "Date & Time", claim.incident_time ? new Date(claim.incident_time).toLocaleString() : "N/A");
      drawInfoRow("Weather Conditions", claim.weather_conditions || "N/A");
      yPos += 5;
      
      doc.setFont("helvetica", "bold");
      doc.setTextColor(80, 80, 80);
      doc.text("Description of Incident:", 20, yPos);
      yPos += 6;
      doc.setFont("helvetica", "normal");
      doc.setTextColor(30, 30, 30);
      const descLines = doc.splitTextToSize(claim.description || "No description provided", pageWidth - 40);
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
      drawSectionHeader("THIRD PARTY DETAILS", [220, 53, 69]);
      
      // Personal Information
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(220, 53, 69);
      doc.text("Personal Information", 20, yPos);
      yPos += 8;
      
      drawTwoColumnRow("Full Name", claim.other_party_name || "N/A", "ID Number", claim.other_party_id_number || "N/A");
      drawTwoColumnRow("Gender", claim.other_party_gender || "N/A", "Date of Birth", claim.other_party_date_of_birth || "N/A");
      drawTwoColumnRow("Phone", claim.other_party_phone || "N/A", "Address", claim.other_party_address || "N/A");
      yPos += 5;

      // License Information
      doc.setFont("helvetica", "bold");
      doc.setTextColor(220, 53, 69);
      doc.text("Driver's License", 20, yPos);
      yPos += 8;
      
      drawTwoColumnRow("License Number", claim.other_party_license_number || "N/A", "Year of Issue", String(claim.other_party_license_year_of_issue || "N/A"));
      drawInfoRow("License Expiry", claim.other_party_license_expiry || "N/A");
      yPos += 5;

      // Vehicle Information
      doc.setFont("helvetica", "bold");
      doc.setTextColor(220, 53, 69);
      doc.text("Vehicle Information", 20, yPos);
      yPos += 8;
      
      drawTwoColumnRow("Vehicle Number", claim.other_party_vehicle || "N/A", "Vehicle Type", claim.other_party_vehicle_type || "N/A");
      drawTwoColumnRow("Make", claim.other_party_vehicle_make || "N/A", "Model", claim.other_party_vehicle_model || "N/A");
      drawTwoColumnRow("Year", String(claim.other_party_vehicle_year || "N/A"), "Color", claim.other_party_vehicle_color || "N/A");
      yPos += 5;

      // Insurance Policy
      doc.setFont("helvetica", "bold");
      doc.setTextColor(220, 53, 69);
      doc.text("Insurance Policy", 20, yPos);
      yPos += 8;
      
      drawTwoColumnRow("Policy Number", claim.other_party_policy_number || "N/A", "Insurance Company", claim.other_party_insurance || "N/A");
      drawTwoColumnRow("Policyholder Name", claim.other_party_policyholder_name || "N/A", "Policyholder ID", claim.other_party_policyholder_id || "N/A");
      drawTwoColumnRow("Coverage Type", claim.other_party_coverage_type || "N/A", "Agent Name", claim.other_party_agent_name || "N/A");
      drawTwoColumnRow("Valid From", claim.other_party_policy_valid_from || "N/A", "Valid Until", claim.other_party_policy_valid_until || "N/A");
      yPos += 10;

      // ==================== WITNESS DETAILS ====================
      if (claim.has_witnesses && (claim.witness_1_name || claim.witness_2_name)) {
        checkNewPage(60);
        drawSectionHeader("WITNESS INFORMATION", [75, 0, 130]);
        
        const hasWitness1 = claim.witness_1_name;
        const hasWitness2 = claim.witness_2_name;

        if (hasWitness1) {
          doc.setFontSize(10);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(75, 0, 130);
          doc.text("Witness 1", 20, yPos);
          yPos += 8;
          
          drawTwoColumnRow("Full Name", claim.witness_1_name || "N/A", "Phone", claim.witness_1_phone || "N/A");
          drawInfoRow("Address", claim.witness_1_address || "N/A");
          
          if (claim.witness_1_statement) {
            doc.setFont("helvetica", "bold");
            doc.setTextColor(80, 80, 80);
            doc.text("Statement:", 20, yPos);
            yPos += 6;
            doc.setFont("helvetica", "italic");
            doc.setTextColor(50, 50, 50);
            const stmtLines = doc.splitTextToSize(`"${claim.witness_1_statement}"`, pageWidth - 40);
            stmtLines.forEach((line: string) => {
              checkNewPage(6);
              doc.text(line, 20, yPos);
              yPos += 5;
            });
          }
          yPos += 5;
        }

        if (hasWitness2) {
          checkNewPage(40);
          doc.setFontSize(10);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(75, 0, 130);
          doc.text("Witness 2", 20, yPos);
          yPos += 8;
          
          drawTwoColumnRow("Full Name", claim.witness_2_name || "N/A", "Phone", claim.witness_2_phone || "N/A");
          drawInfoRow("Address", claim.witness_2_address || "N/A");
          
          if (claim.witness_2_statement) {
            doc.setFont("helvetica", "bold");
            doc.setTextColor(80, 80, 80);
            doc.text("Statement:", 20, yPos);
            yPos += 6;
            doc.setFont("helvetica", "italic");
            doc.setTextColor(50, 50, 50);
            const stmtLines = doc.splitTextToSize(`"${claim.witness_2_statement}"`, pageWidth - 40);
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
      if (claim.photos && claim.photos.length > 0) {
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
        doc.text(`${claim.photos.length} Photos Attached`, pageWidth - 20, 16, { align: "right" });
        
        yPos = 40;

        for (let i = 0; i < claim.photos.length; i++) {
          const photoUrl = claim.photos[i];
          
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
          doc.text(photoLabels[i] || `Photo ${i + 1}`, 35, yPos + 5);
          yPos += 12;

          try {
            // Add border around photo
            doc.setDrawColor(200, 200, 200);
            doc.setLineWidth(0.5);
            doc.rect(19, yPos - 1, 82, 62);
            doc.addImage(photoUrl, "JPEG", 20, yPos, 80, 60);
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
      doc.text(`Quick Reference Card - Claim ID: ${claim.id.slice(0, 8).toUpperCase()}`, pageWidth / 2, 32, { align: "center" });
      
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
        ["Name", claim.other_party_name || "N/A"],
        ["ID Number", claim.other_party_id_number || "N/A"],
        ["Phone", claim.other_party_phone || "N/A"],
        ["Vehicle", claim.other_party_vehicle || "N/A"],
        ["Policy #", claim.other_party_policy_number || "N/A"],
        ["Insurance", claim.other_party_insurance || "N/A"],
      ];

      // Count witnesses
      let witnessCount = 0;
      if (claim.has_witnesses) {
        if (claim.witness_1_name) witnessCount++;
        if (claim.witness_2_name) witnessCount++;
      }

      const incidentItems: [string, string][] = [
        ["Location", claim.incident_location || "N/A"],
        ["Date/Time", claim.incident_time ? new Date(claim.incident_time).toLocaleString() : "N/A"],
        ["Weather", claim.weather_conditions || "N/A"],
        ["Photos", `${claim.photos?.length || 0} attached`],
        ["Witnesses", witnessCount > 0 ? `${witnessCount} witness${witnessCount > 1 ? "es" : ""}` : "None"],
        ["Status", (claim.status || "draft").toUpperCase()],
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

      // Download
      const pdfBlob = doc.output("blob");
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `QCAR-Claim-${claim.id.slice(0, 8).toUpperCase()}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "PDF Downloaded",
        description: "Your complete claim report has been downloaded",
      });
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast({
        title: "Error",
        description: "Failed to generate PDF",
        variant: "destructive",
      });
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!claim) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 glass-card border-b px-4 py-4">
        <div className="flex items-center gap-3 max-w-md mx-auto">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="font-semibold text-foreground">Claim Report</h1>
            <p className="text-xs text-muted-foreground">
              {new Date(claim.created_at).toLocaleDateString()}
            </p>
          </div>
          <span className={`text-xs px-2 py-1 rounded-full ${
            claim.status === "submitted" 
              ? "bg-success/20 text-success" 
              : "bg-secondary text-muted-foreground"
          }`}>
            {claim.status || "Draft"}
          </span>
        </div>
      </header>

      <main className="px-4 py-6 max-w-md mx-auto space-y-4">
        {/* Incident Details - LOCKED */}
        <div className="glass-card rounded-xl p-4 space-y-3 relative">
          <div className="absolute top-3 right-3" title="Court-admissible - cannot be edited">
            <Lock className="w-4 h-4 text-muted-foreground" />
          </div>
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" />
            Incident Details
            <span className="text-xs text-muted-foreground font-normal">(locked)</span>
          </h3>
          <div className="text-sm space-y-2 bg-muted/30 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground flex items-center gap-2">
                <MapPin className="w-4 h-4" /> Location
              </span>
              <span className="text-foreground text-right max-w-[60%]">
                {claim.incident_location || "N/A"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground flex items-center gap-2">
                <Clock className="w-4 h-4" /> Time
              </span>
              <span className="text-foreground">
                {claim.incident_time ? new Date(claim.incident_time).toLocaleString() : "N/A"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground flex items-center gap-2">
                <CloudSun className="w-4 h-4" /> Weather
              </span>
              <span className="text-foreground">{claim.weather_conditions || "N/A"}</span>
            </div>
          </div>
        </div>

        {/* Your Details */}
        <div className="glass-card rounded-xl p-4 space-y-3">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <User className="w-4 h-4 text-primary" />
            Your Details
          </h3>
          <div className="text-sm space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <p className="text-muted-foreground">Name: <span className="text-foreground">{profile?.full_name || "N/A"}</span></p>
              <p className="text-muted-foreground">ID: <span className="text-foreground">{profile?.id_number || "N/A"}</span></p>
              <p className="text-muted-foreground">Phone: <span className="text-foreground">{profile?.phone || "N/A"}</span></p>
              <p className="text-muted-foreground">License: <span className="text-foreground">{profile?.license_number || "N/A"}</span></p>
            </div>
            <div className="pt-2 border-t border-border">
              <p className="text-muted-foreground">
                Vehicle: <span className="text-foreground">{vehicles[0]?.vehicle_number || "N/A"} • {vehicles[0]?.vehicle_type || ""} {vehicles[0]?.make} {vehicles[0]?.model} ({vehicles[0]?.color}, {vehicles[0]?.year})</span>
              </p>
            </div>
            <div className="pt-2 border-t border-border grid grid-cols-2 gap-2">
              <p className="text-muted-foreground">Insurance: <span className="text-foreground">{policies[0]?.insurance_company || "N/A"}</span></p>
              <p className="text-muted-foreground">Policy #: <span className="text-foreground">{policies[0]?.policy_number || "N/A"}</span></p>
              <p className="text-muted-foreground">Coverage: <span className="text-foreground">{policies[0]?.coverage_type || "N/A"}</span></p>
              <p className="text-muted-foreground">Agent: <span className="text-foreground">{policies[0]?.agent_name || "N/A"}</span></p>
            </div>
          </div>
        </div>

        {/* Other Party */}
        {claim.other_party_name && (
          <div className="glass-card rounded-xl p-4 space-y-3">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <Car className="w-4 h-4 text-primary" />
              Other Party
            </h3>
            <div className="text-sm space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <p className="text-muted-foreground">Name: <span className="text-foreground">{claim.other_party_name}</span></p>
                <p className="text-muted-foreground">ID: <span className="text-foreground">{claim.other_party_id_number || "N/A"}</span></p>
                <p className="text-muted-foreground">Phone: <span className="text-foreground">{claim.other_party_phone || "N/A"}</span></p>
                <p className="text-muted-foreground">License: <span className="text-foreground">{claim.other_party_license_number || "N/A"}</span></p>
              </div>
              <div className="pt-2 border-t border-border">
                <p className="text-muted-foreground">
                  Vehicle: <span className="text-foreground">{claim.other_party_vehicle || "N/A"} • {claim.other_party_vehicle_type || ""} {claim.other_party_vehicle_make || ""} {claim.other_party_vehicle_model || ""} ({claim.other_party_vehicle_color || "N/A"}, {claim.other_party_vehicle_year || "N/A"})</span>
                </p>
              </div>
              <div className="pt-2 border-t border-border grid grid-cols-2 gap-2">
                <p className="text-muted-foreground">Insurance: <span className="text-foreground">{claim.other_party_insurance || "N/A"}</span></p>
                <p className="text-muted-foreground">Policy #: <span className="text-foreground">{claim.other_party_policy_number || "N/A"}</span></p>
                <p className="text-muted-foreground">Coverage: <span className="text-foreground">{claim.other_party_coverage_type || "N/A"}</span></p>
                <p className="text-muted-foreground">Agent: <span className="text-foreground">{claim.other_party_agent_name || "N/A"}</span></p>
              </div>
            </div>
          </div>
        )}

        {/* Witnesses */}
        {claim.has_witnesses && (claim.witness_1_name || claim.witness_2_name) && (
          <div className="glass-card rounded-xl p-4 space-y-3">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <Eye className="w-4 h-4 text-primary" />
              Witnesses
            </h3>
            <div className="text-sm space-y-3">
              {claim.witness_1_name && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Users className="w-3 h-3 text-muted-foreground" />
                    <span className="font-medium text-foreground">Witness 1</span>
                  </div>
                  <p className="text-muted-foreground pl-5">
                    {claim.witness_1_name} • {claim.witness_1_phone || "No phone"}
                  </p>
                  {claim.witness_1_address && (
                    <p className="text-muted-foreground text-xs pl-5">{claim.witness_1_address}</p>
                  )}
                  {claim.witness_1_statement && (
                    <p className="text-muted-foreground text-xs italic pl-5">"{claim.witness_1_statement}"</p>
                  )}
                </div>
              )}
              {claim.witness_2_name && (
                <div className="space-y-1 pt-2 border-t border-border/50">
                  <div className="flex items-center gap-2">
                    <Users className="w-3 h-3 text-muted-foreground" />
                    <span className="font-medium text-foreground">Witness 2</span>
                  </div>
                  <p className="text-muted-foreground pl-5">
                    {claim.witness_2_name} • {claim.witness_2_phone || "No phone"}
                  </p>
                  {claim.witness_2_address && (
                    <p className="text-muted-foreground text-xs pl-5">{claim.witness_2_address}</p>
                  )}
                  {claim.witness_2_statement && (
                    <p className="text-muted-foreground text-xs italic pl-5">"{claim.witness_2_statement}"</p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Description - EDITABLE */}
        <div className="glass-card rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              Description
            </h3>
            <Button variant="ghost" size="sm" onClick={() => setEditOpen(true)}>
              <Pencil className="w-4 h-4" />
              Edit
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            {claim.description || "No description provided"}
          </p>
        </div>

        {/* Photos */}
        {claim.photos && claim.photos.length > 0 && (
          <div className="glass-card rounded-xl p-4 space-y-3">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary" />
              Scene Photos ({claim.photos.length})
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {claim.photos.map((photo, index) => (
                <div key={index} className="space-y-1">
                  <img
                    src={photo}
                    alt={photoLabels[index] || `Photo ${index + 1}`}
                    className="w-full h-24 rounded-lg object-cover"
                  />
                  <p className="text-xs text-muted-foreground text-center">
                    {photoLabels[index] || `Photo ${index + 1}`}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Download PDF Button */}
        <Button
          variant="hero"
          size="lg"
          className="w-full"
          onClick={handleDownloadPDF}
          disabled={downloading}
        >
          {downloading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              Download PDF Report
            </>
          )}
        </Button>
      </main>

      {/* Edit Dialog */}
      {claim && (
        <EditClaimDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          claim={claim}
          onSave={fetchClaim}
        />
      )}
    </div>
  );
}

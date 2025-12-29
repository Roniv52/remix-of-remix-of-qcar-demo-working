import { Car, Shield, Calendar, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface PolicyCardProps {
  vehicleNumber: string;
  carType: string;
  color: string;
  year: string;
  coverageType: string;
  insuranceCompany: string;
  validUntil: string;
  isActive?: boolean;
}

export function PolicyCard({
  vehicleNumber,
  carType,
  color,
  year,
  coverageType,
  insuranceCompany,
  validUntil,
  isActive = true,
}: PolicyCardProps) {
  return (
    <div
      className={cn(
        "relative glass-card rounded-2xl p-5 min-w-[280px] max-w-[320px] transition-all duration-300",
        isActive ? "glow-yellow-sm" : "opacity-70"
      )}
    >
      {/* Status badge */}
      <div className="absolute top-4 right-4">
        <span
          className={cn(
            "px-2 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider",
            isActive
              ? "bg-success/20 text-success"
              : "bg-muted text-muted-foreground"
          )}
        >
          {isActive ? "Active" : "Expired"}
        </span>
      </div>

      {/* Vehicle info */}
      <div className="flex items-start gap-3 mb-4">
        <div className="p-2.5 rounded-xl bg-primary/10">
          <Car className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="font-bold text-lg text-foreground">{vehicleNumber}</h3>
          <p className="text-sm text-muted-foreground">
            {carType} • {color} • {year}
          </p>
        </div>
      </div>

      {/* Details grid */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <Shield className="w-4 h-4 text-primary" />
          <div>
            <p className="text-xs text-muted-foreground">Coverage</p>
            <p className="text-sm font-medium text-foreground">{coverageType}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Building2 className="w-4 h-4 text-primary" />
          <div>
            <p className="text-xs text-muted-foreground">Insurance Company</p>
            <p className="text-sm font-medium text-foreground">{insuranceCompany}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Calendar className="w-4 h-4 text-primary" />
          <div>
            <p className="text-xs text-muted-foreground">Valid Until</p>
            <p className="text-sm font-medium text-foreground">{validUntil}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

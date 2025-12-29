import QRCode from "react-qr-code";
import { Download, Share2 } from "lucide-react";
import { Button } from "./ui/button";

interface QRDisplayProps {
  value: string;
  size?: number;
  userName?: string;
}

export function QRDisplay({ value, size = 200, userName = "Driver" }: QRDisplayProps) {
  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "My QCAR Code",
          text: "Scan this QR code to exchange insurance details",
          url: value,
        });
      } catch (err) {
        console.log("Share cancelled");
      }
    }
  };

  return (
    <div className="flex flex-col items-center gap-6 animate-slide-up">
      {/* QR Container */}
      <div className="relative">
        <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full" />
        <div className="relative glass-card p-6 rounded-3xl glow-yellow">
          <div className="bg-foreground p-4 rounded-2xl">
            <QRCode
              value={value}
              size={size}
              style={{ height: "auto", maxWidth: "100%", width: "100%" }}
              viewBox={`0 0 256 256`}
              fgColor="#0a0a0a"
              bgColor="#fafafa"
            />
          </div>
        </div>
      </div>

      {/* User info */}
      <div className="text-center">
        <p className="text-lg font-semibold text-foreground">{userName}</p>
        <p className="text-sm text-muted-foreground">
          Show this QR code at the accident scene
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Button variant="glass" size="sm" onClick={handleShare}>
          <Share2 className="w-4 h-4" />
          Share
        </Button>
        <Button variant="glass" size="sm">
          <Download className="w-4 h-4" />
          Save
        </Button>
      </div>
    </div>
  );
}

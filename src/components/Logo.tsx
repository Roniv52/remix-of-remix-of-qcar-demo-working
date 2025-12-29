import qcarLogo from "@/assets/qcar-logo.png";

interface LogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
}

const sizeClasses = {
  sm: "w-8 h-8",
  md: "w-12 h-12",
  lg: "w-20 h-20",
  xl: "w-32 h-32",
};

export function Logo({ size = "md", showText = true }: LogoProps) {
  return (
    <div className="flex items-center gap-3">
      <img
        src={qcarLogo}
        alt="QCAR Logo"
        className={`${sizeClasses[size]} object-contain`}
      />
    </div>
  );
}

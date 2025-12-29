import { useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { Profile } from "@/hooks/useProfile";

interface EditProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: Profile | null;
  userId: string;
  onSave: () => void;
}

export function EditProfileDialog({
  open,
  onOpenChange,
  profile,
  userId,
  onSave,
}: EditProfileDialogProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [form, setForm] = useState({
    full_name: profile?.full_name || "",
    id_number: profile?.id_number || "",
    gender: profile?.gender || "",
    date_of_birth: profile?.date_of_birth || "",
    phone: profile?.phone || "",
    address: profile?.address || "",
    license_number: profile?.license_number || "",
    license_year_of_issue: profile?.license_year_of_issue?.toString() || "",
    license_expiry: profile?.license_expiry || "",
  });

  const handleSave = async () => {
    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: form.full_name || null,
          id_number: form.id_number || null,
          gender: form.gender || null,
          date_of_birth: form.date_of_birth || null,
          phone: form.phone || null,
          address: form.address || null,
          license_number: form.license_number || null,
          license_year_of_issue: form.license_year_of_issue ? parseInt(form.license_year_of_issue) : null,
          license_expiry: form.license_expiry || null,
        })
        .eq("user_id", userId);

      if (error) throw error;

      toast({
        title: "Profile updated",
        description: "Your profile has been saved.",
      });
      onSave();
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Update failed",
        description: error instanceof Error ? error.message : "Could not update profile",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Update form when profile changes
  useState(() => {
    if (profile) {
      setForm({
        full_name: profile.full_name || "",
        id_number: profile.id_number || "",
        gender: profile.gender || "",
        date_of_birth: profile.date_of_birth || "",
        phone: profile.phone || "",
        address: profile.address || "",
        license_number: profile.license_number || "",
        license_year_of_issue: profile.license_year_of_issue?.toString() || "",
        license_expiry: profile.license_expiry || "",
      });
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Personal Information */}
          <div className="space-y-3">
            <h3 className="font-medium text-sm text-foreground">Personal Information</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label className="text-xs">Full Name</Label>
                <Input
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  placeholder="John Doe"
                />
              </div>
              <div>
                <Label className="text-xs">ID Number</Label>
                <Input
                  value={form.id_number}
                  onChange={(e) => setForm({ ...form, id_number: e.target.value })}
                  placeholder="123456789"
                />
              </div>
              <div>
                <Label className="text-xs">Gender</Label>
                <Select
                  value={form.gender}
                  onValueChange={(value) => setForm({ ...form, gender: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Date of Birth</Label>
                <Input
                  type="date"
                  value={form.date_of_birth}
                  onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-xs">Phone</Label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="+1 234 567 8900"
                />
              </div>
              <div className="col-span-2">
                <Label className="text-xs">Address</Label>
                <Input
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="123 Main St, City"
                />
              </div>
            </div>
          </div>

          {/* License Information */}
          <div className="space-y-3">
            <h3 className="font-medium text-sm text-foreground">License Information</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label className="text-xs">License Number</Label>
                <Input
                  value={form.license_number}
                  onChange={(e) => setForm({ ...form, license_number: e.target.value })}
                  placeholder="DL123456"
                />
              </div>
              <div>
                <Label className="text-xs">Year of Issue</Label>
                <Input
                  value={form.license_year_of_issue}
                  onChange={(e) => setForm({ ...form, license_year_of_issue: e.target.value })}
                  placeholder="2020"
                />
              </div>
              <div>
                <Label className="text-xs">Expiry Date</Label>
                <Input
                  type="date"
                  value={form.license_expiry}
                  onChange={(e) => setForm({ ...form, license_expiry: e.target.value })}
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

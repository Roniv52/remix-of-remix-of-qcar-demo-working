import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { 
  Loader2, 
  Save, 
  CloudSun, 
  Users, 
  Camera, 
  Upload, 
  X, 
  AlertTriangle,
  CheckCircle2,
  ImageIcon
} from "lucide-react";
import { useBlurDetection } from "@/hooks/useBlurDetection";
import { cn } from "@/lib/utils";

interface PhotoData {
  id: number;
  file?: File;
  preview: string;
  blurScore?: number;
  blurMessage?: string;
  isBlurry?: boolean;
  isExisting?: boolean;
}

interface EditClaimDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  claim: {
    id: string;
    description: string | null;
    weather_conditions: string | null;
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
  };
  onSave: () => void;
}

const photoGuides = [
  { id: 1, label: "Front Damage" },
  { id: 2, label: "Rear Damage" },
  { id: 3, label: "Driver Side" },
  { id: 4, label: "Passenger Side" },
  { id: 5, label: "Traffic & Signs" },
  { id: 6, label: "Wide Shot" },
];

export function EditClaimDialog({ open, onOpenChange, claim, onSave }: EditClaimDialogProps) {
  const [saving, setSaving] = useState(false);
  const [description, setDescription] = useState(claim.description || "");
  const [weather, setWeather] = useState(claim.weather_conditions || "Clear");
  const [hasWitnesses, setHasWitnesses] = useState(claim.has_witnesses || false);
  const [witness1, setWitness1] = useState({
    name: claim.witness_1_name || "",
    phone: claim.witness_1_phone || "",
    address: claim.witness_1_address || "",
    statement: claim.witness_1_statement || "",
  });
  const [witness2, setWitness2] = useState({
    name: claim.witness_2_name || "",
    phone: claim.witness_2_phone || "",
    address: claim.witness_2_address || "",
    statement: claim.witness_2_statement || "",
  });

  // Photos state
  const [photos, setPhotos] = useState<PhotoData[]>(() => {
    return (claim.photos || []).map((url, index) => ({
      id: index + 1,
      preview: url,
      isExisting: true,
    }));
  });

  const fileInputRefs = useRef<{ [key: number]: HTMLInputElement | null }>({});
  const { analyzeImage, analyzing } = useBlurDetection();

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
        return [...filtered, { id: guideId, file, preview, isExisting: false }];
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
      }
    }
    e.target.value = "";
  };

  const removePhoto = (guideId: number) => {
    setPhotos((prev) => {
      const photo = prev.find((p) => p.id === guideId);
      if (photo && !photo.isExisting) {
        URL.revokeObjectURL(photo.preview);
      }
      return prev.filter((p) => p.id !== guideId);
    });
  };

  const getPhotoForGuide = (guideId: number) => {
    return photos.find((p) => p.id === guideId);
  };

  const uploadPhotosToStorage = async (claimId: string): Promise<string[]> => {
    const uploadedUrls: string[] = [];

    for (const photo of photos) {
      if (photo.isExisting) {
        // Keep existing URLs
        uploadedUrls.push(photo.preview);
      } else if (photo.file) {
        // Upload new files
        const fileExt = photo.file.name.split('.').pop();
        const fileName = `${claimId}/${Date.now()}-${photo.id}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('claim-photos')
          .upload(fileName, photo.file);

        if (uploadError) {
          console.error('Upload error:', uploadError);
          throw uploadError;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('claim-photos')
          .getPublicUrl(fileName);

        uploadedUrls.push(publicUrl);
      }
    }

    return uploadedUrls;
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Upload new photos first
      const photoUrls = await uploadPhotosToStorage(claim.id);

      const { error } = await supabase
        .from("claims")
        .update({
          description,
          weather_conditions: weather,
          has_witnesses: hasWitnesses,
          witness_1_name: hasWitnesses ? witness1.name || null : null,
          witness_1_phone: hasWitnesses ? witness1.phone || null : null,
          witness_1_address: hasWitnesses ? witness1.address || null : null,
          witness_1_statement: hasWitnesses ? witness1.statement || null : null,
          witness_2_name: hasWitnesses ? witness2.name || null : null,
          witness_2_phone: hasWitnesses ? witness2.phone || null : null,
          witness_2_address: hasWitnesses ? witness2.address || null : null,
          witness_2_statement: hasWitnesses ? witness2.statement || null : null,
          photos: photoUrls,
        })
        .eq("id", claim.id);

      if (error) throw error;

      toast({
        title: "Changes saved",
        description: "Your claim details have been updated.",
      });
      onSave();
      onOpenChange(false);
    } catch (error) {
      console.error('Save error:', error);
      toast({
        title: "Error",
        description: "Failed to save changes.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit My Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Photos Section */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <ImageIcon className="w-4 h-4" />
              Scene Photos
            </Label>
            <div className="grid grid-cols-3 gap-2">
              {photoGuides.map((guide) => {
                const photo = getPhotoForGuide(guide.id);
                const isAnalyzing = analyzing[guide.id];
                
                return (
                  <div key={guide.id} className="relative">
                    <input
                      type="file"
                      ref={(el) => (fileInputRefs.current[guide.id] = el)}
                      className="hidden"
                      onChange={(e) => handleFileChange(guide.id, e)}
                      accept="image/*"
                    />
                    
                    {photo ? (
                      <div className="relative aspect-square rounded-lg overflow-hidden group">
                        <img
                          src={photo.preview}
                          alt={guide.label}
                          className="w-full h-full object-cover"
                        />
                        
                        {/* Blur indicator */}
                        {!isAnalyzing && photo.blurScore !== undefined && (
                          <div className={cn(
                            "absolute top-1 right-1 p-1 rounded-full",
                            photo.isBlurry ? "bg-destructive" : "bg-green-500"
                          )}>
                            {photo.isBlurry ? (
                              <AlertTriangle className="w-3 h-3 text-white" />
                            ) : (
                              <CheckCircle2 className="w-3 h-3 text-white" />
                            )}
                          </div>
                        )}
                        
                        {/* Analyzing spinner */}
                        {isAnalyzing && (
                          <div className="absolute inset-0 bg-background/50 flex items-center justify-center">
                            <Loader2 className="w-5 h-5 animate-spin" />
                          </div>
                        )}
                        
                        {/* Remove button */}
                        <button
                          onClick={() => removePhoto(guide.id)}
                          className="absolute top-1 left-1 p-1 rounded-full bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </button>
                        
                        {/* Label */}
                        <div className="absolute bottom-0 left-0 right-0 bg-background/80 px-1 py-0.5">
                          <p className="text-[10px] truncate text-center">{guide.label}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="aspect-square rounded-lg border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center gap-1 bg-muted/30">
                        <div className="flex gap-1">
                          <button
                            onClick={() => handlePhotoCapture(guide.id, "camera")}
                            className="p-1.5 rounded-full bg-primary/10 hover:bg-primary/20 transition-colors"
                          >
                            <Camera className="w-3 h-3 text-primary" />
                          </button>
                          <button
                            onClick={() => handlePhotoCapture(guide.id, "file")}
                            className="p-1.5 rounded-full bg-primary/10 hover:bg-primary/20 transition-colors"
                          >
                            <Upload className="w-3 h-3 text-primary" />
                          </button>
                        </div>
                        <p className="text-[9px] text-muted-foreground text-center px-1">{guide.label}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Incident Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what happened..."
              rows={4}
            />
          </div>

          {/* Weather */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <CloudSun className="w-4 h-4" />
              Weather Conditions
            </Label>
            <Select value={weather} onValueChange={setWeather}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Clear">Clear</SelectItem>
                <SelectItem value="Cloudy">Cloudy</SelectItem>
                <SelectItem value="Rainy">Rainy</SelectItem>
                <SelectItem value="Foggy">Foggy</SelectItem>
                <SelectItem value="Snowy">Snowy</SelectItem>
                <SelectItem value="Night">Night</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Witnesses Toggle */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-secondary/50">
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-primary" />
              <div>
                <p className="font-medium">Witnesses</p>
                <p className="text-sm text-muted-foreground">Add witness information</p>
              </div>
            </div>
            <Switch checked={hasWitnesses} onCheckedChange={setHasWitnesses} />
          </div>

          {/* Witness 1 */}
          {hasWitnesses && (
            <div className="space-y-4 p-4 rounded-xl border">
              <h4 className="font-medium">Witness 1</h4>
              <div className="grid gap-3">
                <Input
                  placeholder="Full name"
                  value={witness1.name}
                  onChange={(e) => setWitness1({ ...witness1, name: e.target.value })}
                />
                <Input
                  placeholder="Phone number"
                  value={witness1.phone}
                  onChange={(e) => setWitness1({ ...witness1, phone: e.target.value })}
                />
                <Input
                  placeholder="Address"
                  value={witness1.address}
                  onChange={(e) => setWitness1({ ...witness1, address: e.target.value })}
                />
                <Textarea
                  placeholder="Witness statement..."
                  value={witness1.statement}
                  onChange={(e) => setWitness1({ ...witness1, statement: e.target.value })}
                  rows={2}
                />
              </div>

              {/* Witness 2 */}
              <h4 className="font-medium mt-4">Witness 2 (Optional)</h4>
              <div className="grid gap-3">
                <Input
                  placeholder="Full name"
                  value={witness2.name}
                  onChange={(e) => setWitness2({ ...witness2, name: e.target.value })}
                />
                <Input
                  placeholder="Phone number"
                  value={witness2.phone}
                  onChange={(e) => setWitness2({ ...witness2, phone: e.target.value })}
                />
                <Input
                  placeholder="Address"
                  value={witness2.address}
                  onChange={(e) => setWitness2({ ...witness2, address: e.target.value })}
                />
                <Textarea
                  placeholder="Witness statement..."
                  value={witness2.statement}
                  onChange={(e) => setWitness2({ ...witness2, statement: e.target.value })}
                  rows={2}
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3 pt-4">
          <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button className="flex-1" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

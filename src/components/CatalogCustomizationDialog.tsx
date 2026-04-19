import { useState, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Palette, Upload, Trash2, Loader2, Image as ImageIcon } from "lucide-react";

interface CatalogCustomizationDialogProps {
  categories: string[];
  brands: { id: string; name: string; logo_url?: string | null }[];
}

interface Customization {
  id: string;
  type: string;
  reference_name: string;
  logo_url: string | null;
  cover_image_url: string | null;
}

export function CatalogCustomizationDialog({ categories, brands }: CatalogCustomizationDialogProps) {
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: customizations = [] } = useQuery({
    queryKey: ["catalog_customizations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("catalog_customizations")
        .select("*")
        .order("type", { ascending: true });
      if (error) throw error;
      return data as Customization[];
    },
  });

  const getCustomization = (type: string, name: string) =>
    customizations.find((c) => c.type === type && c.reference_name === name);

  const uploadImage = async (file: File, folder: string): Promise<string> => {
    const ext = file.name.split(".").pop();
    const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage.from("product-images").upload(fileName, file);
    if (error) throw error;
    const { data } = supabase.storage.from("product-images").getPublicUrl(fileName);
    return data.publicUrl;
  };

  const handleUpload = async (type: "category" | "brand", name: string, field: "logo_url" | "cover_image_url", file: File) => {
    const key = `${type}-${name}-${field}`;
    setUploading(key);
    try {
      const url = await uploadImage(file, `catalog-custom`);
      const existing = getCustomization(type, name);
      if (existing) {
        const updateData: Record<string, string> = { updated_at: new Date().toISOString() };
        updateData[field] = url;
        const { error } = await supabase
          .from("catalog_customizations")
          .update(updateData as any)
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const insertData: any = { type, reference_name: name };
        insertData[field] = url;
        const { error } = await supabase
          .from("catalog_customizations")
          .insert(insertData);
        if (error) throw error;
      }
      queryClient.invalidateQueries({ queryKey: ["catalog_customizations"] });
      toast.success("Imagem atualizada!");
    } catch (e: any) {
      toast.error(e.message || "Erro ao carregar imagem");
    } finally {
      setUploading(null);
    }
  };

  const handleRemove = async (type: string, name: string, field: "logo_url" | "cover_image_url") => {
    const existing = getCustomization(type, name);
    if (!existing) return;
    try {
      const updateData: Record<string, string | null> = { updated_at: new Date().toISOString() };
      updateData[field] = null;
      const { error } = await supabase
        .from("catalog_customizations")
        .update(updateData as any)
        .eq("id", existing.id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["catalog_customizations"] });
      toast.success("Imagem removida!");
    } catch (e: any) {
      toast.error(e.message || "Erro ao remover");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Palette className="h-4 w-4" />
          Personalizar
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl">Personalizar Catálogos</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="categories" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="categories">Categorias</TabsTrigger>
            <TabsTrigger value="brands">Marcas</TabsTrigger>
            <TabsTrigger value="special">Privados</TabsTrigger>
          </TabsList>

          <TabsContent value="categories" className="space-y-4">
            {categories.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Nenhuma categoria disponível.</p>}
            {categories.map((cat) => (
              <CustomizationRow
                key={`cat-${cat}`}
                label={cat}
                type="category"
                name={cat}
                customization={getCustomization("category", cat)}
                uploading={uploading}
                onUpload={handleUpload}
                onRemove={handleRemove}
              />
            ))}
          </TabsContent>

          <TabsContent value="brands" className="space-y-4">
            {brands.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Nenhuma marca disponível.</p>}
            {brands.map((b) => (
              <CustomizationRow
                key={`brand-${b.id}`}
                label={b.name}
                type="brand"
                name={b.name}
                customization={getCustomization("brand", b.name)}
                uploading={uploading}
                onUpload={handleUpload}
                onRemove={handleRemove}
              />
            ))}
          </TabsContent>

          <TabsContent value="special" className="space-y-4">
            <p className="text-xs text-muted-foreground">Personaliza o logo e capa dos catálogos privados.</p>
            <CustomizationRow
              label="Destaques"
              type="category"
              name="Destaques"
              customization={getCustomization("category", "Destaques")}
              uploading={uploading}
              onUpload={handleUpload}
              onRemove={handleRemove}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function CustomizationRow({
  label,
  type,
  name,
  customization,
  uploading,
  onUpload,
  onRemove,
}: {
  label: string;
  type: "category" | "brand";
  name: string;
  customization?: Customization;
  uploading: string | null;
  onUpload: (type: "category" | "brand", name: string, field: "logo_url" | "cover_image_url", file: File) => void;
  onRemove: (type: string, name: string, field: "logo_url" | "cover_image_url") => void;
}) {
  const logoRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);

  const logoKey = `${type}-${name}-logo_url`;
  const coverKey = `${type}-${name}-cover_image_url`;

  return (
    <div className="rounded-lg border border-border bg-secondary/30 p-3">
      <h4 className="font-semibold text-sm text-foreground mb-3">{label}</h4>
      <div className="grid grid-cols-2 gap-3">
        {/* Logo */}
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground font-medium">Logo do Catálogo</p>
          {customization?.logo_url ? (
            <div className="relative group">
              <div className="w-full h-20 rounded-md border border-border bg-background flex items-center justify-center p-2">
                <img src={customization.logo_url} alt="Logo" className="max-h-full max-w-full object-contain" />
              </div>
              <div className="absolute inset-0 bg-black/50 rounded-md opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                <Button size="icon" variant="ghost" className="h-7 w-7 text-white hover:text-white" onClick={() => logoRef.current?.click()}>
                  <Upload className="h-3 w-3" />
                </Button>
                <Button size="icon" variant="ghost" className="h-7 w-7 text-white hover:text-destructive" onClick={() => onRemove(type, name, "logo_url")}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => logoRef.current?.click()}
              className="w-full h-20 rounded-md border border-dashed border-border bg-background hover:bg-secondary/50 transition-colors flex flex-col items-center justify-center gap-1 text-muted-foreground"
              disabled={uploading === logoKey}
            >
              {uploading === logoKey ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              <span className="text-[10px]">Carregar logo</span>
            </button>
          )}
          <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(type, name, "logo_url", f); e.target.value = ""; }} />
        </div>

        {/* Cover Image */}
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground font-medium">Imagem de Capa</p>
          {customization?.cover_image_url ? (
            <div className="relative group">
              <div className="w-full h-20 rounded-md border border-border overflow-hidden">
                <img src={customization.cover_image_url} alt="Capa" className="w-full h-full object-cover" />
              </div>
              <div className="absolute inset-0 bg-black/50 rounded-md opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                <Button size="icon" variant="ghost" className="h-7 w-7 text-white hover:text-white" onClick={() => coverRef.current?.click()}>
                  <Upload className="h-3 w-3" />
                </Button>
                <Button size="icon" variant="ghost" className="h-7 w-7 text-white hover:text-destructive" onClick={() => onRemove(type, name, "cover_image_url")}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => coverRef.current?.click()}
              className="w-full h-20 rounded-md border border-dashed border-border bg-background hover:bg-secondary/50 transition-colors flex flex-col items-center justify-center gap-1 text-muted-foreground"
              disabled={uploading === coverKey}
            >
              {uploading === coverKey ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
              <span className="text-[10px]">Carregar capa</span>
            </button>
          )}
          <input ref={coverRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(type, name, "cover_image_url", f); e.target.value = ""; }} />
        </div>
      </div>
    </div>
  );
}

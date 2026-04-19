import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, Save, Trash2, Wand2 } from "lucide-react";
import { ImageSlotPicker, type ImageSlot } from "@/components/ImageSlotPicker";

interface EditProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: {
    id: string;
    name: string;
    description: string | null;
    category: string | null;
    price: number | null;
    image_url: string | null;
    family_id: string | null;
    brand_id: string | null;
  };
  families: { id: string; name: string; category: string }[];
  categories: string[];
  brands: { id: string; name: string }[];
}

export function EditProductDialog({ open, onOpenChange, product, families, categories, brands }: EditProductDialogProps) {
  const [name, setName] = useState(product.name);
  const [description, setDescription] = useState(product.description || "");
  const [category, setCategory] = useState(product.category || "");
  const [familyId, setFamilyId] = useState(product.family_id || "none");
  const [brandId, setBrandId] = useState(product.brand_id || "none");
  const [price, setPrice] = useState(product.price?.toString() || "");
  const [loading, setLoading] = useState(false);
  const [generatingDesc, setGeneratingDesc] = useState(false);
  const [imageSlots, setImageSlots] = useState<ImageSlot[]>([]);
  const [initialImagesLoaded, setInitialImagesLoaded] = useState(false);
  const queryClient = useQueryClient();

  const filteredFamilies = families.filter((f) => !category || f.category === category);

  useEffect(() => {
    if (open && !initialImagesLoaded) {
      const loadImages = async () => {
        const { data: images } = await supabase
          .from("product_images")
          .select("*")
          .eq("product_id", product.id)
          .order("position");

        if (images && images.length > 0) {
          setImageSlots(
            images.map((img) => ({
              url: img.image_url,
              locked: true,
              source: "search" as const,
            })),
          );
        } else if (product.image_url) {
          setImageSlots([{ url: product.image_url, locked: true, source: "search" }]);
        }
        setInitialImagesLoaded(true);
      };
      loadImages();
    }
    if (!open) {
      setInitialImagesLoaded(false);
    }
  }, [open, product.id, product.image_url, initialImagesLoaded]);

  const handleGenerateDescription = async () => {
    if (!name.trim()) {
      toast.error("Preencha o nome do produto primeiro");
      return;
    }
    setGeneratingDesc(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-description", {
        body: { productName: name.trim(), category: category || null },
      });
      if (error) throw error;
      if (data?.description) {
        setDescription(data.description);
        toast.success("Descrição gerada!");
      }
    } catch {
      toast.error("Erro ao gerar descrição");
    } finally {
      setGeneratingDesc(false);
    }
  };

  const saveSlotImage = async (productId: string, slot: ImageSlot, position: number): Promise<string | null> => {
    if (slot.source === "upload" && slot.file) {
      const ext = slot.file.name.split(".").pop() || "png";
      const fileName = `${productId}_upload_${position}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(fileName, slot.file, { contentType: slot.file.type, upsert: true });
      if (uploadError) {
        console.error("Upload error:", uploadError);
        return null;
      }
      const { data: publicUrlData } = supabase.storage.from("product-images").getPublicUrl(fileName);
      await supabase.from("product_images").insert({ product_id: productId, image_url: publicUrlData.publicUrl, position });
      return publicUrlData.publicUrl;
    }

    const imageUrl = slot.url;
    if (imageUrl && imageUrl.startsWith("http")) {
      await supabase.from("product_images").insert({ product_id: productId, image_url: imageUrl, position });
      return imageUrl;
    }
    return null;
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase
        .from("products")
        .update({
          name: name.trim(),
          description: description.trim() || null,
          category: category || null,
          price: price ? parseFloat(price) : null,
          family_id: familyId === "none" ? null : familyId,
          brand_id: brandId === "none" ? null : brandId,
        })
        .eq("id", product.id);
      if (error) throw error;

      await supabase.from("product_images").delete().eq("product_id", product.id);

      const savedUrls: string[] = [];
      for (let i = 0; i < imageSlots.length; i++) {
        const url = await saveSlotImage(product.id, imageSlots[i], i);
        if (url) savedUrls.push(url);
      }

      await supabase
        .from("products")
        .update({
          image_url: savedUrls.length > 0 ? savedUrls[0] : null,
        })
        .eq("id", product.id);

      toast.success("Produto atualizado!");
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["product_images"] });
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message || "Erro ao atualizar");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Tem certeza que deseja excluir este produto?")) return;
    setLoading(true);
    try {
      const { error } = await supabase.from("products").delete().eq("id", product.id);
      if (error) throw error;
      toast.success("Produto excluído!");
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["product_images"] });
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message || "Erro ao excluir");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl">Editar Produto</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="edit-name">Nome *</Label>
            <Input id="edit-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="edit-desc">Descrição</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleGenerateDescription}
                disabled={generatingDesc || !name.trim()}
                className="h-7 gap-1 text-xs text-primary"
              >
                {generatingDesc ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wand2 className="h-3 w-3" />}
                Gerar com IA
              </Button>
            </div>
            <Textarea id="edit-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select
                value={category}
                onValueChange={(v) => {
                  setCategory(v);
                  setFamilyId("none");
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-price">Preço (€)</Label>
              <Input id="edit-price" type="number" step="0.01" min="0" value={price} onChange={(e) => setPrice(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Família</Label>
              <Select value={familyId} onValueChange={setFamilyId}>
                <SelectTrigger>
                  <SelectValue placeholder="Sem família" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem família</SelectItem>
                  {filteredFamilies.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Marca</Label>
              <Select value={brandId} onValueChange={setBrandId}>
                <SelectTrigger>
                  <SelectValue placeholder="Sem marca" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem marca</SelectItem>
                  {brands.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <ImageSlotPicker slots={imageSlots} onSlotsChange={setImageSlots} productName={name} disabled={loading} />

          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={loading || generatingDesc} className="flex-1 gap-2">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Salvar
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={loading} size="icon">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

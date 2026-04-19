import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Wand2, Loader2, Sparkles } from "lucide-react";
import { ImageSlotPicker, type ImageSlot } from "@/components/ImageSlotPicker";

interface AddProductDialogProps {
  families: { id: string; name: string; category: string }[];
  categories: string[];
  brands: { id: string; name: string }[];
}

export function AddProductDialog({ families, categories, brands }: AddProductDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [familyId, setFamilyId] = useState("none");
  const [brandId, setBrandId] = useState("none");
  const [price, setPrice] = useState("");
  const [loading, setLoading] = useState(false);
  const [generatingDesc, setGeneratingDesc] = useState(false);
  const [imageSlots, setImageSlots] = useState<ImageSlot[]>([]);
  const queryClient = useQueryClient();

  const filteredFamilies = families.filter((f) => !category || f.category === category);

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
      const imageUrl = publicUrlData.publicUrl;
      await supabase.from("product_images").insert({ product_id: productId, image_url: imageUrl, position });
      return imageUrl;
    }

    const imageUrl = slot.url;
    if (imageUrl && imageUrl.startsWith("http")) {
      await supabase.from("product_images").insert({ product_id: productId, image_url: imageUrl, position });
      return imageUrl;
    }

    return null;
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error("Nome do produto é obrigatório");
      return;
    }

    setLoading(true);
    const productName = name.trim();

    try {
      const { data: product, error } = await supabase
        .from("products")
        .insert({
          name: productName,
          description: description.trim() || null,
          category: category || null,
          price: price ? parseFloat(price) : null,
          family_id: familyId === "none" ? null : familyId,
          brand_id: brandId === "none" ? null : brandId,
        })
        .select()
        .single();

      if (error) throw error;

      const allSlots = imageSlots;

      if (allSlots.length > 0) {
        toast.info("A guardar imagens...");
        const savedUrls: string[] = [];
        for (let i = 0; i < allSlots.length; i++) {
          const url = await saveSlotImage(product.id, allSlots[i], i);
          if (url) savedUrls.push(url);
        }
        if (savedUrls.length > 0) {
          await supabase.from("products").update({ image_url: savedUrls[0] }).eq("id", product.id);
        }
      }

      toast.success("Produto guardado!");
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["product_images"] });
      setOpen(false);
      resetForm();
    } catch (e: any) {
      toast.error(e.message || "Erro ao adicionar produto");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setName("");
    setDescription("");
    setCategory("");
    setPrice("");
    setFamilyId("none");
    setBrandId("none");
    setImageSlots([]);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Novo Produto
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl">Adicionar Produto</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="name">Nome do Produto *</Label>
            <div className="relative">
              <Input id="name" placeholder="Ex: iPhone 15 Pro Max" value={name} onChange={(e) => setName(e.target.value)} />
              <Sparkles className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="description">Descrição</Label>
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
            <Textarea id="description" placeholder="Descreva o produto ou use a IA..." value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select value={category} onValueChange={(v) => { setCategory(v); setFamilyId("none"); }}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="price">Preço (€)</Label>
              <Input id="price" type="number" step="0.01" min="0" placeholder="0,00" value={price} onChange={(e) => setPrice(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Família</Label>
              <Select value={familyId} onValueChange={setFamilyId}>
                <SelectTrigger><SelectValue placeholder="Sem família" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem família</SelectItem>
                  {filteredFamilies.map((f) => (
                    <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Marca</Label>
              <Select value={brandId} onValueChange={setBrandId}>
                <SelectTrigger><SelectValue placeholder="Sem marca" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem marca</SelectItem>
                  {brands.map((b) => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <ImageSlotPicker
            slots={imageSlots}
            onSlotsChange={setImageSlots}
            productName={name}
            disabled={loading}
          />

          <Button onClick={handleSubmit} disabled={loading} className="w-full gap-2">
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                A guardar...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Adicionar Produto
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { FileSpreadsheet, Loader2, CheckCircle2, XCircle, Clock, Upload } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import * as XLSX from "xlsx";

interface ImportRow {
  nome: string;
  descricao?: string;
  categoria?: string;
  familia?: string;
  marca?: string;
  preco?: number;
}

interface ImportStatus {
  row: ImportRow;
  status: "pending" | "creating" | "description" | "images" | "done" | "error";
  error?: string;
}

interface ImportProductsDialogProps {
  families: { id: string; name: string; category: string }[];
  categories: string[];
  brands?: { id: string; name: string }[];
}

const stripHtml = (html: string): string => {
  let text = html.replace(/<li[^>]*>/gi, "• ").replace(/<\/li>/gi, "\n");
  text = text.replace(/<br\s*\/?>/gi, "\n").replace(/<\/p>/gi, "\n").replace(/<[^>]+>/g, "");
  text = text.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ")
    .replace(/Â®/g, "®").replace(/Ã©/g, "é").replace(/Ã¡/g, "á").replace(/Ã£/g, "ã")
    .replace(/Ã§/g, "ç").replace(/Ã³/g, "ó").replace(/Ãº/g, "ú").replace(/Ã­/g, "í")
    .replace(/Ã¢/g, "â").replace(/Ãª/g, "ê").replace(/Ã´/g, "ô").replace(/Ã /g, "à")
    .replace(/Ã¼/g, "ü").replace(/Ã±/g, "ñ").replace(/Ð/g, "D");
  text = text.replace(/\n{3,}/g, "\n\n").replace(/[ \t]+/g, " ").trim();
  return text;
};

export function ImportProductsDialog({ families: initialFamilies, categories, brands: initialBrands = [] }: ImportProductsDialogProps) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<ImportStatus[]>([]);
  const [importing, setImporting] = useState(false);
  const [done, setDone] = useState(false);
  const [localFamilies, setLocalFamilies] = useState(initialFamilies);
  const [localBrands, setLocalBrands] = useState(initialBrands);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const normalizeHeader = (value: string) =>
    value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

  const pickRandomImages = (images: string[], maxCount: number) => {
    const unique = Array.from(new Set(images.filter(Boolean)));
    for (let i = unique.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [unique[i], unique[j]] = [unique[j], unique[i]];
    }
    return unique.slice(0, maxCount);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const wb = XLSX.read(evt.target?.result, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(ws);

        if (jsonData.length === 0) {
          toast.error("Ficheiro vazio ou sem dados válidos");
          return;
        }

        const parsed: ImportRow[] = jsonData
          .map((row) => {
            const keys = Object.keys(row);
            const keyMap = keys.map((key) => ({ key, normalized: normalizeHeader(key) }));
            const find = (terms: string[]) => {
              const normalizedTerms = terms.map(normalizeHeader);
              const match = keyMap.find(({ normalized }) =>
                normalizedTerms.some((term) => normalized.includes(term))
              );
              return match ? row[match.key] : undefined;
            };

            const rawDesc = find(["descricao", "descrição", "description", "desc"]);
            let descricao: string | undefined;
            if (rawDesc != null && String(rawDesc).trim()) {
              const raw = String(rawDesc).trim();
              descricao = raw.includes("<") ? stripHtml(raw) : raw;
            }

            return {
              nome: String(find(["nome", "name", "produto", "product", "artigo", "designacao"]) || "").trim(),
              descricao,
              categoria: String(find(["categ", "categoria", "category", "departamento", "setor"]) || "").trim() || undefined,
              familia: String(find(["famil", "familia", "family", "subcategoria", "sub-categoria", "linha"]) || "").trim() || undefined,
              marca: String(find(["marca", "brand", "fabricante", "manufacturer"]) || "").trim() || undefined,
              preco: (() => {
                const v = find(["prec", "preco", "preco", "price", "valor", "pvp"]);
                if (v == null) return undefined;
                const cleaned = String(v).replace(/[^\d,.-]/g, "").replace(",", ".");
                const n = parseFloat(cleaned);
                return isNaN(n) ? undefined : n;
              })(),
            };
          })
          .filter((r) => r.nome.length > 0);

        if (parsed.length === 0) {
          toast.error("Nenhum produto válido encontrado. Verifique que tem uma coluna 'Nome'.");
          return;
        }

        setRows(parsed.map((row) => ({ row, status: "pending" })));
        setDone(false);
        setLocalFamilies(initialFamilies);
        setLocalBrands(initialBrands);
        toast.success(`${parsed.length} produto(s) encontrado(s) no ficheiro`);
      } catch {
        toast.error("Erro ao ler o ficheiro Excel");
      }
    };
    reader.readAsArrayBuffer(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const findOrCreateFamily = async (familyName?: string, categoryName?: string): Promise<string | null> => {
    if (!familyName) return null;
    const normalizedFamily = familyName.trim().toLowerCase();
    const normalizedCategory = (categoryName || "").trim().toLowerCase();
    const existing = localFamilies.find(
      (f) => f.name.trim().toLowerCase() === normalizedFamily &&
        (!normalizedCategory || f.category.trim().toLowerCase() === normalizedCategory)
    );
    if (existing) return existing.id;
    const cat = categoryName?.trim() || "Outros";
    try {
      const { data, error } = await supabase.from("product_families").insert({ name: familyName.trim(), category: cat }).select().single();
      if (error) { console.error("Error creating family:", error); return null; }
      const newFamily = { id: data.id, name: data.name, category: data.category };
      setLocalFamilies((prev) => [...prev, newFamily]);
      return data.id;
    } catch (e) { console.error("Error creating family:", e); return null; }
  };

  const findOrCreateBrand = async (brandName?: string): Promise<string | null> => {
    if (!brandName) return null;
    const normalized = brandName.trim().toLowerCase();
    const existing = localBrands.find((b) => b.name.trim().toLowerCase() === normalized);
    if (existing) return existing.id;
    try {
      const { data, error } = await supabase.from("brands").insert({ name: brandName.trim() }).select().single();
      if (error) { console.error("Error creating brand:", error); return null; }
      const newBrand = { id: data.id, name: data.name };
      setLocalBrands((prev) => [...prev, newBrand]);
      return data.id;
    } catch (e) { console.error("Error creating brand:", e); return null; }
  };

  const findOrCreateCategory = async (categoryName?: string): Promise<void> => {
    if (!categoryName) return;
    const normalized = categoryName.trim().toLowerCase();
    try {
      const { data: existing } = await supabase.from("categories").select("id").ilike("name", normalized).maybeSingle();
      if (!existing) {
        await supabase.from("categories").insert({ name: categoryName.trim() });
      }
    } catch (e) { console.error("Error creating category:", e); }
  };

  const searchAndSaveImages = async (productName: string, productId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("search-product-images", {
        body: { query: productName, count: 24 },
      });
      if (error) throw error;
      const images: string[] = Array.isArray(data?.images) ? data.images : [];
      const safeExternal = images.filter((url) => {
        const lower = String(url || "").toLowerCase();
        return lower.startsWith("http") && !lower.includes("supabase.co") && !lower.includes("lovable.app") && !lower.includes("lovableproject.com") && !lower.includes("/product-images/");
      });
      const selected = pickRandomImages(safeExternal, 3);
      if (selected.length === 0) return;
      for (let i = 0; i < selected.length; i++) {
        await supabase.from("product_images").insert({ product_id: productId, image_url: selected[i], position: i });
      }
      await supabase.from("products").update({ image_url: selected[0] }).eq("id", productId);
    } catch (e) { console.error("Image search failed for:", productName, e); }
  };

  const handleImport = async () => {
    setImporting(true);

    for (let i = 0; i < rows.length; i++) {
      const { row } = rows[i];
      setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, status: "creating" } : r)));

      try {
        const familyId = await findOrCreateFamily(row.familia, row.categoria);
        const brandId = await findOrCreateBrand(row.marca);
        await findOrCreateCategory(row.categoria);

        const { data: product, error } = await supabase
          .from("products")
          .insert({
            name: row.nome,
            description: row.descricao || null,
            category: row.categoria || null,
            price: row.preco ?? null,
            family_id: familyId,
            brand_id: brandId,
          })
          .select()
          .single();
        if (error) throw error;

        // Generate description via AI only if not provided
        if (!row.descricao) {
          setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, status: "description" } : r)));
          try {
            const { data: descData } = await supabase.functions.invoke("generate-description", {
              body: { productName: row.nome, category: row.categoria || null },
            });
            if (descData?.description) {
              await supabase.from("products").update({ description: descData.description }).eq("id", product.id);
            }
          } catch (e) { console.error("Description generation failed for:", row.nome, e); }
        }

        setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, status: "images" } : r)));
        await searchAndSaveImages(row.nome, product.id);
        setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, status: "done" } : r)));
      } catch (e: any) {
        console.error("Import error for:", row.nome, e);
        setRows((prev) => prev.map((r, idx) => idx === i ? { ...r, status: "error", error: e.message || "Erro desconhecido" } : r));
      }
    }

    setImporting(false);
    setDone(true);
    queryClient.invalidateQueries({ queryKey: ["products"] });
    queryClient.invalidateQueries({ queryKey: ["product_images"] });
    queryClient.invalidateQueries({ queryKey: ["families"] });
    queryClient.invalidateQueries({ queryKey: ["brands"] });
    queryClient.invalidateQueries({ queryKey: ["categories"] });
    toast.success("Importação concluída!");
  };

  const completedCount = rows.filter((r) => r.status === "done").length;
  const errorCount = rows.filter((r) => r.status === "error").length;
  const progress = rows.length > 0 ? ((completedCount + errorCount) / rows.length) * 100 : 0;

  const statusIcon = (status: ImportStatus["status"]) => {
    switch (status) {
      case "pending": return <Clock className="h-4 w-4 text-muted-foreground" />;
      case "creating": return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
      case "description": return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case "images": return <Loader2 className="h-4 w-4 animate-spin text-amber-500" />;
      case "done": return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "error": return <XCircle className="h-4 w-4 text-destructive" />;
    }
  };

  const statusLabel = (status: ImportStatus["status"]) => {
    switch (status) {
      case "pending": return "Em espera";
      case "creating": return "A criar...";
      case "description": return "A gerar descrição...";
      case "images": return "A pesquisar imagens...";
      case "done": return "Concluído";
      case "error": return "Erro";
    }
  };

  const handleClose = (isOpen: boolean) => {
    if (!importing) {
      setOpen(isOpen);
      if (!isOpen) { setRows([]); setDone(false); }
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <FileSpreadsheet className="h-4 w-4" />
          Importar Excel
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl">Importar Produtos via Excel</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          {rows.length === 0 && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Carregue um ficheiro Excel (.xlsx, .xls) com as seguintes colunas:
              </p>
              <div className="bg-secondary rounded-lg p-3 text-sm space-y-1">
                <p><strong>Nome</strong> — nome do produto (obrigatório)</p>
                <p><strong>Descrição</strong> — descrição do produto (se vazio, gera por IA)</p>
                <p><strong>Categoria</strong> — categoria (criada automaticamente se não existir)</p>
                <p><strong>Família</strong> — família do produto (criada automaticamente)</p>
                <p><strong>Marca</strong> — marca do produto (criada automaticamente)</p>
                <p><strong>Preço</strong> — preço em euros</p>
              </div>
              <p className="text-xs text-muted-foreground">
                Descrições em HTML são automaticamente limpas. Categorias, famílias e marcas são criadas se não existirem.
              </p>

              <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFileSelect} className="hidden" />
              <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="w-full gap-2">
                <Upload className="h-4 w-4" />
                Selecionar ficheiro Excel
              </Button>
            </div>
          )}

          {rows.length > 0 && (
            <>
              {importing && (
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Progresso</span>
                    <span className="font-medium">{completedCount + errorCount}/{rows.length}</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>
              )}

              <div className="flex-1 overflow-y-auto border rounded-lg divide-y divide-border">
                {rows.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3 px-3 py-2 text-sm">
                    {statusIcon(item.status)}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{item.row.nome}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {[item.row.categoria, item.row.familia, item.row.marca, item.row.preco != null ? `${item.row.preco}€` : null]
                          .filter(Boolean)
                          .join(" · ") || "Sem detalhes adicionais"}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {statusLabel(item.status)}
                    </span>
                  </div>
                ))}
              </div>

              {!importing && !done && (
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setRows([])} className="flex-1">Cancelar</Button>
                  <Button onClick={handleImport} className="flex-1 gap-2">
                    <FileSpreadsheet className="h-4 w-4" />
                    Importar {rows.length} produto(s)
                  </Button>
                </div>
              )}

              {done && (
                <div className="text-center space-y-2">
                  <p className="text-sm font-medium text-green-600">
                    ✅ {completedCount} importado(s){errorCount > 0 ? `, ${errorCount} com erro` : ""}
                  </p>
                  <Button variant="outline" onClick={() => handleClose(false)}>Fechar</Button>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

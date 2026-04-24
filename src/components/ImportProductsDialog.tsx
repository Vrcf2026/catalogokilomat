import { useState, useRef, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  FileSpreadsheet, Loader2, CheckCircle2, XCircle, Clock, Upload,
  AlertTriangle, RefreshCcw, Sparkles, Trash2, Image as ImageIcon,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import * as XLSX from "xlsx";
import { FixedSizeList as VirtualList } from "react-window";

interface ImportRow {
  sku?: string;
  nome: string;
  descricao?: string;
  categoria?: string;
  familia?: string;
  marca?: string;
  preco?: number;
}

type RowStatus =
  | "pending"
  | "creating"      // novo produto a ser criado
  | "updating"      // SKU já existe → só atualizar preço
  | "restoring"     // SKU novo mas com imagens órfãs a recuperar
  | "description"
  | "images"
  | "done"
  | "error";

type SyncAction = "create" | "update" | "skip";

interface ImportStatus {
  row: ImportRow;
  status: RowStatus;
  action?: SyncAction;
  productId?: string;
  error?: string;
  restoredImages?: number;
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

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Tunable batch sizes
const PRODUCT_INSERT_BATCH = 500;       // Supabase handles batch inserts well
const ENRICH_CHUNK_SIZE = 25;            // parallel image/desc fetches per chunk
const ENRICH_CHUNK_PAUSE_MS = 1500;      // pause between chunks (rate-limit friendly)
const UI_UPDATE_THROTTLE = 50;           // re-render every N rows during enrichment

export function ImportProductsDialog({ families: initialFamilies, categories, brands: initialBrands = [] }: ImportProductsDialogProps) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<ImportStatus[]>([]);
  const [importing, setImporting] = useState(false);
  const [done, setDone] = useState(false);
  const [phase, setPhase] = useState<string>("");
  const [localFamilies, setLocalFamilies] = useState(initialFamilies);
  const [localBrands, setLocalBrands] = useState(initialBrands);
  const [searchImages, setSearchImages] = useState(false);
  const [generateDescriptions, setGenerateDescriptions] = useState(false); // OFF by default for big imports
  const [syncMode, setSyncMode] = useState(true); // sincronização (apaga produtos que sumiram do Excel)

  // Plano da sincronização (calculado antes de importar)
  const [plan, setPlan] = useState<{
    toCreate: ImportRow[];
    toUpdate: { row: ImportRow; existingId: string }[];
    toDelete: { id: string; name: string; sku: string }[];
    deletePercent: number;
    confirmedDelete: boolean;
  } | null>(null);
  const [counts, setCounts] = useState({ created: 0, updated: 0, deleted: 0, restored: 0 });

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

            const rawSku = find(["codigo", "código", "code", "sku", "referencia", "referência", "ref", "artigo"]);
            const sku = rawSku != null ? String(rawSku).trim() : "";

            return {
              sku: sku || undefined,
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

  // ---------- Pre-creation: ensure all categories/families/brands exist ----------
  const ensureTaxonomies = async (rowsData: ImportRow[]) => {
    const catSet = new Set<string>();
    const brandSet = new Set<string>();
    const famKey = (name: string, cat: string) => `${name.toLowerCase()}::${cat.toLowerCase()}`;
    const famMap = new Map<string, { name: string; category: string }>();

    for (const r of rowsData) {
      if (r.categoria) catSet.add(r.categoria.trim());
      if (r.marca) brandSet.add(r.marca.trim());
      if (r.familia) {
        const cat = (r.categoria || "Outros").trim();
        famMap.set(famKey(r.familia.trim(), cat), { name: r.familia.trim(), category: cat });
      }
    }

    // Categories
    const { data: existingCats } = await supabase.from("categories").select("name");
    const existingCatNames = new Set((existingCats || []).map((c) => c.name.toLowerCase()));
    const newCats = [...catSet].filter((c) => !existingCatNames.has(c.toLowerCase()));
    if (newCats.length > 0) {
      await supabase.from("categories").insert(newCats.map((name) => ({ name })));
    }

    // Brands
    const { data: existingBrandsData } = await supabase.from("brands").select("id, name");
    const brandByName = new Map<string, string>();
    (existingBrandsData || []).forEach((b) => brandByName.set(b.name.toLowerCase(), b.id));
    const newBrands = [...brandSet].filter((b) => !brandByName.has(b.toLowerCase()));
    if (newBrands.length > 0) {
      const { data: insertedBrands } = await supabase
        .from("brands")
        .insert(newBrands.map((name) => ({ name })))
        .select("id, name");
      (insertedBrands || []).forEach((b) => brandByName.set(b.name.toLowerCase(), b.id));
    }

    // Families
    const { data: existingFams } = await supabase.from("product_families").select("id, name, category");
    const famByKey = new Map<string, string>();
    (existingFams || []).forEach((f) => famByKey.set(famKey(f.name, f.category), f.id));
    const newFams = [...famMap.values()].filter((f) => !famByKey.has(famKey(f.name, f.category)));
    if (newFams.length > 0) {
      const { data: insertedFams } = await supabase
        .from("product_families")
        .insert(newFams.map((f) => ({ name: f.name, category: f.category })))
        .select("id, name, category");
      (insertedFams || []).forEach((f) => famByKey.set(famKey(f.name, f.category), f.id));
    }

    return { brandByName, famByKey };
  };

  // ---------- Image search for a single product ----------
  const searchAndSaveImages = async (productName: string, productId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("search-product-images", {
        body: { query: productName, count: 12 },
      });
      if (error) throw error;
      const images: string[] = Array.isArray(data?.images) ? data.images : [];
      const safeExternal = images.filter((url) => {
        const lower = String(url || "").toLowerCase();
        return lower.startsWith("http") && !lower.includes("supabase.co") && !lower.includes("lovable.app") && !lower.includes("lovableproject.com") && !lower.includes("/product-images/");
      });
      const selected = pickRandomImages(safeExternal, 3);
      if (selected.length === 0) return false;
      const insertRows = selected.map((url, i) => ({ product_id: productId, image_url: url, position: i }));
      await supabase.from("product_images").insert(insertRows);
      await supabase.from("products").update({ image_url: selected[0] }).eq("id", productId);
      return true;
    } catch (e) {
      console.error("Image search failed for:", productName, e);
      return false;
    }
  };

  const generateDescriptionFor = async (productName: string, category: string | null, productId: string) => {
    try {
      const { data: descData } = await supabase.functions.invoke("generate-description", {
        body: { productName, category },
      });
      if (descData?.description) {
        await supabase.from("products").update({ description: descData.description }).eq("id", productId);
      }
    } catch (e) {
      console.error("Description generation failed for:", productName, e);
    }
  };

  // ---------- Calcular plano de sincronização ----------
  // Lê os produtos existentes na BD e classifica cada linha do Excel:
  // - SKU já existe → UPDATE (só preço)
  // - SKU novo / sem SKU → CREATE
  // - SKU na BD que não vem no Excel → DELETE (move para órfãs)
  const buildSyncPlan = async () => {
    setPhase("A analisar Excel vs base de dados...");
    const allRows = rows.map((r) => r.row);

    const { data: existing, error } = await supabase
      .from("products")
      .select("id, name, sku");
    if (error) throw error;

    const existingBySku = new Map<string, { id: string; name: string }>();
    (existing || []).forEach((p) => {
      if (p.sku) existingBySku.set(p.sku.trim().toLowerCase(), { id: p.id, name: p.name });
    });

    const seenSkus = new Set<string>();
    const toCreate: ImportRow[] = [];
    const toUpdate: { row: ImportRow; existingId: string }[] = [];

    for (const r of allRows) {
      const skuKey = r.sku ? r.sku.trim().toLowerCase() : "";
      if (skuKey && existingBySku.has(skuKey)) {
        seenSkus.add(skuKey);
        toUpdate.push({ row: r, existingId: existingBySku.get(skuKey)!.id });
      } else {
        if (skuKey) seenSkus.add(skuKey);
        toCreate.push(r);
      }
    }

    const toDelete = syncMode
      ? (existing || [])
          .filter((p) => p.sku && !seenSkus.has(p.sku.trim().toLowerCase()))
          .map((p) => ({ id: p.id, name: p.name, sku: p.sku as string }))
      : [];

    const totalExistingWithSku = (existing || []).filter((p) => !!p.sku).length;
    const deletePercent = totalExistingWithSku > 0 ? (toDelete.length / totalExistingWithSku) * 100 : 0;

    setPlan({ toCreate, toUpdate, toDelete, deletePercent, confirmedDelete: deletePercent < 10 });
    setPhase("");
  };

  // ---------- Mover produtos eliminados para tabela de imagens órfãs ----------
  const orphanProducts = async (toDelete: { id: string; sku: string }[]) => {
    if (toDelete.length === 0) return 0;
    let orphanedCount = 0;

    for (let i = 0; i < toDelete.length; i += 100) {
      const chunk = toDelete.slice(i, i + 100);
      const ids = chunk.map((p) => p.id);
      const skuById = new Map(chunk.map((p) => [p.id, p.sku]));

      // Carregar produtos completos + imagens
      const { data: fullProducts } = await supabase
        .from("products")
        .select("id, name, description, category, price, family_id, brand_id, featured, include_in_catalog")
        .in("id", ids);

      const { data: allImages } = await supabase
        .from("product_images")
        .select("product_id, image_url, position")
        .in("product_id", ids);

      const orphanRows: any[] = [];
      (fullProducts || []).forEach((p) => {
        const sku = skuById.get(p.id)!;
        const imgs = (allImages || []).filter((img) => img.product_id === p.id);
        if (imgs.length === 0) return; // sem imagens, não vale guardar nada
        imgs.forEach((img) => {
          orphanRows.push({
            sku,
            image_url: img.image_url,
            position: img.position,
            product_name: p.name,
            product_description: p.description,
            product_category: p.category,
            product_family_id: p.family_id,
            product_brand_id: p.brand_id,
            product_price: p.price,
            product_featured: p.featured,
            product_include_in_catalog: p.include_in_catalog,
          });
        });
      });

      if (orphanRows.length > 0) {
        await supabase.from("orphaned_product_images").insert(orphanRows);
        orphanedCount += orphanRows.length;
      }

      // Apagar produtos (cascade vai apagar product_images)
      await supabase.from("products").delete().in("id", ids);
      setPhase(`Eliminados ${Math.min(i + 100, toDelete.length)} / ${toDelete.length}`);
    }
    return orphanedCount;
  };

  // ---------- Restaurar imagens órfãs para SKUs novos ----------
  const restoreOrphanedImages = async (productId: string, sku: string): Promise<number> => {
    const skuKey = sku.trim();
    const { data: orphans } = await supabase
      .from("orphaned_product_images")
      .select("image_url, position")
      .eq("sku", skuKey)
      .order("position");

    if (!orphans || orphans.length === 0) return 0;

    await supabase
      .from("product_images")
      .insert(orphans.map((o) => ({ product_id: productId, image_url: o.image_url, position: o.position })));

    await supabase.from("products").update({ image_url: orphans[0].image_url }).eq("id", productId);

    // Limpar órfãs deste SKU
    await supabase.from("orphaned_product_images").delete().eq("sku", skuKey);
    return orphans.length;
  };

  // ---------- Executar a sincronização ----------
  const handleImport = async () => {
    if (!plan) return;
    setImporting(true);
    setCounts({ created: 0, updated: 0, deleted: 0, restored: 0 });

    try {
      // 1. Garantir taxonomias só para os "to create"
      setPhase("A preparar categorias, famílias e marcas...");
      const { brandByName, famByKey } = await ensureTaxonomies(plan.toCreate);
      const famKeyOf = (name: string, cat: string) => `${name.toLowerCase()}::${cat.toLowerCase()}`;

      // 2. UPDATE: atualizar APENAS o preço dos existentes
      if (plan.toUpdate.length > 0) {
        setPhase(`A atualizar preços de ${plan.toUpdate.length} produto(s) existente(s)...`);
        setRows((prev) =>
          prev.map((r) => {
            const found = plan.toUpdate.find((u) => u.row === r.row);
            return found ? { ...r, status: "updating" as RowStatus, action: "update", productId: found.existingId } : r;
          })
        );

        // Update em paralelo (chunks de 50)
        for (let i = 0; i < plan.toUpdate.length; i += 50) {
          const chunk = plan.toUpdate.slice(i, i + 50);
          await Promise.all(
            chunk.map(({ row, existingId }) =>
              supabase.from("products").update({ price: row.preco ?? null }).eq("id", existingId)
            )
          );
          setPhase(`Atualizados ${Math.min(i + 50, plan.toUpdate.length)} / ${plan.toUpdate.length}`);
        }

        setRows((prev) =>
          prev.map((r) => (r.action === "update" ? { ...r, status: "done" as RowStatus } : r))
        );
        setCounts((c) => ({ ...c, updated: plan.toUpdate.length }));
      }

      // 3. CREATE: criar novos produtos em batches
      const createdIdBySku = new Map<string, string>();
      const createdIds: string[] = [];
      const createdRowsOrder: ImportRow[] = [];

      if (plan.toCreate.length > 0) {
        setPhase(`A criar ${plan.toCreate.length} produto(s) novo(s)...`);
        setRows((prev) =>
          prev.map((r) => {
            const isNew = plan.toCreate.includes(r.row);
            return isNew ? { ...r, status: "creating" as RowStatus, action: "create" } : r;
          })
        );

        const payload = plan.toCreate.map((r) => ({
          name: r.nome,
          sku: r.sku || null,
          description: r.descricao || null,
          category: r.categoria || null,
          price: r.preco ?? null,
          family_id: r.familia ? famByKey.get(famKeyOf(r.familia, r.categoria || "Outros")) || null : null,
          brand_id: r.marca ? brandByName.get(r.marca.toLowerCase()) || null : null,
        }));

        for (let i = 0; i < payload.length; i += PRODUCT_INSERT_BATCH) {
          const slice = payload.slice(i, i + PRODUCT_INSERT_BATCH);
          const sliceRows = plan.toCreate.slice(i, i + PRODUCT_INSERT_BATCH);
          const { data, error } = await supabase.from("products").insert(slice).select("id, sku");
          if (error) throw error;
          (data || []).forEach((d, k) => {
            createdIds.push(d.id);
            createdRowsOrder.push(sliceRows[k]);
            if (d.sku) createdIdBySku.set(d.sku, d.id);
          });
          setPhase(`Criados ${Math.min(i + PRODUCT_INSERT_BATCH, payload.length)} / ${payload.length}`);
        }
        setCounts((c) => ({ ...c, created: createdIds.length }));

        // 4. RESTORE: tentar restaurar imagens órfãs para SKUs criados
        let restoredTotal = 0;
        for (let i = 0; i < createdIds.length; i += 50) {
          const chunk = createdIds.slice(i, i + 50).map((id, k) => ({ id, row: createdRowsOrder[i + k] }));
          await Promise.all(
            chunk.map(async ({ id, row }) => {
              if (!row.sku) return;
              const restored = await restoreOrphanedImages(id, row.sku);
              if (restored > 0) restoredTotal += 1;
            })
          );
        }
        setCounts((c) => ({ ...c, restored: restoredTotal }));

        // Mark created as done (enriquecimento abaixo se ativo)
        const willEnrich = searchImages || generateDescriptions;
        setRows((prev) =>
          prev.map((r, idx) => {
            if (r.action !== "create") return r;
            const createIdx = createdRowsOrder.indexOf(r.row);
            const productId = createIdx >= 0 ? createdIds[createIdx] : undefined;
            return { ...r, productId, status: willEnrich ? ("pending" as RowStatus) : ("done" as RowStatus) };
          })
        );

        // 5. ENRICH (opcional)
        if (willEnrich) {
          setPhase(`A enriquecer ${createdIds.length} novo(s) produto(s)...`);
          let updateBuffer: { idx: number; status: RowStatus }[] = [];
          const flushBuffer = () => {
            if (updateBuffer.length === 0) return;
            const updates = updateBuffer;
            updateBuffer = [];
            setRows((prev) => {
              const next = [...prev];
              for (const u of updates) {
                if (next[u.idx]) next[u.idx] = { ...next[u.idx], status: u.status };
              }
              return next;
            });
          };

          // Mapear createdRowsOrder para os índices originais em rows
          const enrichTargets = createdIds.map((id, k) => {
            const row = createdRowsOrder[k];
            const idx = rows.findIndex((r) => r.row === row);
            return { id, row, idx };
          });

          for (let i = 0; i < enrichTargets.length; i += ENRICH_CHUNK_SIZE) {
            const chunk = enrichTargets.slice(i, i + ENRICH_CHUNK_SIZE);
            await Promise.all(
              chunk.map(async ({ id, idx, row }) => {
                if (idx < 0) return;
                if (generateDescriptions && !row.descricao) {
                  updateBuffer.push({ idx, status: "description" });
                  await generateDescriptionFor(row.nome, row.categoria || null, id);
                }
                if (searchImages) {
                  updateBuffer.push({ idx, status: "images" });
                  await searchAndSaveImages(row.nome, id);
                }
                updateBuffer.push({ idx, status: "done" });
              })
            );
            if (updateBuffer.length >= UI_UPDATE_THROTTLE) flushBuffer();
            setPhase(`Enriquecidos ${Math.min(i + ENRICH_CHUNK_SIZE, enrichTargets.length)} / ${enrichTargets.length}`);
            if (i + ENRICH_CHUNK_SIZE < enrichTargets.length) await sleep(ENRICH_CHUNK_PAUSE_MS);
          }
          flushBuffer();
        }
      }

      // 6. DELETE: mover produtos eliminados para órfãs
      if (plan.toDelete.length > 0) {
        setPhase(`A arquivar ${plan.toDelete.length} produto(s) eliminado(s) (imagens guardadas 6 meses)...`);
        await orphanProducts(plan.toDelete);
        setCounts((c) => ({ ...c, deleted: plan.toDelete.length }));
      }

      setPhase("");
      setImporting(false);
      setDone(true);
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["product_images"] });
      queryClient.invalidateQueries({ queryKey: ["families"] });
      queryClient.invalidateQueries({ queryKey: ["brands"] });
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast.success("Sincronização concluída!");
    } catch (e: any) {
      console.error("Sync failed:", e);
      toast.error(`Erro na sincronização: ${e.message || "desconhecido"}`);
      setImporting(false);
      setDone(true);
    }
  };

  const completedCount = useMemo(() => rows.filter((r) => r.status === "done").length, [rows]);
  const errorCount = useMemo(() => rows.filter((r) => r.status === "error").length, [rows]);
  const progress = rows.length > 0 ? ((completedCount + errorCount) / rows.length) * 100 : 0;

  const statusIcon = (status: RowStatus) => {
    switch (status) {
      case "pending": return <Clock className="h-4 w-4 text-muted-foreground" />;
      case "creating": return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
      case "updating": return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case "restoring": return <Loader2 className="h-4 w-4 animate-spin text-purple-500" />;
      case "description": return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case "images": return <Loader2 className="h-4 w-4 animate-spin text-amber-500" />;
      case "done": return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "error": return <XCircle className="h-4 w-4 text-destructive" />;
    }
  };

  const statusLabel = (status: RowStatus) => {
    switch (status) {
      case "pending": return "Em espera";
      case "creating": return "A criar...";
      case "updating": return "A atualizar preço...";
      case "restoring": return "A restaurar imagens...";
      case "description": return "A gerar descrição...";
      case "images": return "A pesquisar imagens...";
      case "done": return "Concluído";
      case "error": return "Erro";
    }
  };

  const handleClose = (isOpen: boolean) => {
    if (!importing) {
      setOpen(isOpen);
      if (!isOpen) {
        setRows([]);
        setDone(false);
        setPhase("");
        setPlan(null);
        setCounts({ created: 0, updated: 0, deleted: 0, restored: 0 });
      }
    }
  };

  // Virtualized row renderer
  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    const item = rows[index];
    return (
      <div style={style} className="flex items-center gap-3 px-3 py-2 text-sm border-b border-border">
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
    );
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
                <p><strong>Descrição</strong> — descrição do produto</p>
                <p><strong>Categoria</strong> — categoria (criada automaticamente)</p>
                <p><strong>Família</strong> — família (criada automaticamente)</p>
                <p><strong>Marca</strong> — marca (criada automaticamente)</p>
                <p><strong>Preço</strong> — preço em euros</p>
              </div>
              <p className="text-xs text-muted-foreground">
                Suporta milhares de produtos. Para grandes importações, desligue IA/imagens e enriqueça depois.
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
              {!importing && !done && (
                <div className="space-y-2 rounded-lg border p-3">
                  <p className="text-sm font-medium">Opções de importação</p>
                  <div className="flex items-center gap-2">
                    <Checkbox id="opt-images" checked={searchImages} onCheckedChange={(v) => setSearchImages(!!v)} />
                    <Label htmlFor="opt-images" className="text-sm font-normal cursor-pointer">
                      Pesquisar imagens automaticamente (mais lento)
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox id="opt-desc" checked={generateDescriptions} onCheckedChange={(v) => setGenerateDescriptions(!!v)} />
                    <Label htmlFor="opt-desc" className="text-sm font-normal cursor-pointer">
                      Gerar descrições por IA (apenas vazias)
                    </Label>
                  </div>
                  {rows.length > 1000 && (searchImages || generateDescriptions) && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 pt-1">
                      ⚠️ {rows.length} produtos com enriquecimento ativo pode demorar várias horas. Recomendado: criar primeiro sem enriquecimento.
                    </p>
                  )}
                </div>
              )}

              {(importing || done) && (
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground truncate">{phase || "Progresso"}</span>
                    <span className="font-medium whitespace-nowrap ml-2">{completedCount + errorCount}/{rows.length}</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>
              )}

              <div className="flex-1 border rounded-lg overflow-hidden" style={{ minHeight: 200 }}>
                <VirtualList
                  height={300}
                  width="100%"
                  itemCount={rows.length}
                  itemSize={56}
                >
                  {Row}
                </VirtualList>
              </div>

              {!importing && !done && (
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setRows([])} className="flex-1">Cancelar</Button>
                  <Button onClick={handleImport} className="flex-1 gap-2">
                    <FileSpreadsheet className="h-4 w-4" />
                    Importar {rows.length}
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

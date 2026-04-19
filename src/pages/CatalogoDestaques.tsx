import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CatalogViewer } from "@/components/CatalogViewer";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";

const CatalogoDestaques = () => {
  const navigate = useNavigate();

  const { data: products = [], isLoading: loadingProducts } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("*").order("name", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const { data: productImages = [] } = useQuery({
    queryKey: ["product_images"],
    queryFn: async () => {
      const { data, error } = await supabase.from("product_images").select("*").order("position", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const { data: families = [] } = useQuery({
    queryKey: ["families"],
    queryFn: async () => {
      const { data, error } = await supabase.from("product_families").select("*").order("category", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const { data: customizations = [] } = useQuery({
    queryKey: ["catalog_customizations"],
    queryFn: async () => {
      const { data, error } = await supabase.from("catalog_customizations").select("*");
      if (error) throw error;
      return data;
    },
  });

  const imagesByProduct = productImages.reduce((acc: Record<string, typeof productImages>, img) => {
    if (!acc[img.product_id]) acc[img.product_id] = [];
    acc[img.product_id].push(img);
    return acc;
  }, {});

  const familyMap = Object.fromEntries(families.map((f) => [f.id, f.name]));

  const featuredProducts = products.filter((p) => p.featured && p.include_in_catalog);

  const custom = customizations.find((c: any) => c.type === "category" && c.reference_name === "Destaques");

  if (loadingProducts) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <CatalogViewer
      category="Destaques"
      products={featuredProducts}
      imagesByProduct={imagesByProduct}
      familyMap={familyMap}
      onBack={() => navigate("/")}
      customLogoUrl={custom?.logo_url}
      customCoverUrl={custom?.cover_image_url}
    />
  );
};

export default CatalogoDestaques;

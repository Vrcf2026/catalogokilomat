import { KilomatCatalogViewer } from "@/components/KilomatCatalogViewer";
import { useNavigate } from "react-router-dom";
import { SEO } from "@/components/SEO";

const CatalogoKilomat = () => {
  const navigate = useNavigate();
  return (
    <>
      <SEO
        title="Catálogo Kilomat — Materiais de Construção Montijo"
        description="Folheie o catálogo Kilomat com a gama completa de materiais de construção, ferramentas, canalização, tintas e EPI disponíveis em loja no Montijo."
        path="/catalogos/kilomat"
      />
      <KilomatCatalogViewer onBack={() => navigate("/")} />
    </>
  );
};

export default CatalogoKilomat;

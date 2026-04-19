import { KilomatCatalogViewer } from "@/components/KilomatCatalogViewer";
import { useNavigate } from "react-router-dom";

const CatalogoKilomat = () => {
  const navigate = useNavigate();
  return <KilomatCatalogViewer onBack={() => navigate("/")} />;
};

export default CatalogoKilomat;

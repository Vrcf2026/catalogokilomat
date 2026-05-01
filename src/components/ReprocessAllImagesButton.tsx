import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { RefreshCw, Loader2 } from "lucide-react";
import { toast } from "sonner";

export function ReprocessAllImagesButton() {
  const [loading, setLoading] = useState(false);

  const handleReprocess = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("reprocess-all-images");
      if (error) throw error;
      toast.success(
        data?.message ||
          "Reprocessamento iniciado. Atualiza a página dentro de alguns minutos para veres as novas imagens.",
        { duration: 8000 },
      );
    } catch (e: any) {
      console.error(e);
      toast.error("Erro ao iniciar reprocessamento");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon" title="Reprocessar todas as imagens" disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Reprocessar todas as imagens?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta ação vai <strong>apagar todas as imagens atuais</strong> dos produtos e procurar
            novas usando a lógica melhorada (anchor no site oficial da marca, SKU, filtros mais
            agressivos). O processo corre em background e pode demorar vários minutos.
            <br />
            <br />
            Imagens carregadas manualmente (upload) também serão removidas. Imagens "bloqueadas"
            no editor individual <strong>não</strong> são preservadas neste modo bulk.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handleReprocess}>Sim, apagar e reprocessar</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
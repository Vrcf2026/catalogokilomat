import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { Monitor, ExternalLink, Link2, Check } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export function KioskAccessButton() {
  const [copied, setCopied] = useState(false);
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const kioskUrl = `${baseUrl}/catalogos?kiosk=1`;

  const handleCopy = () => {
    navigator.clipboard.writeText(kioskUrl);
    setCopied(true);
    toast.success("Link do quiosque copiado!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Monitor className="h-4 w-4" />
          <span className="hidden sm:inline">Quiosque</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>Modo Recepção</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <a href={kioskUrl} target="_blank" rel="noopener noreferrer" className="cursor-pointer">
            <ExternalLink className="h-4 w-4 mr-2" />
            Abrir Quiosque
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleCopy} className="cursor-pointer">
          {copied ? <Check className="h-4 w-4 mr-2 text-primary" /> : <Link2 className="h-4 w-4 mr-2" />}
          {copied ? "Link copiado" : "Copiar link"}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <div className="px-2 py-1.5 text-[10px] text-muted-foreground break-all">
          {kioskUrl}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

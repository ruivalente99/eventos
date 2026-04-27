"use client";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface QrDialogProps {
  userId: string;
  userName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function QrDialog({ userId, userName, open, onOpenChange }: QrDialogProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function fetchQr() {
    setLoading(true);
    const res = await fetch(`/api/users/${userId}/qr`);
    if (res.ok) {
      const data = await res.json();
      setDataUrl(data.dataUrl);
    } else {
      toast({ title: "Erro ao carregar QR", variant: "destructive" });
    }
    setLoading(false);
  }

  async function regenerate() {
    setLoading(true);
    const res = await fetch(`/api/users/${userId}/qr`, { method: "POST" });
    if (res.ok) {
      const data = await res.json();
      setDataUrl(data.dataUrl);
      toast({ title: "QR regenerado!" });
    } else {
      toast({ title: "Erro ao regenerar QR", variant: "destructive" });
    }
    setLoading(false);
  }

  function handleOpenChange(isOpen: boolean) {
    if (isOpen && !dataUrl) fetchQr();
    if (!isOpen) setDataUrl(null);
    onOpenChange(isOpen);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-xs">
        <DialogHeader>
          <DialogTitle>QR Code — {userName}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4 py-2">
          {loading && <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />}
          {!loading && dataUrl && (
            <img src={dataUrl} alt="QR Code" className="w-64 h-64 rounded-lg border" />
          )}
          <Button variant="outline" size="sm" onClick={regenerate} disabled={loading}>
            <RefreshCw className="h-3.5 w-3.5 mr-1" />
            Regenerar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

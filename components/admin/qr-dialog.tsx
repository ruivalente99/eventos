"use client";
import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, Download } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface QrDialogProps {
  userId: string;
  userName: string;
  userEmoji?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function QrDialog({ userId, userName, userEmoji, open, onOpenChange }: QrDialogProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const prevUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!open) {
      setDataUrl(null);
      prevUserIdRef.current = null;
      return;
    }
    if (dataUrl && prevUserIdRef.current === userId) return;
    prevUserIdRef.current = userId;
    fetchQr();
  }, [open, userId]);

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

  async function downloadQr() {
    if (!dataUrl) return;
    const size = 600;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d")!;

    // Emoji tile background
    const emoji = userEmoji ?? "👤";
    const tileSize = 60;
    ctx.font = `${tileSize * 0.7}px serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.globalAlpha = 0.18;
    for (let y = 0; y <= size; y += tileSize) {
      for (let x = 0; x <= size; x += tileSize) {
        ctx.fillText(emoji, x + tileSize / 2, y + tileSize / 2);
      }
    }
    ctx.globalAlpha = 1;

    // White card
    const padding = 40;
    const cardX = padding;
    const cardY = padding;
    const cardW = size - padding * 2;
    const cardH = size - padding * 2;
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.roundRect(cardX, cardY, cardW, cardH, 16);
    ctx.fill();

    // Load QR image
    await new Promise<void>((resolve) => {
      const img = new Image();
      img.onload = () => {
        const qrSize = cardW - 80;
        const qrX = cardX + 40;
        const qrY = cardY + 50;
        ctx.drawImage(img, qrX, qrY, qrSize, qrSize);
        resolve();
      };
      img.src = dataUrl;
    });

    // Name text
    ctx.fillStyle = "#111827";
    ctx.font = `bold 22px system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.fillText(userName, size / 2, cardY + cardH - 18);

    canvas.toBlob((blob) => {
      if (!blob) return;
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `qr-${userName.toLowerCase().replace(/\s+/g, "-")}.png`;
      a.click();
    }, "image/png");
  }

  const displayEmoji = userEmoji ?? "👤";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xs">
        <DialogHeader>
          <div className="flex flex-col items-center gap-2 pt-2">
            <div className="text-5xl">{displayEmoji}</div>
            <DialogTitle className="text-center">{userName}</DialogTitle>
          </div>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4 py-2">
          {loading && <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />}
          {!loading && dataUrl && (
            <img src={dataUrl} alt="QR Code" className="w-64 h-64 rounded-lg border" />
          )}
          {!loading && !dataUrl && (
            <div className="w-64 h-64 rounded-lg border bg-muted flex items-center justify-center text-muted-foreground text-sm">
              Sem QR disponível
            </div>
          )}
          <div className="flex gap-2 w-full">
            <Button variant="outline" size="sm" className="flex-1" onClick={regenerate} disabled={loading}>
              <RefreshCw className="h-3.5 w-3.5 mr-1" />
              Regenerar
            </Button>
            <Button variant="outline" size="sm" className="flex-1" onClick={downloadQr} disabled={loading || !dataUrl}>
              <Download className="h-3.5 w-3.5 mr-1" />
              Download
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

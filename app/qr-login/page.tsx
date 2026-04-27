"use client";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Loader2 } from "lucide-react";

function QrLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!token) {
      setError(true);
      return;
    }
    signIn("credentials", { token, redirect: false }).then((result) => {
      if (result?.error) {
        setError(true);
      } else {
        router.replace("/dashboard");
      }
    });
  }, [token, router]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-2">
          <p className="font-semibold text-destructive">QR code inválido ou expirado.</p>
          <a href="/login" className="text-sm text-muted-foreground underline">
            Ir para login
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-3">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
        <p className="text-sm text-muted-foreground">A entrar...</p>
      </div>
    </div>
  );
}

export default function QrLoginPage() {
  return (
    <Suspense>
      <QrLoginContent />
    </Suspense>
  );
}

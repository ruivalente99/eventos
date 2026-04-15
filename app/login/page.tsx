import { LoginForm } from "@/components/shared/login-form";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) redirect("/");
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold tracking-tight">Eventos CVUTAD</h1>
          <p className="text-muted-foreground text-sm mt-1">Plataforma de gestão de eventos académicos</p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}

import { AuthForm } from "../auth-form";

export default function RegisterPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <AuthForm mode="register" />
    </main>
  );
}

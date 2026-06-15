import { createClient } from "@/lib/supabase/server";
import { TelegramConnectCard } from "@/components/telegram-connect-card";

export default async function SettingsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: link } = await supabase
    .from("telegram_links")
    .select("id")
    .maybeSingle();

  const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Pengaturan</h1>
        <p className="text-sm text-muted-foreground">{user?.email}</p>
      </div>
      <TelegramConnectCard connected={!!link} botUsername={botUsername} />
    </div>
  );
}

import { redirect } from "next/navigation";

export default function LegacySettingsProfileRedirectPage(): never {
  redirect("/settings");
}

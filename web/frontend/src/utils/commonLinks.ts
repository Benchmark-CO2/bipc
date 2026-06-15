import { Translations } from "@/i18n/translations/pt-BR";
import {
  CircleHelp,
  ClipboardList,
  FileText,
  Fingerprint,
  FolderGit,
  LucideIcon,
  MonitorPlay,
  Newspaper,
  Phone,
  ShieldCheck,
} from "lucide-react";

const BASE_URL = "https://bipc.org.br";
export const CUR_USAGE: "internal" | "external" = "external";

export const commonLinks = {
  about: {
    internal: "/about",
    external: `${BASE_URL}/`,
  },
  faq: {
    internal: "",
    external: `${BASE_URL}/faq`,
  },
  glossary: {
    internal: "",
    external: `${BASE_URL}/glossario`,
  },
  contact: {
    internal: "/contact",
    external: `${BASE_URL}/contact`,
  },
  privacy: {
    internal: "/privacidade",
    external: `${BASE_URL}/privacidade`,
  },
  termsOfUse: {
    internal: "/termos-de-uso",
    external: `${BASE_URL}/termos-de-uso`,
  },
  media: {
    internal: "",
    external: `${BASE_URL}/midia`,
  },
  launch: {
    internal: "",
    external: `${BASE_URL}/lancamento`,
  },
  repository: {
    internal: "",
    external: `${BASE_URL}/repositorio`,
  },
  dataForm: {
    internal: "",
    external: `${BASE_URL}/exercer-meus-direitos`,
  },
};

type CommonLinkKey = keyof typeof commonLinks;

export interface ILinkItem {
  label: string;
  icon: LucideIcon;
  linkKey: CommonLinkKey;
}

export function links(t: Translations) {
  const aboutItems: ILinkItem[] = [
    { label: t.nav.faq, icon: CircleHelp, linkKey: "faq" },
    { label: t.nav.glossary, icon: FileText, linkKey: "glossary" },
    { label: t.nav.media, icon: MonitorPlay, linkKey: "media" },
    { label: t.nav.launch, icon: Newspaper, linkKey: "launch" },
    { label: t.nav.repository, icon: FolderGit, linkKey: "repository" },
    { label: t.nav.contact, icon: Phone, linkKey: "contact" },
  ];

  const transparencyItems: ILinkItem[] = [
    { label: t.nav.privacy, icon: Fingerprint, linkKey: "privacy" },
    { label: t.nav.termsOfUse, icon: ClipboardList, linkKey: "termsOfUse" },
    { label: t.nav.dataForm, icon: ShieldCheck, linkKey: "dataForm" },
  ];
  return { aboutItems, transparencyItems };
}

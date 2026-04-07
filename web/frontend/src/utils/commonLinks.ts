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

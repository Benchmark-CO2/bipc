const BASE_URL = "https://bipc.org.br";
export const CUR_USAGE: "internal" | "external" = "internal";

export const commonLinks = {
  about: {
    internal: "/about",
    external: `${BASE_URL}/sobre`,
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
    external: `${BASE_URL}/contato`,
  },
  privacy: {
    internal: "/privacidade",
    external: `${BASE_URL}/privacidade`,
  },
};

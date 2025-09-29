const { VITE_BASE_URL:BASE_URL, VITE_SITE_URL: PORTAL_URL, VITE_ENV:ENV='production' } = import.meta.env

export {
  BASE_URL, ENV, PORTAL_URL
};


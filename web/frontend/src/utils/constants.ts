const { VITE_BASE_URL:BASE_URL, VITE_SITE_URL: PORTAL_URL, VITE_ENV, VITE_S3_BUCKET:BUCKET_URL='https://bipc-avatar.s3.sa-east-1.amazonaws.com' } = import.meta.env
const ENV = VITE_ENV || 'production';
export {
  BASE_URL, BUCKET_URL, ENV, PORTAL_URL
};


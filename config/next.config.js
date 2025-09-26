/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    domains: [
      'localhost',
      'wrtxujofcmhdfsonalpg.supabase.co',
      'lms-course-assets.s3.amazonaws.com',
      'lms-lesson-hls.s3.amazonaws.com',
      'learnify-avatars.s3.amazonaws.com'
    ],
  },
};

module.exports = nextConfig;

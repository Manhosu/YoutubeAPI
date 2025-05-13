import { defineRoutes } from '@vercel/static-config';

export default defineRoutes([
  { src: '/(.*)', dest: '/index.html' },
]); 
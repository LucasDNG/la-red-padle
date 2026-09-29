import {defineConfig,loadEnv} from 'vite';
import react from '@vitejs/plugin-react';
import {productionApiUrl} from './buildEnv.js';

export default defineConfig(({mode})=>{
  const env=loadEnv(mode,process.cwd(),'');
  if(mode==='production')productionApiUrl(process.env.VITE_API_URL||env.VITE_API_URL);
  const release=String(
    process.env.VERCEL_GIT_COMMIT_SHA||
    process.env.VITE_VERCEL_GIT_COMMIT_SHA||
    process.env.GITHUB_SHA||
    process.env.GIT_COMMIT_SHA||
    env.VITE_RELEASE_SHA||
    'dev'
  ).trim();
  const releasePlugin={
    name:'la-red-release-meta',
    transformIndexHtml(html){
      return html.replace('</head>',`  <meta name="la-red-release" content="${release}"/>\n</head>`);
    }
  };
  return {plugins:[react(),releasePlugin],server:{proxy:{'/api':{target:'http://localhost:3000',changeOrigin:true}}}};
});

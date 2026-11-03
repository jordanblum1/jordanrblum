import { defineConfig, mergeConfig } from 'astro/config';
import base from './astro.config.mjs';

export default mergeConfig(base, defineConfig({
  site: 'https://buildwithblum.com',
  srcDir: './studio',
  publicDir: './studio/public',
  outDir: './dist-studio',
}));

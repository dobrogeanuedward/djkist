import { defineConfig } from 'astro/config';
export default defineConfig({ output: 'static', server: {host:'0.0.0.0'}, vite: {server: {host:'0.0.0.0',allowedHosts:['terminal.local']}} });

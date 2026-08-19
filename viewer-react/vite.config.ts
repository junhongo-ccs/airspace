/// <reference types="vitest/config" />
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

// MapLibre GLのGeoJSONソース処理はWebワーカー（maplibre-gl-worker.mjs）に依存する。
// 既定ではmaplibre-gl自身のimport.meta.url相対でワーカーを探すが、Viteの単一
// バンドル構成では隣にワーカーファイルが存在せず取得に失敗する（SPAフォールバックで
// index.htmlが返り、Workerがモジュールとして解釈できず無言で失敗する）。
// さらにmaplibre-gl-worker.mjs自体が同ディレクトリのmaplibre-gl-shared.mjsを
// 相対importしているため、ワーカー単体をコピーしても内部importが解決できない。
// 2ファイルを常に/assets/配下の固定パスへ配置する。
import { fileURLToPath } from 'node:url';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import { playwright } from '@vitest/browser-playwright';
const dirname = typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url));

// More info at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon
function maplibreWorkerAssets(): Plugin {
  const workerEntry = createRequire(import.meta.url).resolve('maplibre-gl/dist/maplibre-gl-worker.mjs');
  const workerDir = path.dirname(workerEntry);
  const files = ['maplibre-gl-worker.mjs', 'maplibre-gl-shared.mjs'];
  return {
    name: 'maplibre-worker-assets',
    generateBundle() {
      for (const file of files) {
        this.emitFile({
          type: 'asset',
          fileName: `assets/${file}`,
          source: fs.readFileSync(path.join(workerDir, file), 'utf-8')
        });
      }
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const file = files.find(f => req.url === `/assets/${f}`);
        if (!file) return next();
        res.setHeader('Content-Type', 'text/javascript');
        res.end(fs.readFileSync(path.join(workerDir, file)));
      });
    }
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), maplibreWorkerAssets()],
  preview: {
    port: 4173,
    host: '0.0.0.0',
    allowedHosts: ['airspace-viewer-react.onrender.com', 'localhost', '127.0.0.1']
  },
  test: {
    projects: [{
      extends: true,
      plugins: [
      // The plugin will run tests for the stories defined in your Storybook config
      // See options at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon#storybooktest
      storybookTest({
        configDir: path.join(dirname, '.storybook')
      })],
      test: {
        name: 'storybook',
        browser: {
          enabled: true,
          headless: true,
          provider: playwright({}),
          instances: [{
            browser: 'chromium'
          }]
        }
      }
    }]
  }
});
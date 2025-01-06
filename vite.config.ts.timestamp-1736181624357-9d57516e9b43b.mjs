// vite.config.ts
import { resolve as resolve2 } from "path";
import { defineConfig } from "file:///Users/mac/work/quick-notes/node_modules/vite/dist/node/index.js";
import { viteStaticCopy } from "file:///Users/mac/work/quick-notes/node_modules/vite-plugin-static-copy/dist/index.js";
import livereload from "file:///Users/mac/work/quick-notes/node_modules/rollup-plugin-livereload/dist/index.cjs.js";
import { svelte } from "file:///Users/mac/work/quick-notes/node_modules/@sveltejs/vite-plugin-svelte/src/index.js";
import zipPack from "file:///Users/mac/work/quick-notes/node_modules/vite-plugin-zip-pack/dist/esm/index.mjs";
import fg from "file:///Users/mac/work/quick-notes/node_modules/fast-glob/out/index.js";

// yaml-plugin.js
import fs from "fs";
import yaml from "file:///Users/mac/work/quick-notes/node_modules/js-yaml/dist/js-yaml.mjs";
import { resolve } from "path";
function vitePluginYamlI18n(options = {}) {
  const DefaultOptions = {
    inDir: "src/i18n",
    outDir: "dist/i18n"
  };
  const finalOptions = { ...DefaultOptions, ...options };
  return {
    name: "vite-plugin-yaml-i18n",
    buildStart() {
      console.log("\u{1F308} Parse I18n: YAML to JSON..");
      const inDir = finalOptions.inDir;
      const outDir = finalOptions.outDir;
      if (!fs.existsSync(outDir)) {
        fs.mkdirSync(outDir, { recursive: true });
      }
      const files = fs.readdirSync(inDir);
      for (const file of files) {
        if (file.endsWith(".yaml") || file.endsWith(".yml")) {
          console.log(`-- Parsing ${file}`);
          const jsonFile = file.replace(/\.(yaml|yml)$/, ".json");
          if (files.includes(jsonFile)) {
            console.log(`---- File ${jsonFile} already exists, skipping...`);
            continue;
          }
          try {
            const filePath = resolve(inDir, file);
            const fileContents = fs.readFileSync(filePath, "utf8");
            const parsed = yaml.load(fileContents);
            const jsonContent = JSON.stringify(parsed, null, 2);
            const outputFilePath = resolve(outDir, file.replace(/\.(yaml|yml)$/, ".json"));
            console.log(`---- Writing to ${outputFilePath}`);
            fs.writeFileSync(outputFilePath, jsonContent);
          } catch (error) {
            this.error(`---- Error parsing YAML file ${file}: ${error.message}`);
          }
        }
      }
    }
  };
}

// vite.config.ts
var __vite_injected_original_dirname = "/Users/mac/work/quick-notes";
var env = process.env;
var isSrcmap = env.VITE_SOURCEMAP === "inline";
var isDev = env.NODE_ENV === "development";
var outputDir = isDev ? "dev" : "dist";
var vite_config_default = defineConfig({
  resolve: {
    alias: {
      "@": resolve2(__vite_injected_original_dirname, "src")
    }
  },
  plugins: [
    svelte(),
    vitePluginYamlI18n({
      inDir: "public/i18n",
      outDir: `${outputDir}/i18n`
    }),
    viteStaticCopy({
      targets: [
        { src: "./README*.md", dest: "./" },
        { src: "./plugin.json", dest: "./" },
        { src: "./preview.png", dest: "./" },
        { src: "./icon.png", dest: "./" }
      ]
    })
  ],
  define: {
    "process.env.DEV_MODE": JSON.stringify(isDev),
    "process.env.NODE_ENV": JSON.stringify(env.NODE_ENV)
  },
  build: {
    outDir: outputDir,
    emptyOutDir: false,
    minify: true,
    sourcemap: isSrcmap ? "inline" : false,
    lib: {
      entry: resolve2(__vite_injected_original_dirname, "src/index.ts"),
      fileName: "index",
      formats: ["cjs"]
    },
    rollupOptions: {
      plugins: [
        ...isDev ? [
          livereload(outputDir),
          {
            name: "watch-external",
            async buildStart() {
              const files = await fg([
                "public/i18n/**",
                "./README*.md",
                "./plugin.json"
              ]);
              for (let file of files) {
                this.addWatchFile(file);
              }
            }
          }
        ] : [
          // Clean up unnecessary files under dist dir
          cleanupDistFiles({
            patterns: ["i18n/*.yaml", "i18n/*.md"],
            distDir: outputDir
          }),
          zipPack({
            inDir: "./dist",
            outDir: "./",
            outFileName: "package.zip"
          })
        ]
      ],
      external: ["siyuan", "process"],
      output: {
        entryFileNames: "[name].js",
        assetFileNames: (assetInfo) => {
          if (assetInfo.name === "style.css") {
            return "index.css";
          }
          return assetInfo.name;
        }
      }
    }
  }
});
function cleanupDistFiles(options) {
  const {
    patterns,
    distDir
  } = options;
  return {
    name: "rollup-plugin-cleanup",
    enforce: "post",
    writeBundle: {
      sequential: true,
      order: "post",
      async handler() {
        const fg2 = await import("file:///Users/mac/work/quick-notes/node_modules/fast-glob/out/index.js");
        const fs2 = await import("fs");
        const distPatterns = patterns.map((pat) => `${distDir}/${pat}`);
        console.debug("Cleanup searching patterns:", distPatterns);
        const files = await fg2.default(distPatterns, {
          dot: true,
          absolute: true,
          onlyFiles: false
        });
        for (const file of files) {
          try {
            if (fs2.default.existsSync(file)) {
              const stat = fs2.default.statSync(file);
              if (stat.isDirectory()) {
                fs2.default.rmSync(file, { recursive: true });
              } else {
                fs2.default.unlinkSync(file);
              }
              console.log(`Cleaned up: ${file}`);
            }
          } catch (error) {
            console.error(`Failed to clean up ${file}:`, error);
          }
        }
      }
    }
  };
}
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiLCAieWFtbC1wbHVnaW4uanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvVXNlcnMvbWFjL3dvcmsvcXVpY2stbm90ZXNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIi9Vc2Vycy9tYWMvd29yay9xdWljay1ub3Rlcy92aXRlLmNvbmZpZy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vVXNlcnMvbWFjL3dvcmsvcXVpY2stbm90ZXMvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyByZXNvbHZlIH0gZnJvbSBcInBhdGhcIlxuaW1wb3J0IHsgZGVmaW5lQ29uZmlnLCBsb2FkRW52IH0gZnJvbSBcInZpdGVcIlxuaW1wb3J0IHsgdml0ZVN0YXRpY0NvcHkgfSBmcm9tIFwidml0ZS1wbHVnaW4tc3RhdGljLWNvcHlcIlxuaW1wb3J0IGxpdmVyZWxvYWQgZnJvbSBcInJvbGx1cC1wbHVnaW4tbGl2ZXJlbG9hZFwiXG5pbXBvcnQgeyBzdmVsdGUgfSBmcm9tIFwiQHN2ZWx0ZWpzL3ZpdGUtcGx1Z2luLXN2ZWx0ZVwiXG5pbXBvcnQgemlwUGFjayBmcm9tIFwidml0ZS1wbHVnaW4temlwLXBhY2tcIjtcbmltcG9ydCBmZyBmcm9tICdmYXN0LWdsb2InO1xuXG5pbXBvcnQgdml0ZVBsdWdpbllhbWxJMThuIGZyb20gJy4veWFtbC1wbHVnaW4nO1xuXG5jb25zdCBlbnYgPSBwcm9jZXNzLmVudjtcbmNvbnN0IGlzU3JjbWFwID0gZW52LlZJVEVfU09VUkNFTUFQID09PSAnaW5saW5lJztcbmNvbnN0IGlzRGV2ID0gZW52Lk5PREVfRU5WID09PSAnZGV2ZWxvcG1lbnQnO1xuXG5jb25zdCBvdXRwdXREaXIgPSBpc0RldiA/IFwiZGV2XCIgOiBcImRpc3RcIjtcblxuXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoe1xuICAgIHJlc29sdmU6IHtcbiAgICAgICAgYWxpYXM6IHtcbiAgICAgICAgICAgIFwiQFwiOiByZXNvbHZlKF9fZGlybmFtZSwgXCJzcmNcIiksXG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgcGx1Z2luczogW1xuICAgICAgICBzdmVsdGUoKSxcblxuICAgICAgICB2aXRlUGx1Z2luWWFtbEkxOG4oe1xuICAgICAgICAgICAgaW5EaXI6ICdwdWJsaWMvaTE4bicsXG4gICAgICAgICAgICBvdXREaXI6IGAke291dHB1dERpcn0vaTE4bmBcbiAgICAgICAgfSksXG5cbiAgICAgICAgdml0ZVN0YXRpY0NvcHkoe1xuICAgICAgICAgICAgdGFyZ2V0czogW1xuICAgICAgICAgICAgICAgIHsgc3JjOiBcIi4vUkVBRE1FKi5tZFwiLCBkZXN0OiBcIi4vXCIgfSxcbiAgICAgICAgICAgICAgICB7IHNyYzogXCIuL3BsdWdpbi5qc29uXCIsIGRlc3Q6IFwiLi9cIiB9LFxuICAgICAgICAgICAgICAgIHsgc3JjOiBcIi4vcHJldmlldy5wbmdcIiwgZGVzdDogXCIuL1wiIH0sXG4gICAgICAgICAgICAgICAgeyBzcmM6IFwiLi9pY29uLnBuZ1wiLCBkZXN0OiBcIi4vXCIgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSksXG5cbiAgICBdLFxuXG4gICAgZGVmaW5lOiB7XG4gICAgICAgIFwicHJvY2Vzcy5lbnYuREVWX01PREVcIjogSlNPTi5zdHJpbmdpZnkoaXNEZXYpLFxuICAgICAgICBcInByb2Nlc3MuZW52Lk5PREVfRU5WXCI6IEpTT04uc3RyaW5naWZ5KGVudi5OT0RFX0VOVilcbiAgICB9LFxuXG4gICAgYnVpbGQ6IHtcbiAgICAgICAgb3V0RGlyOiBvdXRwdXREaXIsXG4gICAgICAgIGVtcHR5T3V0RGlyOiBmYWxzZSxcbiAgICAgICAgbWluaWZ5OiB0cnVlLFxuICAgICAgICBzb3VyY2VtYXA6IGlzU3JjbWFwID8gJ2lubGluZScgOiBmYWxzZSxcblxuICAgICAgICBsaWI6IHtcbiAgICAgICAgICAgIGVudHJ5OiByZXNvbHZlKF9fZGlybmFtZSwgXCJzcmMvaW5kZXgudHNcIiksXG4gICAgICAgICAgICBmaWxlTmFtZTogXCJpbmRleFwiLFxuICAgICAgICAgICAgZm9ybWF0czogW1wiY2pzXCJdLFxuICAgICAgICB9LFxuICAgICAgICByb2xsdXBPcHRpb25zOiB7XG4gICAgICAgICAgICBwbHVnaW5zOiBbXG4gICAgICAgICAgICAgICAgLi4uKGlzRGV2ID8gW1xuICAgICAgICAgICAgICAgICAgICBsaXZlcmVsb2FkKG91dHB1dERpciksXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG5hbWU6ICd3YXRjaC1leHRlcm5hbCcsXG4gICAgICAgICAgICAgICAgICAgICAgICBhc3luYyBidWlsZFN0YXJ0KCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGZpbGVzID0gYXdhaXQgZmcoW1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAncHVibGljL2kxOG4vKionLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnLi9SRUFETUUqLm1kJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJy4vcGx1Z2luLmpzb24nXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgZmlsZSBvZiBmaWxlcykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmFkZFdhdGNoRmlsZShmaWxlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBdIDogW1xuICAgICAgICAgICAgICAgICAgICAvLyBDbGVhbiB1cCB1bm5lY2Vzc2FyeSBmaWxlcyB1bmRlciBkaXN0IGRpclxuICAgICAgICAgICAgICAgICAgICBjbGVhbnVwRGlzdEZpbGVzKHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhdHRlcm5zOiBbJ2kxOG4vKi55YW1sJywgJ2kxOG4vKi5tZCddLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGlzdERpcjogb3V0cHV0RGlyXG4gICAgICAgICAgICAgICAgICAgIH0pLFxuICAgICAgICAgICAgICAgICAgICB6aXBQYWNrKHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGluRGlyOiAnLi9kaXN0JyxcbiAgICAgICAgICAgICAgICAgICAgICAgIG91dERpcjogJy4vJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIG91dEZpbGVOYW1lOiAncGFja2FnZS56aXAnXG4gICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgXSlcbiAgICAgICAgICAgIF0sXG5cbiAgICAgICAgICAgIGV4dGVybmFsOiBbXCJzaXl1YW5cIiwgXCJwcm9jZXNzXCJdLFxuXG4gICAgICAgICAgICBvdXRwdXQ6IHtcbiAgICAgICAgICAgICAgICBlbnRyeUZpbGVOYW1lczogXCJbbmFtZV0uanNcIixcbiAgICAgICAgICAgICAgICBhc3NldEZpbGVOYW1lczogKGFzc2V0SW5mbykgPT4ge1xuICAgICAgICAgICAgICAgICAgICBpZiAoYXNzZXRJbmZvLm5hbWUgPT09IFwic3R5bGUuY3NzXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBcImluZGV4LmNzc1wiXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGFzc2V0SW5mby5uYW1lXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0sXG4gICAgfVxufSk7XG5cblxuLyoqXG4gKiBDbGVhbiB1cCBzb21lIGRpc3QgZmlsZXMgYWZ0ZXIgY29tcGlsZWRcbiAqIEBhdXRob3IgZnJvc3RpbWVcbiAqIEBwYXJhbSBvcHRpb25zOlxuICogQHJldHVybnMgXG4gKi9cbmZ1bmN0aW9uIGNsZWFudXBEaXN0RmlsZXMob3B0aW9uczogeyBwYXR0ZXJuczogc3RyaW5nW10sIGRpc3REaXI6IHN0cmluZyB9KSB7XG4gICAgY29uc3Qge1xuICAgICAgICBwYXR0ZXJucyxcbiAgICAgICAgZGlzdERpclxuICAgIH0gPSBvcHRpb25zO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgICAgbmFtZTogJ3JvbGx1cC1wbHVnaW4tY2xlYW51cCcsXG4gICAgICAgIGVuZm9yY2U6ICdwb3N0JyxcbiAgICAgICAgd3JpdGVCdW5kbGU6IHtcbiAgICAgICAgICAgIHNlcXVlbnRpYWw6IHRydWUsXG4gICAgICAgICAgICBvcmRlcjogJ3Bvc3QnIGFzICdwb3N0JyxcbiAgICAgICAgICAgIGFzeW5jIGhhbmRsZXIoKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgZmcgPSBhd2FpdCBpbXBvcnQoJ2Zhc3QtZ2xvYicpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGZzID0gYXdhaXQgaW1wb3J0KCdmcycpO1xuICAgICAgICAgICAgICAgIC8vIGNvbnN0IHBhdGggPSBhd2FpdCBpbXBvcnQoJ3BhdGgnKTtcblxuICAgICAgICAgICAgICAgIC8vIFx1NEY3Rlx1NzUyOCBnbG9iIFx1OEJFRFx1NkNENVx1RkYwQ1x1Nzg2RVx1NEZERFx1ODBGRFx1NTMzOVx1OTE0RFx1NTIzMFx1NjU4N1x1NEVGNlxuICAgICAgICAgICAgICAgIGNvbnN0IGRpc3RQYXR0ZXJucyA9IHBhdHRlcm5zLm1hcChwYXQgPT4gYCR7ZGlzdERpcn0vJHtwYXR9YCk7XG4gICAgICAgICAgICAgICAgY29uc29sZS5kZWJ1ZygnQ2xlYW51cCBzZWFyY2hpbmcgcGF0dGVybnM6JywgZGlzdFBhdHRlcm5zKTtcblxuICAgICAgICAgICAgICAgIGNvbnN0IGZpbGVzID0gYXdhaXQgZmcuZGVmYXVsdChkaXN0UGF0dGVybnMsIHtcbiAgICAgICAgICAgICAgICAgICAgZG90OiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBhYnNvbHV0ZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgb25seUZpbGVzOiBmYWxzZVxuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgLy8gY29uc29sZS5pbmZvKCdGaWxlcyB0byBiZSBjbGVhbmVkIHVwOicsIGZpbGVzKTtcblxuICAgICAgICAgICAgICAgIGZvciAoY29uc3QgZmlsZSBvZiBmaWxlcykge1xuICAgICAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGZzLmRlZmF1bHQuZXhpc3RzU3luYyhmaWxlKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHN0YXQgPSBmcy5kZWZhdWx0LnN0YXRTeW5jKGZpbGUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzdGF0LmlzRGlyZWN0b3J5KCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZnMuZGVmYXVsdC5ybVN5bmMoZmlsZSwgeyByZWN1cnNpdmU6IHRydWUgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZnMuZGVmYXVsdC51bmxpbmtTeW5jKGZpbGUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgQ2xlYW5lZCB1cDogJHtmaWxlfWApO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihgRmFpbGVkIHRvIGNsZWFuIHVwICR7ZmlsZX06YCwgZXJyb3IpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcbn1cbiIsICJjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZGlybmFtZSA9IFwiL1VzZXJzL21hYy93b3JrL3F1aWNrLW5vdGVzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvVXNlcnMvbWFjL3dvcmsvcXVpY2stbm90ZXMveWFtbC1wbHVnaW4uanNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL1VzZXJzL21hYy93b3JrL3F1aWNrLW5vdGVzL3lhbWwtcGx1Z2luLmpzXCI7LypcbiAqIENvcHlyaWdodCAoYykgMjAyNCBieSBmcm9zdGltZS4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqIEBBdXRob3IgICAgICAgOiBmcm9zdGltZVxuICogQERhdGUgICAgICAgICA6IDIwMjQtMDQtMDUgMjE6Mjc6NTVcbiAqIEBGaWxlUGF0aCAgICAgOiAveWFtbC1wbHVnaW4uanNcbiAqIEBMYXN0RWRpdFRpbWUgOiAyMDI0LTA0LTA1IDIyOjUzOjM0XG4gKiBARGVzY3JpcHRpb24gIDogXHU1M0JCXHU1OUFFXHU3MzlCXHU3Njg0IGpzb24gXHU2ODNDXHU1RjBGXHVGRjBDXHU2MjExXHU1QzMxXHU2NjJGXHU4OTgxXHU3NTI4IHlhbWwgXHU1MTk5IGkxOG5cbiAqL1xuLy8gcGx1Z2lucy92aXRlLXBsdWdpbi1wYXJzZS15YW1sLmpzXG5pbXBvcnQgZnMgZnJvbSAnZnMnO1xuaW1wb3J0IHlhbWwgZnJvbSAnanMteWFtbCc7XG5pbXBvcnQgeyByZXNvbHZlIH0gZnJvbSAncGF0aCc7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIHZpdGVQbHVnaW5ZYW1sSTE4bihvcHRpb25zID0ge30pIHtcbiAgICAvLyBEZWZhdWx0IG9wdGlvbnMgd2l0aCBhIGZhbGxiYWNrXG4gICAgY29uc3QgRGVmYXVsdE9wdGlvbnMgPSB7XG4gICAgICAgIGluRGlyOiAnc3JjL2kxOG4nLFxuICAgICAgICBvdXREaXI6ICdkaXN0L2kxOG4nLFxuICAgIH07XG5cbiAgICBjb25zdCBmaW5hbE9wdGlvbnMgPSB7IC4uLkRlZmF1bHRPcHRpb25zLCAuLi5vcHRpb25zIH07XG5cbiAgICByZXR1cm4ge1xuICAgICAgICBuYW1lOiAndml0ZS1wbHVnaW4teWFtbC1pMThuJyxcbiAgICAgICAgYnVpbGRTdGFydCgpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdcdUQ4M0NcdURGMDggUGFyc2UgSTE4bjogWUFNTCB0byBKU09OLi4nKTtcbiAgICAgICAgICAgIGNvbnN0IGluRGlyID0gZmluYWxPcHRpb25zLmluRGlyO1xuICAgICAgICAgICAgY29uc3Qgb3V0RGlyID0gZmluYWxPcHRpb25zLm91dERpclxuXG4gICAgICAgICAgICBpZiAoIWZzLmV4aXN0c1N5bmMob3V0RGlyKSkge1xuICAgICAgICAgICAgICAgIGZzLm1rZGlyU3luYyhvdXREaXIsIHsgcmVjdXJzaXZlOiB0cnVlIH0pO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvL1BhcnNlIHlhbWwgZmlsZSwgb3V0cHV0IHRvIGpzb25cbiAgICAgICAgICAgIGNvbnN0IGZpbGVzID0gZnMucmVhZGRpclN5bmMoaW5EaXIpO1xuICAgICAgICAgICAgZm9yIChjb25zdCBmaWxlIG9mIGZpbGVzKSB7XG4gICAgICAgICAgICAgICAgaWYgKGZpbGUuZW5kc1dpdGgoJy55YW1sJykgfHwgZmlsZS5lbmRzV2l0aCgnLnltbCcpKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGAtLSBQYXJzaW5nICR7ZmlsZX1gKVxuICAgICAgICAgICAgICAgICAgICAvL1x1NjhDMFx1NjdFNVx1NjYyRlx1NTQyNlx1NjcwOVx1NTQwQ1x1NTQwRFx1NzY4NGpzb25cdTY1ODdcdTRFRjZcbiAgICAgICAgICAgICAgICAgICAgY29uc3QganNvbkZpbGUgPSBmaWxlLnJlcGxhY2UoL1xcLih5YW1sfHltbCkkLywgJy5qc29uJyk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChmaWxlcy5pbmNsdWRlcyhqc29uRmlsZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGAtLS0tIEZpbGUgJHtqc29uRmlsZX0gYWxyZWFkeSBleGlzdHMsIHNraXBwaW5nLi4uYCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZmlsZVBhdGggPSByZXNvbHZlKGluRGlyLCBmaWxlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGZpbGVDb250ZW50cyA9IGZzLnJlYWRGaWxlU3luYyhmaWxlUGF0aCwgJ3V0ZjgnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHBhcnNlZCA9IHlhbWwubG9hZChmaWxlQ29udGVudHMpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QganNvbkNvbnRlbnQgPSBKU09OLnN0cmluZ2lmeShwYXJzZWQsIG51bGwsIDIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3Qgb3V0cHV0RmlsZVBhdGggPSByZXNvbHZlKG91dERpciwgZmlsZS5yZXBsYWNlKC9cXC4oeWFtbHx5bWwpJC8sICcuanNvbicpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGAtLS0tIFdyaXRpbmcgdG8gJHtvdXRwdXRGaWxlUGF0aH1gKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZzLndyaXRlRmlsZVN5bmMob3V0cHV0RmlsZVBhdGgsIGpzb25Db250ZW50KTtcbiAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuZXJyb3IoYC0tLS0gRXJyb3IgcGFyc2luZyBZQU1MIGZpbGUgJHtmaWxlfTogJHtlcnJvci5tZXNzYWdlfWApO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgIH07XG59XG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQW1RLFNBQVMsV0FBQUEsZ0JBQWU7QUFDM1IsU0FBUyxvQkFBNkI7QUFDdEMsU0FBUyxzQkFBc0I7QUFDL0IsT0FBTyxnQkFBZ0I7QUFDdkIsU0FBUyxjQUFjO0FBQ3ZCLE9BQU8sYUFBYTtBQUNwQixPQUFPLFFBQVE7OztBQ0dmLE9BQU8sUUFBUTtBQUNmLE9BQU8sVUFBVTtBQUNqQixTQUFTLGVBQWU7QUFFVCxTQUFSLG1CQUFvQyxVQUFVLENBQUMsR0FBRztBQUVyRCxRQUFNLGlCQUFpQjtBQUFBLElBQ25CLE9BQU87QUFBQSxJQUNQLFFBQVE7QUFBQSxFQUNaO0FBRUEsUUFBTSxlQUFlLEVBQUUsR0FBRyxnQkFBZ0IsR0FBRyxRQUFRO0FBRXJELFNBQU87QUFBQSxJQUNILE1BQU07QUFBQSxJQUNOLGFBQWE7QUFDVCxjQUFRLElBQUksc0NBQStCO0FBQzNDLFlBQU0sUUFBUSxhQUFhO0FBQzNCLFlBQU0sU0FBUyxhQUFhO0FBRTVCLFVBQUksQ0FBQyxHQUFHLFdBQVcsTUFBTSxHQUFHO0FBQ3hCLFdBQUcsVUFBVSxRQUFRLEVBQUUsV0FBVyxLQUFLLENBQUM7QUFBQSxNQUM1QztBQUdBLFlBQU0sUUFBUSxHQUFHLFlBQVksS0FBSztBQUNsQyxpQkFBVyxRQUFRLE9BQU87QUFDdEIsWUFBSSxLQUFLLFNBQVMsT0FBTyxLQUFLLEtBQUssU0FBUyxNQUFNLEdBQUc7QUFDakQsa0JBQVEsSUFBSSxjQUFjLElBQUksRUFBRTtBQUVoQyxnQkFBTSxXQUFXLEtBQUssUUFBUSxpQkFBaUIsT0FBTztBQUN0RCxjQUFJLE1BQU0sU0FBUyxRQUFRLEdBQUc7QUFDMUIsb0JBQVEsSUFBSSxhQUFhLFFBQVEsOEJBQThCO0FBQy9EO0FBQUEsVUFDSjtBQUNBLGNBQUk7QUFDQSxr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

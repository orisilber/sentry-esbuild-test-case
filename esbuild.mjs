import esbuild from "esbuild";
import fs from "fs";
import rmfr from "rmfr";
import { sentryEsbuildPlugin } from "@sentry/esbuild-plugin";

async function runBuild(root, dist, settings) {
  try {
    await rmfr("./dist");
    const result = await esbuild.build(settings);
    await rmfr("./.meta.json", { glob: false });
    fs.writeFileSync("./.meta.json", JSON.stringify(result.metafile));
  } catch (e) {
    console.log(e);
  }
}

const root = "./";
const clientRoot = "/dist";
const assets = "assets";
const dist = `${root}${clientRoot}`;

const plugins = [
  {
    name: "textReplace",
    setup(build) {
      build.onLoad({ filter: /.*\\.tsx$/ }, async ({ path }) => {
        const source = await fs.readFile(path, "utf8");
        return { contents: source, loader: "tsx" };
      });
    },
  },
  sentryEsbuildPlugin({
    org: "process.env.SENTRY_ORG",
    project: "process.env.SENTRY_PROJECT",
    authToken: "process.env.SENTRY_AUTH_TOKEN",
    sourcemaps: {
      assets: "./dist/assets/**",
      ignore: ["./node_modules/**"],
    },
    debug: true,
    release: {
      name: `${"process.env.SENTRY_PROJECT"}@${"process.env.BUILD_NUMBER"}`,
    },
  }),
];

await runBuild(root, dist, {
  entryPoints: { entryName: "index.ts" },
  format: "iife",
  splitting: false,
  bundle: true,
  external: ["path", "fs", "os", "module"],
  keepNames: true,
  logLevel: "info",
  metafile: true,
  sourcemap: "linked",
  loader: {
    ".TTF": "file",
    ".ttf": "file",
    ".woff": "file",
    ".[jt]s": "jsx",
    ".svg": "file",
    ".png": "file",
    ".jpg": "file",
    ".gif": "file",
  },
  chunkNames: `/${assets}/[name].[hash]`,
  entryNames: `/${assets}/[name].[hash]`,
  assetNames: `/${assets}/[name].[hash]`,
  publicPath: clientRoot,
  outdir: dist,
  target: "esnext",
  plugins: plugins,
});

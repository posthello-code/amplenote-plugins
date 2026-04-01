import dotenv from "dotenv";
import esbuild from "esbuild";

dotenv.config();

const outputDir = process.argv[2] === "test" ? "sandbox" : "build";
const outfile = `${outputDir}/compiled.js`;

const result = await esbuild.build({
  entryPoints: [`lib/plugin.js`],
  bundle: true,
  format: "iife",
  outfile: outfile,
  packages: "external",
  platform: "node",
  write: true,
});
console.log("Result was", result);

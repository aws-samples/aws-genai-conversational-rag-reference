import path from "node:path";
import fs from "node:fs";
import { Component } from 'projen';
import { NodePackage, NodeProject } from 'projen/lib/javascript';

export interface EsmExportDefinition {
  readonly types: string;
  // readonly node: string;
  readonly import: string;
  readonly require: string;
}

export type EsmExportRecord = Record<string, EsmExportDefinition>;

export interface EsmPackageExportsOptions {
  readonly src: string;
  readonly lib: string;
}

export class EsmPackageExports extends Component implements EsmPackageExportsOptions {
  readonly package: NodePackage;

  readonly src: string;
  readonly lib: string;

  readonly srcDir: string;

  constructor(project: NodeProject, options?: EsmPackageExportsOptions) {
    super(project);

    this.package = project.package;

    this.lib = options?.lib ?? "lib";
    this.src = options?.src ?? "src";
    this.srcDir = path.join(this.project.outdir, this.src);
  }

  preSynthesize(): void {
    let exports = this.extractExports(this.srcDir);

    // export package.json
    exports["./package.json"] = "./package.json" as any;

    // add root export
    exports["."] = {
      types: "./lib/index.d.ts",
      import: "./lib/index.js",
      require: "./lib/index.cjs",
    };

    // sort exports
    exports = Object.fromEntries(Object.entries(exports).sort(([a], [b]) => {
      if (a < b) return -1;
      if (a > b) return 1;
      return 0;
    }))

    this.package.addField("exports", exports);
  }

  extractExports(dir: string, ): EsmExportRecord {
    const exports: EsmExportRecord = {};
    for (const file of fs.readdirSync(dir, { withFileTypes: true })) {
      if (file.isDirectory()) {
        Object.assign(
          exports,
          this.extractExports(path.join(dir, file.name))
        );
      } else if (file.isFile()) {
        // Ignore anything that's not a .js file
        const ext = path.extname(file.name);
        if (ext !== ".ts" || file.name.match(/\.(d|test|spec)\.ts$/i)) {
          continue;
        }

        const absPath = path.join(dir, file.name);
        const relPath = path.relative(this.srcDir, absPath);
        const libPath = "./" + path.join(this.lib, relPath);
        let exportPath = libPath.replace(/(\/index)?\.ts/, '');

        exports[exportPath] = {
          types: libPath.replace(/\.ts$/, '.d.ts'),
          import: libPath.replace(/\.ts$/, '.js'),
          require: libPath.replace(/\.ts$/, '.cjs'),
        };
      }
    }

    return exports;
  }
}

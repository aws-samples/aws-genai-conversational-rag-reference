/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import fs from 'node:fs';
import path from 'node:path';
import { Component } from 'projen';
import { NodePackage, NodeProject } from 'projen/lib/javascript';

export interface EsmExportDefinition {
  readonly types: string;
  // readonly node: string;
  readonly import: string;
  readonly require: string;

  readonly browser?: { import: string; require: string };
  readonly node?: { import: string; require: string };
}

export type EsmExportRecord = Record<string, EsmExportDefinition>;

export interface EsmPackageExportsOptions {
  readonly src: string;
  readonly lib: string;
  /**
   * Indicates if module is automatically exported
   * @default true
   */
  readonly rootExport?: boolean;
}

export class EsmPackageExports extends Component implements EsmPackageExportsOptions {
  readonly package: NodePackage;

  readonly src: string;
  readonly lib: string;
  readonly rootExport: boolean;

  readonly srcDir: string;

  constructor(project: NodeProject, options?: EsmPackageExportsOptions) {
    super(project);

    this.package = project.package;

    this.rootExport = options?.rootExport ?? true;

    this.lib = options?.lib ?? 'lib';
    this.src = options?.src ?? 'src';
    this.srcDir = path.join(this.project.outdir, this.src);

    // CJS fall-back for older versions of Node.js
    this.package.addField('main', `${this.lib}/index.cjs`);
  }

  preSynthesize(): void {
    let exports = this.extractExports(this.srcDir);

    // export package.json
    exports['./package.json'] = './package.json' as any;

    // add root export
    if (this.rootExport) {
      exports['.'] = {
        types: './lib/index.d.ts',
        import: './lib/index.js',
        require: './lib/index.cjs',
      };
    }

    // sort exports
    exports = Object.fromEntries(
      Object.entries(exports).sort(([a], [b]) => {
        if (a < b) return -1;
        if (a > b) return 1;
        return 0;
      }),
    );

    this.package.addField('exports', exports);
  }

  extractExports(dir: string): EsmExportRecord {
    const exports: EsmExportRecord = {};
    for (const file of fs.readdirSync(dir, { withFileTypes: true })) {
      if (file.isDirectory()) {
        Object.assign(exports, this.extractExports(path.join(dir, file.name)));
      } else if (file.isFile()) {
        // Ignore anything that's not a .js file
        const ext = path.extname(file.name);
        if (ext !== '.ts' || file.name.match(/\.(d|test|spec)\.ts$/i)) {
          continue;
        }

        const absPath = path.join(dir, file.name);
        const relPath = path.relative(this.srcDir, absPath);
        const libPath = './' + path.join(this.lib, relPath);
        let exportPath = libPath.replace(/(\/index)?\.ts/, '');

        const browser = fs.existsSync(absPath.replace(/\.ts$/, '.browser.ts'));
        const node = fs.existsSync(absPath.replace(/\.ts$/, '.node.ts'));

        exports[exportPath] = {
          types: libPath.replace(/\.ts$/, '.d.ts'),
          browser: browser
            ? {
                import: libPath.replace(/\.ts$/, '.browser.js'),
                require: libPath.replace(/\.ts$/, '.browser.cjs'),
              }
            : undefined,
          node: node
            ? {
                import: libPath.replace(/\.ts$/, '.node.js'),
                require: libPath.replace(/\.ts$/, '.node.cjs'),
              }
            : undefined,
          import: libPath.replace(/\.ts$/, '.js'),
          require: libPath.replace(/\.ts$/, '.cjs'),
        };
      }
    }

    return exports;
  }
}

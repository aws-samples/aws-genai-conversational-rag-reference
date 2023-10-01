import * as path from "node:path";
import { MonorepoTsProject, NxProject } from "@aws/pdk/monorepo";
import { NxPythonProject } from "../components/python";
import {
  AWS_SDK_VERSION,
  DEFAULT_RELEASE_BRANCH,
  LANGCHAIN_VERSION,
  PROJECT_AUTHOR,
  SMITHY_TYPES_VERSION,
} from "../constants";
import { TypeScriptProject } from "projen/lib/typescript";
import { Project } from "projen";
import { GalileoSdk } from "../framework";
import { NodePackageManager } from "projen/lib/javascript";
import { Stability } from "projen/lib/cdk";
import { Api } from "./api";

export interface CorpusOptions {
  readonly monorepo: MonorepoTsProject;
  readonly rootOutdir: string;
  readonly galileoSdk: GalileoSdk;
  readonly api: Api;
}

export class Corpus {
  public readonly project: Project;
  public readonly embeddings: NxPythonProject;
  public readonly logic: TypeScriptProject;

  get dockerOutdir(): string {
    return this.project.outdir;
  }

  constructor(options: CorpusOptions) {
    const { monorepo, rootOutdir, galileoSdk, api } = options;

    const parent = new Project({
      ...PROJECT_AUTHOR,
      parent: monorepo,
      outdir: path.join(rootOutdir, "corpus"),
      name: "corpus",
    });

    const embeddings = new NxPythonProject({
      ...PROJECT_AUTHOR,
      parent,
      outdir: "embeddings",
      name: "corpus-embeddings",
      moduleName: "corpus_embeddings",
      version: "0.0.0",
      deps: [
        "python@>=3.8.1,<4.0",
        "sentence-transformers@^2.2.2",
        "typing_extensions@~4.3.0",
        // https://stackoverflow.com/a/76647180
        `torch@{version = ">=2.0.0, !=2.0.1"}`,
        `transformers@{extras = ["torch"], version = "^4.31.0"}`,
      ],
      devDeps: ["pytest@^7.3.2", "pytest-watch@^4.2.0"],
      dockerfile: false,
    });

    const logic = new TypeScriptProject({
      ...PROJECT_AUTHOR,
      parent,
      defaultReleaseBranch: DEFAULT_RELEASE_BRANCH,
      outdir: "logic",
      name: "corpus-logic",
      packageManager: NodePackageManager.PNPM,
      stability: Stability.EXPERIMENTAL,
      package: false,
      deps: [
        "@aws-lambda-powertools/logger",
        "@aws-lambda-powertools/metrics",
        "@aws-lambda-powertools/parameters",
        `langchain@${LANGCHAIN_VERSION}`, // not semver so need to pin
        "@middy/core",
        "@middy/error-logger",
        "@middy/http-router",
        "@middy/input-output-logger",
        "async",
        "dotenv",
        "fast-glob",
        "node-fetch@^2",
        api.apiInterceptorsTs.package.packageName,
        api.project.runtime.typescript!.package.packageName,
        galileoSdk.package.packageName,
      ],
      devDeps: [
        "@aws-sdk/types",
        "@types/async",
        "@types/aws-lambda",
        "@types/node-fetch@^2",
        "@types/uuid",
        "aws-sdk-client-mock",
      ],
      peerDeps: [
        `@aws-sdk/client-dynamodb@^${AWS_SDK_VERSION}`,
        `@aws-sdk/client-s3@^${AWS_SDK_VERSION}`,
        `@aws-sdk/client-sagemaker-runtime@^${AWS_SDK_VERSION}`,
        `@aws-sdk/client-secrets-manager@^${AWS_SDK_VERSION}`,
        `@aws-sdk/lib-dynamodb@^${AWS_SDK_VERSION}`,
        `@aws-sdk/types@^${AWS_SDK_VERSION}`,
        `@smithy/types@^${SMITHY_TYPES_VERSION}`,
      ],
      publishDryRun: true,
      tsconfigDev: {
        compilerOptions: {
          skipLibCheck: true,
          noUnusedLocals: false,
          noUnusedParameters: false,
        },
      },
      tsconfig: {
        compilerOptions: {
          skipLibCheck: true,
        },
      },
    });
    NxProject.ensure(logic).addImplicitDependency(embeddings);
    logic.gitignore.exclude(".docker-dist");
    const bundleTask = logic.addTask("bundle", {
      steps: [
        {
          exec: "pnpm dlx esbuild src/api/index.ts --bundle --sourcemap --platform=node --target=node18 --outfile=.docker-dist/api.js",
        },
        {
          exec: "pnpm dlx esbuild src/indexing/index.ts --bundle --sourcemap --platform=node --target=node18 --outfile=.docker-dist/indexing.js",
        },
      ],
    });
    logic.postCompileTask.spawn(bundleTask);

    this.project = parent;
    this.embeddings = embeddings;
    this.logic = logic;

    NxProject.ensure(parent).addImplicitDependency(embeddings, logic);

    parent.addTask("install", {
      exec: "poetry update",
      cwd: path.relative(parent.outdir, embeddings.outdir),
    });

    // Add all subprojects to monorepo workspace
    monorepo.addWorkspacePackages(
      ...parent.subprojects.map((p) => {
        return path.relative(monorepo.outdir, p.outdir);
      })
    );
  }
}

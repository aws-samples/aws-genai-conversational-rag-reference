import * as path from "node:path";
import { NxMonorepoProject, NxProject } from '@aws-prototyping-sdk/nx-monorepo';
import { Project, TextFile } from 'projen';
import { PythonProject, PythonProjectOptions } from 'projen/lib/python';

export interface NxPythonProjectOptions extends PythonProjectOptions {
  readonly relativePoetryDependencies?: PythonProject[];
  readonly implicitDependencies?: Project[];
  readonly dockerDistDir?: string;
  readonly dockerfile?: boolean;
  /**
   * The FROM image in dockerfile
   * @default `public.ecr.aws/lambda/python:{dockerPythonVersion}
   */
  readonly dockerFrom?: string;
  /**
   * Major.Minor version of python used docker.
   *
   * - `FROM public.ecr.aws/lambda/python:{VERSION}`
   * - `RUN python{VERSION} ...`
   * @default "3.10"
   */
  readonly dockerPythonVersion?: string;
  /**
   * Relative path part to default handler for docker CMD
   * `CMD [ "<module_name>.{dockerHandler}" ]`
   *
   * @default "handler.handler"
   */
  readonly dockerHandler?: string;
}

export class NxPythonProject extends PythonProject {
  readonly nx: NxProject;

  readonly dockerDistDir: string;

  readonly dockerfile?: TextFile;

  constructor(options: NxPythonProjectOptions) {
    super({
      ...options,
      poetry: true,
      poetryOptions: {
        packages: [{ include: options.moduleName }],
        // Module must be explicitly added to include since poetry excludes everything in .gitignore by default
        include: [options.moduleName, `${options.moduleName}/**/*.py`],
      },
    })

    if (!(this.root instanceof NxMonorepoProject)) {
      throw new Error("NxPythonProject must be nested in root NxMonorepoProject")
    }
    const monorepo = this.root as NxMonorepoProject;

    this.nx = NxProject.ensure(this);

    this.testTask.reset("poetry run pytest");

    options.implicitDependencies && this.nx.addImplicitDependency(...options.implicitDependencies);

    const dockerDistDir = this.dockerDistDir = options.dockerDistDir || ".docker-dist"

    this.nx.addBuildTargetFiles(
      [`!{projectRoot}/${dockerDistDir}/**/*`],
      [`{projectRoot}/${dockerDistDir}`],
    );
    // Add commands to the project's package task to create a distributable which includes relative path dependencies for docker
    this.gitignore.exclude(dockerDistDir);
    this.packageTask.exec(`mkdir -p ${dockerDistDir} && rm -rf ${dockerDistDir}/*`);
    this.packageTask.exec(`rsync -a --exclude=*__pycache__* ${this.moduleName} ${dockerDistDir}/`);
    this.packageTask.exec(`poetry export --without-hashes --format=requirements.txt > ${dockerDistDir}/requirements.original.txt`);
    this.packageTask.exec(`sed -n '/file:\\/\\//!p' ${dockerDistDir}/requirements.original.txt > ${dockerDistDir}/requirements.txt`);

    options.relativePoetryDependencies && options.relativePoetryDependencies.forEach((dep) => {
      if (dep.tryFindFile("pyproject.toml") == null) {
        throw new Error(`[NxPythonProject] All 'relativePoetryDependencies' must be poetry python projects: ${dep.name}`)
      }
      monorepo.addPythonPoetryDependency(this, dep);
      const moduleDir = path.join(path.relative(this.outdir, dep.outdir), dep.moduleName);
      this.packageTask.exec(`rsync -a --exclude=*__pycache__* ${moduleDir} ${dockerDistDir}/`)
    });


    if (options.dockerfile !== false) {
      const dockerPythonVersion = options.dockerPythonVersion || "3.10";
      const from = options.dockerFrom ?? `public.ecr.aws/lambda/python:${dockerPythonVersion}`
      const handler = (options.dockerHandler || "handler.handler");
      const handlerMethod = path.extname(handler).slice(1);
      const handlerBase = handler.replace(new RegExp(`\.${handlerMethod}$`), "");
      this.dockerfile = new TextFile(this, "Dockerfile", { });
      this.dockerfile.addLine(`FROM ${from}`);
      this.dockerfile.addLine("");
      this.dockerfile.addLine("WORKDIR ${LAMBDA_TASK_ROOT}");
      this.dockerfile.addLine(`COPY ${dockerDistDir} \${LAMBDA_TASK_ROOT}/`);
      this.dockerfile.addLine("");
      this.dockerfile.addLine(`RUN python${dockerPythonVersion} -m pip install -r requirements.txt`);
      this.dockerfile.addLine("");
      this.dockerfile.addLine("# Test importing of the handler");
      this.dockerfile.addLine(`RUN python${dockerPythonVersion} -c "import os; os.environ['PYTHON_ENV']='test'; from ${this.moduleName}.${handlerBase} import ${handlerMethod}; print('success')"`);
      this.dockerfile.addLine("");
      this.dockerfile.addLine(`CMD [ "${this.moduleName}.${handler}" ]`)
    }
  }
}

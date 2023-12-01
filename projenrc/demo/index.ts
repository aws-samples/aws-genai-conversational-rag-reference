import { MonorepoTsProject, NxProject } from "@aws/pdk/monorepo";
import { GalileoCdk, GalileoSdk } from "../framework";
import { Api } from "./api";
import { Website } from "./website";
import { Corpus } from "./corpus";
import { Sample } from "./sample";
import { Infra } from "./infra";
import { Project } from 'projen';
import path from 'path';

export interface DemoOptions {
  readonly monorepo: MonorepoTsProject;
  readonly rootOutdir: string;
  readonly galileoCdkLib: GalileoCdk;
  readonly galileoSdk: GalileoSdk;
}

export class Demo {
  public readonly api: Api;
  public readonly website: Website;
  public readonly corpus: Corpus;
  public readonly sample: Sample;
  public readonly infra: Infra;

  constructor(options: DemoOptions) {
    const { monorepo, rootOutdir, galileoSdk, galileoCdkLib } =
      options;

    const api = new Api({ monorepo, rootOutdir });
    // HACK: framework taking dep on demo is bad, but we are planning to drastically simplify
    // this repo soon to remove this framework vs demo paradigm, and we want to be API-First,
    // while a significant amount of types are driven by sdk which prevents this.
    galileoSdk.addDeps(api.project.runtime.typescript!.package.packageName);

    const website = new Website({ monorepo, rootOutdir, api, galileoSdk });

    const corpus = new Corpus({ monorepo, rootOutdir, galileoSdk, api });

    const sample = new Sample({ monorepo, rootOutdir });

    this.infra = new Infra({
      monorepo,
      rootOutdir,
      api,
      website,
      corpus,
      galileoCdkLib,
      galileoSdk,
      sample,
    });

    this.api = api;
    this.website = website;
    this.corpus = corpus;
    this.sample = sample;

    this.setupChatEngineConfigOverrides(this.website.project, 'public', [
      'pre-compile',
      'dev',
    ]);
    this.setupChatEngineConfigOverrides(this.infra.project, 'src/application/ai/inference-engine/engine/handler', [
      'pre-compile',
    ]);
  }

  // HACK: support application wide chat engine config "default"
  private setupChatEngineConfigOverrides(project: Project, destDir: string, prependSpawnTask: string[]) {
    const FILENAME = 'chat-engine-config.json';
    const srcFile = path.join('../overrides', FILENAME);
    const destFile = path.join(destDir, FILENAME);
    const copyOverrideTask = project.addTask('overrides:copy:chat-engine-config', {
      exec: `[ -f ${srcFile} ] && cp -f ${srcFile} ${destFile} || echo '{}' > ${destFile}`,
    });
    NxProject.ensure(project).addBuildTargetFiles(
      [`{workspaceRoot}/demo/overrides/**/*`],
      [`{projectRoot}/${destFile}`]
    )

    prependSpawnTask.forEach(t => project.tasks.tryFind(t)?.prependSpawn(copyOverrideTask));
  }
}

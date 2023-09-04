import { NxMonorepoProject } from "@aws-prototyping-sdk/nx-monorepo";
import { GalileoCdkLib, GalileoSdk } from "../framework";
import { Api } from './api';
import { Website } from './website';
import { Corpus } from './corpus';
import { Sample } from './sample';
import { Infra } from './infra';

export interface DemoOptions {
  readonly monorepo: NxMonorepoProject;
  readonly rootOutdir: string;
  readonly applicationName: string;
  readonly galileoCdkLib: GalileoCdkLib;
  readonly galileoSdk: GalileoSdk;
}

export class Demo {
  constructor(options: DemoOptions) {
    const { monorepo, rootOutdir, galileoSdk, galileoCdkLib, applicationName } = options;

    const api = new Api({ monorepo, rootOutdir });

    const website = new Website({ monorepo, rootOutdir, api, galileoSdk });

    const corpus = new Corpus({ monorepo, rootOutdir, galileoSdk, api });

    const sample = new Sample({ monorepo, rootOutdir });

    new Infra({ monorepo, rootOutdir, applicationName, api, website, corpus, galileoCdkLib, galileoSdk, sample });
    monorepo.addGitIgnore("demo/docs/build");
    monorepo.addGitIgnore("demo/docs/dist");
  }
}

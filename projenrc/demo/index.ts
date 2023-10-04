import { MonorepoTsProject } from "@aws/pdk/monorepo";
import { GalileoCdk, GalileoSdk } from "../framework";
import { Api } from "./api";
import { Website } from "./website";
import { Corpus } from "./corpus";
import { Sample } from "./sample";
import { Infra } from "./infra";

export interface DemoOptions {
  readonly monorepo: MonorepoTsProject;
  readonly rootOutdir: string;
  readonly applicationName: string;
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
    const { monorepo, rootOutdir, galileoSdk, galileoCdkLib, applicationName } =
      options;

    const api = new Api({ monorepo, rootOutdir });

    const website = new Website({ monorepo, rootOutdir, api, galileoSdk });

    const corpus = new Corpus({ monorepo, rootOutdir, galileoSdk, api });

    const sample = new Sample({ monorepo, rootOutdir });

    this.infra = new Infra({
      monorepo,
      rootOutdir,
      applicationName,
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
  }
}

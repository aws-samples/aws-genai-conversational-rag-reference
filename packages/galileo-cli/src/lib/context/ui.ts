/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import ora, { Ora } from 'ora';

export class Ui {
  private _spinner: Ora | null = null;

  get spinner() {
    if (this._spinner == null) {
      this._spinner = ora();
    }
    return this._spinner;
  }

  newSpinner() {
    if (this._spinner) {
      this._spinner.stop();
      this._spinner = null;
    }

    return this.spinner;
  }
}

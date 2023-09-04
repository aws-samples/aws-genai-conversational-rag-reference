/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import BaseCodeEditor, {
  CodeEditorProps as BaseCodeEditorProps,
} from "@cloudscape-design/components/code-editor";
import { useState, useMemo, useEffect, useCallback } from "react";

import "ace-builds/css/ace.css";
import "ace-builds/css/theme/dawn.css";
import "ace-builds/css/theme/tomorrow_night_bright.css";

export interface CodeEditorProps
  extends Omit<
    BaseCodeEditorProps,
    "ace" | "onPreferencesChange" | "onRecoveryClick"
  > {}

const DEFAULT_RESOURCE_STRINGS = {
  loadingState: "Loading code editor",
  errorState: "There was an error loading the code editor.",
  errorStateRecovery: "Retry",
  editorGroupAriaLabel: "Code editor",
  statusBarGroupAriaLabel: "Status bar",
  cursorPosition: (row: number, column: number) => `Ln ${row}, Col ${column}`,
  errorsTab: "Errors",
  warningsTab: "Warnings",
  preferencesButtonAriaLabel: "Preferences",
  paneCloseButtonAriaLabel: "Close",
  preferencesModalHeader: "Preferences",
  preferencesModalCancel: "Cancel",
  preferencesModalConfirm: "Confirm",
  preferencesModalWrapLines: "Wrap lines",
  preferencesModalTheme: "Theme",
  preferencesModalLightThemes: "Light themes",
  preferencesModalDarkThemes: "Dark themes",
};

export const CodeEditor = (props: CodeEditorProps) => {
  const [preferences, setPreferences] = useState(props.preferences);
  const [loading, setLoading] = useState(true);
  const [ace, setAce] = useState<object>();
  const resourceStrings = useMemo(() => {
    return {
      ...DEFAULT_RESOURCE_STRINGS,
      ...props.i18nStrings,
    };
  }, [props.i18nStrings]);

  const loadAce = useCallback(() => {
    setLoading(true);
    return import("ace-builds")
      .then((_ace) => {
        _ace.config.set("useStrictCSP", true);
        _ace.config.set("loadWorkerFromBlob", false);
        setAce(_ace);
      })
      .then(() => import("ace-builds/webpack-resolver"))
      .catch((e) => {
        console.log("Error in importing ace-builds", e);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    loadAce().catch(console.error);
  }, [loadAce]);

  return (
    <BaseCodeEditor
      editorContentHeight={80}
      {...props}
      loading={loading}
      ace={ace}
      language={props.language}
      i18nStrings={resourceStrings}
      preferences={preferences}
      onPreferencesChange={(e) => setPreferences(e.detail)}
      onRecoveryClick={loadAce}
    />
  );
};

export { CodeEditor as default };

/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import BaseCodeEditor, { CodeEditorProps as BaseCodeEditorProps } from '@cloudscape-design/components/code-editor';
import { NonCancelableEventHandler } from '@cloudscape-design/components/internal/events';

import { Ace } from 'ace-builds';
import { useState, useMemo, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import 'ace-builds/css/ace.css';
import 'ace-builds/css/theme/dawn.css';
import 'ace-builds/css/theme/tomorrow_night_bright.css';
import 'ace-builds/src-noconflict/ext-language_tools';

export type Ace = typeof import('ace-builds/ace');
export type AceEditor = typeof import('ace-builds/ace').Editor;

export interface AceEditorCallback {
  (ace: Ace): void;
}

export interface CodeEditorProps extends Omit<BaseCodeEditorProps, 'ace' | 'onPreferencesChange' | 'onRecoveryClick'> {
  onAceEditor?: AceEditorCallback;
  placeholder?: string;
  /** Custom autocomplete completions. @memoize */
  readonly completions?: Ace.Completion[];
}

const DEFAULT_RESOURCE_STRINGS = {
  loadingState: 'Loading code editor',
  errorState: 'There was an error loading the code editor.',
  errorStateRecovery: 'Retry',
  editorGroupAriaLabel: 'Code editor',
  statusBarGroupAriaLabel: 'Status bar',
  cursorPosition: (row: number, column: number) => `Ln ${row}, Col ${column}`,
  errorsTab: 'Errors',
  warningsTab: 'Warnings',
  preferencesButtonAriaLabel: 'Preferences',
  paneCloseButtonAriaLabel: 'Close',
  preferencesModalHeader: 'Preferences',
  preferencesModalCancel: 'Cancel',
  preferencesModalConfirm: 'Confirm',
  preferencesModalWrapLines: 'Wrap lines',
  preferencesModalTheme: 'Theme',
  preferencesModalLightThemes: 'Light themes',
  preferencesModalDarkThemes: 'Dark themes',
};

export const CodeEditor = forwardRef((props: CodeEditorProps, ref: React.Ref<Ace.Editor | null>) => {
  const [editor, setEditor] = useState<Ace.Editor | null>(null);
  useImperativeHandle(ref, () => editor, [editor]);

  const [preferences, setPreferences] = useState(props.preferences);
  const [loading, setLoading] = useState(true);
  const [ace, setAce] = useState<Ace>();
  const resourceStrings = useMemo(() => {
    return {
      ...DEFAULT_RESOURCE_STRINGS,
      ...props.i18nStrings,
    };
  }, [props.i18nStrings]);

  const loadAce = useCallback(() => {
    setLoading(true);
    return import('ace-builds')
      .then((_ace) => {
        _ace.config.set('useStrictCSP', true);
        _ace.config.set('loadWorkerFromBlob', false);
        // Wrap ace so we can have control over editor instantiation
        setAce(
          new Proxy(_ace, {
            get<T extends Ace>(target: T, prop: keyof T) {
              if (prop === 'edit') {
                return function edit(...args: Parameters<typeof _ace.edit>) {
                  const _editor = _ace.edit.apply(target, args);
                  setEditor(_editor);
                  return _editor;
                };
              }

              return target[prop];
            },
          }),
        );
      })
      .then(() => import('ace-builds/webpack-resolver'))
      .catch((e) => {
        console.log('Error in importing ace-builds', e);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    loadAce().catch(console.error);
  }, [loadAce]);

  const [editorContentHeight, setEditorContentHeight] = useState<number>(props.editorContentHeight || 80);
  const onEditorContentResize = useCallback<NonCancelableEventHandler<BaseCodeEditorProps.ResizeDetail>>(
    ({ detail }) => {
      setEditorContentHeight(detail.height);
    },
    [setEditorContentHeight],
  );

  useEffect(() => {
    ace && props.onAceEditor && props.onAceEditor(ace);
  }, [ace, props.onAceEditor]);

  useEffect(() => {
    if (editor) {
      editor.setOption('placeholder', props.placeholder || '');
    }
  }, [props.placeholder, editor]);

  useEffect(() => {
    if (ace && props.completions && props.completions.length) {
      // https://github.com/securingsincity/react-ace/issues/338
      const langTools = ace.require('ace/ext/language_tools');
      const customCompleter: Ace.Completer = {
        getCompletions: (_editor, _session, _position, _prefix, callback) => {
          callback(null, props.completions!);
        },
      };
      langTools.addCompleter(customCompleter);
    }
  }, [ace, props.completions]);

  return (
    <BaseCodeEditor
      {...props}
      editorContentHeight={editorContentHeight}
      onEditorContentResize={onEditorContentResize}
      loading={loading}
      ace={ace}
      language={props.language}
      i18nStrings={resourceStrings}
      preferences={preferences}
      onPreferencesChange={(e) => setPreferences(e.detail)}
      onRecoveryClick={loadAce}
    />
  );
});

export { CodeEditor as default };

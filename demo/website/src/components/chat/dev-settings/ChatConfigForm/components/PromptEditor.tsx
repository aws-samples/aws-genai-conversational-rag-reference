/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import { resolvePromptTemplateByChainType } from '@aws/galileo-sdk/lib/prompt/templates/store/resolver';
import type { PromptRuntime } from '@aws/galileo-sdk/lib/prompt/types';
import { ChainType } from '@aws/galileo-sdk/lib/schema';
import { Box, Button, Header, Popover, SpaceBetween, Table, Toggle } from '@cloudscape-design/components';
import Grid from '@cloudscape-design/components/grid';
import { Ace } from 'ace-builds';
import { isEmpty } from 'lodash';
import { useState, useEffect, FC, useRef, useCallback } from 'react';
import CodeEditor, { AceEditor } from '../../../../code-editor';

export type PromptEditorInputValues = { [key: string]: any };

export interface PromptEditorProps<CTT extends ChainType = any, T extends object = any> {
  readonly value?: string | T;
  readonly type: CTT;
  readonly runtime?: PromptRuntime;
  readonly onChange: (value?: string | T) => void;
  readonly defaultInputValues: any;
}

function interpPropValueToCode(value: any): string {
  if (value == null || isEmpty(value)) return '';
  if (typeof value === 'string') return value;
  return value.template || '';
}

export const PromptEditor: FC<PromptEditorProps> = (props) => {
  const [value, setValue] = useState<string>(() => interpPropValueToCode(props.value));
  const defaultTemplateRef = useRef<string>();
  const [inputValues, setInputValues] = useState<(typeof props)['defaultInputValues']>(props.defaultInputValues || {});
  const [completions, setCompletions] = useState<Ace.Completion[]>();
  const [showConfig, setShowConfig] = useState<boolean>(false);
  const editorRef = useRef<InstanceType<AceEditor> | null>(null);
  const [partials, setPartials] = useState<Record<string, string>>();

  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.setOption('enableBasicAutocompletion', true);
      editorRef.current.setOption('enableLiveAutocompletion', true);
    }
  }, [editorRef.current]);

  // generate a flattened version of the default template
  useEffect(() => {
    (async () => {
      const prompt = await resolvePromptTemplateByChainType(props.type, props.runtime);
      defaultTemplateRef.current = prompt.flatten();
      setValue((current) => {
        if (isEmpty(current)) {
          return defaultTemplateRef.current!;
        } else {
          return current;
        }
      });

      if (prompt.templatePartials != null && !isEmpty(prompt.templatePartials)) {
        setPartials(
          Object.fromEntries(Object.entries(prompt.templatePartials).map(([_key, _value]) => [_key, String(_value)])),
        );
      } else {
        setPartials(undefined);
      }
    })().catch(console.error);
  }, [props.type, props.runtime]);

  // Update editor auto completion based on template partials
  useEffect(() => {
    if (partials && !isEmpty(partials)) {
      const _completions = Object.entries(partials).flatMap(([_key, _value]): Ace.Completion[] => {
        return [
          {
            meta: 'Prompt:Partial',
            caption: `{{>${_key}}}`,
            value: `{{>${_key}}}`,
          },
          {
            meta: 'Prompt:Partial:Content',
            caption: `{{>${_key}}}...`,
            value: String(_value),
          },
        ];
      });
      setCompletions(_completions);
    } else {
      setCompletions(undefined);
    }
  }, [partials]);

  // control value from props.value
  useEffect(() => {
    if (props.value != null) {
      // update value from prop
      setValue(interpPropValueToCode(props.value));
    } else if (defaultTemplateRef.current) {
      // reset to default template when prop is nullish
      setValue(defaultTemplateRef.current);
    }
  }, [props.value]);

  // control value callback
  const onChange = useCallback(
    (_value: string) => {
      // only update prop value when different from default template
      // otherwise reset it to the undefined (default)
      if (_value === defaultTemplateRef.current) {
        props.onChange(undefined);
      } else {
        props.onChange(_value);
      }
    },
    [props.onChange],
  );

  // preview rendering
  const [preview, setPreview] = useState<string>('Loading...');
  useEffect(() => {
    (async () => {
      try {
        const prompt = await resolvePromptTemplateByChainType(
          props.type,
          props.runtime,
          isEmpty(value)
            ? undefined
            : {
                template: value,
              },
        );
        const previewValue = await prompt.format(inputValues);
        setPreview(previewValue);
      } catch (error) {
        setPreview(String(error));
      }
    })().catch(console.error);
  }, [props.type, props.runtime, inputValues, value]);

  return (
    <Grid gridDefinition={[{ colspan: 6 }, { colspan: 6 }]}>
      <Box>
        {showConfig ? (
          <CodeEditor
            value={JSON.stringify(inputValues, null, 2)}
            onDelayedChange={({ detail }) => {
              try {
                setInputValues(JSON.parse(detail.value));
              } catch {}
            }}
            language="json"
            editorContentHeight={250}
          />
        ) : (
          <CodeEditor
            ref={editorRef as any}
            value={value}
            onDelayedChange={({ detail }) => onChange(detail.value)}
            completions={completions}
            language="handlebars"
            editorContentHeight={250}
          />
        )}

        <SpaceBetween direction="horizontal" size="s">
          <Guide templatePartials={partials} inputValues={inputValues} />

          <Toggle checked={showConfig} onChange={({ detail }) => setShowConfig(detail.checked)}>
            Edit preview data
          </Toggle>
        </SpaceBetween>
      </Box>

      <Box>
        <div
          style={{
            whiteSpace: 'pre-wrap',
            backgroundColor: '#efefef',
            padding: 5,
          }}
        >
          {preview}
        </div>
      </Box>
    </Grid>
  );
};

export { PromptEditor as default };

const Guide: FC<{
  inputValues?: Record<string, any>;
  templatePartials?: Record<string, string>;
}> = ({ templatePartials }) => {
  return (
    <SpaceBetween direction="horizontal" size="s">
      <Popover
        dismissButton={false}
        position="bottom"
        size="large"
        triggerType="text"
        content={
          <div style={{ overflow: 'scroll', height: 300, zIndex: 99999999 }}>
            <Box>
              <Table
                variant="borderless"
                wrapLines
                stickyHeader
                header={
                  <Header headingTagOverride="h5" description="Predefined handlebars template partials: {{>Name}}">
                    Template Partials
                  </Header>
                }
                columnDefinitions={[
                  { header: 'Name', cell: (item) => item[0], width: 150 },
                  { header: 'Value', cell: (item) => <code>{item[1]}</code> },
                ]}
                items={Object.entries(templatePartials || {})}
              />
            </Box>
          </div>
        }
      >
        <Button variant="inline-link" iconName="status-info">
          Template Partials
        </Button>
      </Popover>
    </SpaceBetween>
  );
};

/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
// import '@aws/galileo-sdk/lib/langchain/patch';
import { ChainType } from '@aws/galileo-sdk/lib/schema';
import { Icon, Link, TextContent, Toggle } from '@cloudscape-design/components';
import FormField from '@cloudscape-design/components/form-field';
import SpaceBetween from '@cloudscape-design/components/space-between';
import { FC } from 'react';
import {
  useChatEngineConfigChainPrompt,
  useChatEngineConfigChainProp,
  useChatEngineConfigModelAdapter,
} from '../../../../../providers/ChatEngineConfig';
import PromptEditor from '../components/PromptEditor';

export const PromptSettings: FC = () => {
  const [qaPrompt, setQaPrompt] = useChatEngineConfigChainPrompt(ChainType.QA);
  const [condenseQuestionPrompt, setCondenseQuestionPrompt] = useChatEngineConfigChainPrompt(
    ChainType.CONDENSE_QUESTION,
  );
  const [classifyPrompt, setClassifyPrompt] = useChatEngineConfigChainPrompt(ChainType.CLASSIFY);
  const [classifyEnabled, setClassifyEnabled] = useChatEngineConfigChainProp(ChainType.CLASSIFY, 'enabled');

  const adapter = useChatEngineConfigModelAdapter();

  return (
    <SpaceBetween direction="vertical" size="s">
      <TextContent>
        <small>
          Prompt templates are implemented with{' '}
          <Link href="https://handlebarsjs.com/guide/expressions.html#basic-usage" external>
            Handlebars
          </Link>{' '}
          for rich-template editing and control. In addition to the{' '}
          <Link href="https://handlebarsjs.com/guide/builtin-helpers.html" external>
            built-in helpers
          </Link>
          , the templates also support{' '}
          <Link external href="https://assemble.io/helpers/helpers-strings.html">
            Strings
          </Link>
          and{' '}
          <Link external href="https://assemble.io/helpers/helpers-math.html">
            Math
          </Link>{' '}
          helpers. Each template also has predefined{' '}
          <Link external href="https://handlebarsjs.com/guide/partials.html">
            <Icon name="status-info" />
            Template Partials
          </Link>{' '}
          for composing more dynamic and reusable templates.
        </small>
      </TextContent>

      <FormField
        label="QA Prompt"
        description="Prompt that contains standalone question to send to inference model"
        stretch
      >
        <PromptEditor
          type={ChainType.QA}
          runtime={adapter?.prompt?.chat?.QA}
          value={qaPrompt?.template}
          onChange={(template) => setQaPrompt({ template })}
          defaultInputValues={{
            domain: 'Testing',
            context: ['Source document #1', 'Source document #2'].join('\n\n'),
            question: 'Do you like prompt engineering?',
          }}
        />
      </FormField>
      <FormField
        label="Condense Question Prompt"
        description="Prompt that generates the standalone question from context"
        stretch
      >
        <PromptEditor
          type={ChainType.CONDENSE_QUESTION}
          runtime={adapter?.prompt?.chat?.CONDENSE_QUESTION}
          value={condenseQuestionPrompt?.template}
          onChange={(template) => setCondenseQuestionPrompt({ template })}
          defaultInputValues={{
            chat_history: [
              { type: 'human', content: 'What is prompt engineering?' },
              {
                type: 'ai',
                content: 'Prompt engineering fine-tunes language models for specific tasks using targeted questions.',
              },
            ] as any,
            question: 'How is this different from other engineering?',
          }}
        />
      </FormField>

      <FormField
        label="Classify Enabled"
        description="Indicates if classification chain is enabled to provide configuration capabilities to following chains"
      >
        <Toggle
          checked={classifyEnabled ?? false}
          onChange={({ detail }) => {
            setClassifyEnabled(detail.checked);
          }}
        />
      </FormField>
      {classifyEnabled && (
        <FormField
          label="Classify Prompt"
          description="Prompt that generates classification JSON as config passed to following prompts"
          stretch
        >
          <PromptEditor
            type={ChainType.CLASSIFY}
            runtime={adapter?.prompt?.chat?.CLASSIFY}
            value={classifyPrompt?.template}
            onChange={(template) => setClassifyPrompt({ template })}
            defaultInputValues={{
              question: 'Why are roses red and violets blue?',
            }}
          />
        </FormField>
      )}
    </SpaceBetween>
  );
};

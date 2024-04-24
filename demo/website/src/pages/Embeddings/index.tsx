/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import {
  Alert,
  Box,
  Button,
  Container,
  Form,
  FormField,
  SelectProps,
  SpaceBetween,
  Spinner,
  TextContent,
  Textarea,
} from '@cloudscape-design/components';
import ContentLayout from '@cloudscape-design/components/content-layout';
import Header from '@cloudscape-design/components/header';
import { faker } from '@faker-js/faker';
import { useEmbedDocuments } from 'api-typescript-react-query-hooks';
import { useState } from 'react';
import { useImmer } from 'use-immer';
import { EmbeddingModelSelector } from '../../components/chat/dev-settings/ChatConfigForm/components/EmbeddingModelSelector';

export const EmbeddingsTool: React.FC = () => {
  const [sentences, updateSentences] = useImmer<string[]>(['text']);
  const [duration, setDuration] = useState<number>();
  const [selectedLanguage, setSelectedLanguage] = useState<SelectProps.Option | null>(null);

  const caller = useEmbedDocuments();
  const sampleCount = 20;

  const onSubmit = async () => {
    const _start = Date.now();
    setDuration(undefined);
    await caller.mutateAsync({
      embedDocumentsRequestContent: {
        texts: sentences,
        modelRefKey: selectedLanguage?.value,
      },
    });
    setDuration((Date.now() - _start) / 1000);
  };

  const addSentence = () => {
    updateSentences((draft) => {
      draft.push('text');
    });
  };
  const removeSentence = () => {
    updateSentences((draft) => {
      if (sentences.length > 1) {
        draft.pop();
      }
    });
  };
  const loadSampleData = () => {
    updateSentences(() => {
      return Array.from(Array(sampleCount)).map(() => faker.lorem.sentence(50));
    });
  };

  return (
    <ContentLayout
      header={
        <Header variant="h1" description="Test embedding results of text against the embedding model">
          Embedding Tool
        </Header>
      }
    >
      <SpaceBetween direction="vertical" size="l">
        <Container>
          <Form
            actions={
              <SpaceBetween direction="horizontal" size="s">
                <Button onClick={removeSentence} variant="inline-icon" iconName="undo" disabled={caller.isLoading}>
                  -
                </Button>
                <Button onClick={addSentence} variant="inline-icon" iconName="add-plus" disabled={caller.isLoading}>
                  +
                </Button>
                <Button onClick={loadSampleData} variant="link" disabled={caller.isLoading}>
                  Sample
                </Button>
                <Button onClick={onSubmit} variant="primary" loading={caller.isLoading}>
                  Submit
                </Button>
              </SpaceBetween>
            }
          >
            <SpaceBetween direction="vertical" size="s">
              <FormField label="Input Text" description="Enter the text to embed" stretch>
                <div
                  style={{
                    maxHeight: '25vh',
                    overflow: 'auto',
                    paddingRight: 60,
                  }}
                >
                  <SpaceBetween direction="vertical" size="m">
                    {sentences.map((s, i) => (
                      <Textarea
                        key={i}
                        value={s}
                        onChange={({ detail }) =>
                          updateSentences((draft) => {
                            draft[i] = detail.value;
                          })
                        }
                      />
                    ))}
                  </SpaceBetween>
                </div>
              </FormField>
              <FormField label="Embedding Model" description="Select the embedding model for vector embeddings">
                <EmbeddingModelSelector
                  value={selectedLanguage?.value}
                  onChange={(detail) => {
                    setSelectedLanguage(detail.selectedOption);
                  }}
                />
              </FormField>
            </SpaceBetween>
          </Form>
        </Container>

        <SpaceBetween direction="vertical" size="l">
          {caller.isLoading && <Spinner />}

          {caller.error && (
            <Alert type="error" header="Error">
              <code>{caller.error.message}</code>
            </Alert>
          )}

          <div>{caller.data && `${sentences.length} documents in ${duration} seconds`}</div>

          <div style={{ maxHeight: '25vh', overflow: 'auto', width: '100%' }}>
            <SpaceBetween direction="vertical" size="m">
              {caller.data?.embeddings.map((embedding, i) => (
                <Box key={i} variant="div">
                  <Header counter={`(${embedding.length || 0})`} info={caller.data?.model}>
                    Results
                  </Header>
                  <br />

                  <TextContent>
                    <div style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(embedding, null, 0)}</div>
                  </TextContent>
                </Box>
              ))}
            </SpaceBetween>
          </div>
        </SpaceBetween>
      </SpaceBetween>
    </ContentLayout>
  );
};

export default EmbeddingsTool;

/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import {
  Alert,
  Box,
  Button,
  Container,
  Form,
  FormField,
  SpaceBetween,
  Spinner,
  TextContent,
  Textarea,
} from '@cloudscape-design/components';
import ContentLayout from '@cloudscape-design/components/content-layout';
import Header from '@cloudscape-design/components/header';
import { useEmbedQuery } from 'api-typescript-react-query-hooks';
import { useCallback, useState } from 'react';

export const EmbeddingsTool: React.FC = () => {
  const [query, setQuery] = useState<string>('');
  const embedQuery = useEmbedQuery();

  const onSubmit = useCallback(() => {
    embedQuery.mutate({
      embedQueryRequestContent: {
        text: query,
      },
    });
  }, [embedQuery, query]);

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
                <Button onClick={onSubmit} loading={embedQuery.isLoading}>
                  Submit
                </Button>
              </SpaceBetween>
            }
          >
            <FormField label="Input Text" description="Enter the text to embed">
              <Textarea value={query} onChange={({ detail }) => setQuery(detail.value)} />
            </FormField>
          </Form>
        </Container>

        <Box variant="div">
          <Header counter={`(${embedQuery.data?.embedding.length || 0})`} info={embedQuery.data?.model}>
            Results
          </Header>
          <br />
          {embedQuery.isLoading && <Spinner />}

          {embedQuery.error && (
            <Alert type="error" header="Error">
              <code>{embedQuery.error.message}</code>
            </Alert>
          )}

          <TextContent>
            <div style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(embedQuery.data?.embedding, null, 0)}</div>
          </TextContent>
        </Box>
      </SpaceBetween>
    </ContentLayout>
  );
};

export default EmbeddingsTool;

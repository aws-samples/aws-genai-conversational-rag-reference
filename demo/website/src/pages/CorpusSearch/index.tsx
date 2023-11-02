/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import {
  Alert,
  Box,
  Button,
  Container,
  ExpandableSection,
  Form,
  FormField,
  Grid,
  Input,
  SegmentedControl,
  SpaceBetween,
  Spinner,
  TextContent,
  Textarea,
} from '@cloudscape-design/components';
import ContentLayout from '@cloudscape-design/components/content-layout';
import Header from '@cloudscape-design/components/header';
import { DistanceStrategy, useSimilaritySearch } from 'api-typescript-react-query-hooks';
import { useCallback, useState } from 'react';
import CodeEditor from '../../components/code-editor';

export const CorpusSearch: React.FC = () => {
  const [query, setQuery] = useState<string>('');
  const [count, setCount] = useState<number>(5);
  const [filter, setFilter] = useState<object>({});
  const [duration, setDuration] = useState<number>();
  const [distanceStrategy, setDistanceStrategy] = useState<DistanceStrategy>('l2');
  const search = useSimilaritySearch({
    onSuccess: () => {
      setDuration;
    },
  });

  const onSubmit = useCallback(async () => {
    const _start = Date.now();
    setDuration(undefined);
    await search.mutateAsync({
      withScore: true,
      similaritySearchRequestContent: {
        query,
        filter,
        distanceStrategy,
        k: count,
      },
    });
    setDuration((Date.now() - _start) / 1000);
  }, [search, query, filter, count, setDuration]);

  return (
    <ContentLayout
      header={
        <Header variant="h1" description="Search the corpus for similar documents">
          Corpus Search
        </Header>
      }
    >
      <SpaceBetween direction="vertical" size="l">
        <Container>
          <Form
            actions={
              <SpaceBetween direction="horizontal" size="s">
                <Button onClick={onSubmit} loading={search.isLoading}>
                  Submit
                </Button>
              </SpaceBetween>
            }
          >
            <FormField label="Search Query" description="Enter the text used to search for similar documents">
              <Textarea value={query} onChange={({ detail }) => setQuery(detail.value)} />
            </FormField>

            <ExpandableSection headerText="Options" headerDescription="Adjust number of documents and filters">
              <SpaceBetween direction="vertical" size="m">
                <FormField
                  label="Number of Documents"
                  description="Enter the text used to search for similar documents"
                >
                  <Input
                    onChange={({ detail }) => setCount(parseInt(detail.value))}
                    value={String(count)}
                    inputMode="numeric"
                    type="number"
                  />
                </FormField>
                <FormField
                  label="Distance Strategy"
                  description="Modify the strategy used for search relevance"
                  constraintText="Only the default strategy is indexed, so expect latency increases with other options"
                >
                  <SegmentedControl
                    selectedId={distanceStrategy}
                    onChange={({ detail }) => setDistanceStrategy(detail.selectedId as DistanceStrategy)}
                    options={[
                      { text: 'Euclidean', id: 'l2' },
                      { text: 'Cosine', id: 'cosine' },
                      { text: 'Inner', id: 'inner' },
                    ]}
                  />
                </FormField>
                <FormField label="Filter" description="Enter filter object to narrow search">
                  <CodeEditor
                    value={JSON.stringify(filter, null, 2)}
                    onDelayedChange={({ detail }) => {
                      try {
                        setFilter(JSON.parse(detail.value));
                      } catch {}
                    }}
                    language="json"
                    editorContentHeight={250}
                  />
                </FormField>
              </SpaceBetween>
            </ExpandableSection>
          </Form>
        </Container>

        <Box variant="div">
          <Header
            counter={duration ? `(${search.data?.documents.length || 0} documents in ${duration} seconds)` : undefined}
          >
            Results
          </Header>
          <br />
          {search.isLoading && <Spinner />}

          {search.error && (
            <Alert type="error" header="Error">
              <code>{search.error.message}</code>
            </Alert>
          )}

          <SpaceBetween direction="vertical" size="m">
            {search.data?.documents.map((document, i) => (
              <Container
                key={i}
                header={
                  <Header variant="h3" description={`Score: ${document.score} (distance)`}>
                    Document {i + 1}
                  </Header>
                }
                footer={
                  <ExpandableSection headerText="Metadata" variant="footer">
                    <Grid>
                      {Object.entries(document.metadata).map(([label, value], j) => (
                        <div key={j}>
                          <Box variant="awsui-key-label">{label}</Box>
                          <div>{String(value)}</div>
                        </div>
                      ))}
                    </Grid>
                  </ExpandableSection>
                }
              >
                <TextContent>
                  <div style={{ whiteSpace: 'pre-wrap' }}>{document.pageContent}</div>
                </TextContent>
              </Container>
            ))}
          </SpaceBetween>
        </Box>
      </SpaceBetween>
    </ContentLayout>
  );
};

export default CorpusSearch;

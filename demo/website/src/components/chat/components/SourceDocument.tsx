/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import { Box, Container, ExpandableSection, Grid, Header, TextContent } from '@cloudscape-design/components';
import { Document } from 'api-typescript-react-query-hooks';
import { FC } from 'react';

export const SourceDocument: FC<{ title: string; document: Document }> = ({ title, document }) => {
  const scoreText = document.score != null ? `Score: ${document.score} (distance)` : undefined;

  return (
    <Container
      header={
        <Header variant="h3" description={scoreText}>
          {title}
        </Header>
      }
      footer={
        <ExpandableSection headerText="Metadata" variant="footer">
          <Grid>
            {Object.entries(document.metadata).map(([label, value], i) => (
              <div key={i}>
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
  );
};

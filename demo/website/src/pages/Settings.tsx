/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */

import { FormField, Input } from '@cloudscape-design/components';
import Box from '@cloudscape-design/components/box';
import Button from '@cloudscape-design/components/button';
import ColumnLayout from '@cloudscape-design/components/column-layout';
import Container from '@cloudscape-design/components/container';
import ContentLayout from '@cloudscape-design/components/content-layout';
import Header from '@cloudscape-design/components/header';
import Link from '@cloudscape-design/components/link';
import SpaceBetween from '@cloudscape-design/components/space-between';
import Textarea from '@cloudscape-design/components/textarea';
import { ReactNode } from 'react';

// import * as api from "api-typescript-react-query-hooks";
const ValueWithLabel = ({ label, children }: { label: string; children?: ReactNode }) => (
  <div>
    <Box variant="awsui-key-label">{label}</Box>
    <div>{children}</div>
  </div>
);
/**
 * Component to render the home "/" route.
 */
const Settings: React.FC = () => {
  return (
    <ContentLayout
      header={
        <Header
          variant="h1"
          info={<Link>Info</Link>}
          description="Settings and status of current Research Assistant deployments"
          actions={
            <Button iconName="add-plus" variant="primary">
              Start New
            </Button>
          }
        >
          Research Assistant Settings
        </Header>
      }
    >
      <SpaceBetween size="l" direction="vertical">
        <Container
          header={
            <Header
              variant="h2"
              description="System monitoring panel"
              actions={
                <Button iconName="add-plus" variant="primary">
                  Update Now
                </Button>
              }
            >
              Research Assistant Settings
            </Header>
          }
        >
          <ColumnLayout columns={2} borders="vertical">
            <SpaceBetween size="l">
              <ValueWithLabel label="Active LLM Name">Flan T5 - XXL</ValueWithLabel>
              <ValueWithLabel label="Source Corpus Size">2G</ValueWithLabel>
            </SpaceBetween>
            <SpaceBetween size="l">
              <ValueWithLabel label="Last Source Update">12:00am - 01/06/2023</ValueWithLabel>
              <ValueWithLabel label="Last Update Duration">00:23:57</ValueWithLabel>
            </SpaceBetween>
          </ColumnLayout>
        </Container>
        <Container
          header={
            <Header
              variant="h3"
              description="S3 bucket URL for RAG source corpus"
              info={<Link>Info</Link>}
              actions={<Button variant="primary">Update</Button>}
            >
              Reference Content Corpus Location
            </Header>
          }
        >
          <FormField stretch>
            <Input value={''}></Input>
          </FormField>
        </Container>
        <Container
          header={
            <Header
              variant="h3"
              description="Requirements and constraints for the field."
              info={<Link>Info</Link>}
              actions={<Button variant="primary">Update</Button>}
            >
              Writing Session Prompt
            </Header>
          }
        >
          <Textarea value="" />
        </Container>
      </SpaceBetween>
    </ContentLayout>
  );
};

export default Settings;

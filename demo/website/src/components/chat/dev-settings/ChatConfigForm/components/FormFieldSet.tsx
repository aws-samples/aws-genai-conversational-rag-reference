/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import { FormField, FormFieldProps, SpaceBetween } from '@cloudscape-design/components';
import { FC } from 'react';

export const FormFieldSet: FC<FormFieldProps> = ({ children, ...props }) => {
  return (
    <FormField {...props}>
      <div
        style={{
          padding: 10,
          borderLeft: '2px solid #e1e1e1',
          borderRadius: 10,
        }}
      >
        <SpaceBetween direction="vertical" size="s">
          {children}
        </SpaceBetween>
      </div>
    </FormField>
  );
};

/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import {
  Button,
  Popover,
  StatusIndicator,
} from "@cloudscape-design/components";

type CopyTextProps = {
  children?: React.ReactNode;
  textToCopy: string;
  contentName: string;
};

function CopyText(props: CopyTextProps) {
  return (
    <div style={{ display: "flex", flexDirection: "row" }}>
      {props.children}
      <Popover
        size="small"
        position="left"
        triggerType="custom"
        dismissButton={false}
        content={
          <StatusIndicator type="success">
            {props.contentName} copied
          </StatusIndicator>
        }
      >
        <Button
          variant="inline-icon"
          iconName="copy"
          ariaLabel="Copy text"
          onClick={(): void => {
            navigator.clipboard.writeText(props.textToCopy) as Promise<void>;
          }}
        />
      </Popover>
    </div>
  );
}
export default CopyText;

/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import { Spinner } from "@cloudscape-design/components";
import Button from "@cloudscape-design/components/button";
import Input from "@cloudscape-design/components/input";

import { useState, useEffect } from "react";

type InlineEditorProps = {
  children: string;
  onChange: (value: string) => void;
  loading?: boolean;
};

export default function InlineEditor({
  children,
  onChange,
  loading,
}: InlineEditorProps) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(children);
  useEffect(() => {
    setValue(children);
  }, [children]);
  return (
    <div style={{ display: "flex" }}>
      {editing ? (
        <>
          <Input
            onChange={({ detail }) => setValue(detail.value)}
            value={value}
          />
          <Button
            iconName="status-positive"
            variant="inline-icon"
            onClick={() => {
              setEditing(false);
              onChange(value);
            }}
          />
          <Button
            iconName="status-negative"
            variant="inline-icon"
            onClick={() => setEditing(false)}
          />
        </>
      ) : (
        <>
          {children}
          <Button
            iconName="edit"
            variant="inline-icon"
            onClick={() => setEditing(true)}
          />
          {loading && <Spinner size="normal" />}
        </>
      )}
    </div>
  );
}

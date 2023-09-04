/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
type SplitPanelProps = {
  children: React.ReactNode;
  panel: React.ReactNode;
  panelWidth?: string;
  style?: React.HTMLAttributes<HTMLDivElement>["style"];
  margin: string;
};

export default function SplitPanel({
  children,
  panel,
  style,
  panelWidth = "auto",
  margin = "14px",
}: SplitPanelProps) {
  return (
    <div style={{ display: "flex", ...style }}>
      <div style={{ width: panelWidth, paddingRight: margin }}>{panel}</div>
      <div
        style={{
          flex: 1,
          borderLeft: "1px solid #ddd",
          paddingLeft: margin,
        }}
      >
        {children}
      </div>
    </div>
  );
}

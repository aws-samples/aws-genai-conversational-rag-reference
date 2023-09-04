/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */

import { Meta, StoryObj } from "@storybook/react";
import SplitPanel from "../SplitPanel";

const meta: Meta<typeof SplitPanel> = {
  title: "Layout/Split Panel",
  component: SplitPanel,
};
export default meta;
type Story = StoryObj<typeof SplitPanel>;

export const Base: Story = {
  args: {
    style: { border: "black 1px solid" },
    panel: <div style={{ backgroundColor: "green" }}>Panel</div>,
    children: <div style={{ backgroundColor: "lightblue" }}>Main</div>,
  },
};

export const AutoPanelWidth: Story = {
  args: {
    style: { border: "black 1px solid" },
    panel: (
      <div style={{ backgroundColor: "green", width: "300px" }}>Panel</div>
    ),
    children: <div style={{ backgroundColor: "lightblue" }}>Main</div>,
  },
};

export const MinPanelWidth: Story = {
  args: {
    style: { border: "black 1px solid" },
    panel: <div style={{ backgroundColor: "green" }}>Panel</div>,
    panelWidth: "300px",
    children: <div style={{ backgroundColor: "lightblue" }}>Main</div>,
  },
};

export const MinPanelWidthNoBg: Story = {
  args: {
    panel: <div>Panel</div>,
    panelWidth: "300px",
    children: <div>Main</div>,
  },
};

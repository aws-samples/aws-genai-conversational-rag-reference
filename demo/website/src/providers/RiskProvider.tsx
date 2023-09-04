/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import Flashbar, {
  FlashbarProps,
} from "@cloudscape-design/components/flashbar";
import { FC, useState } from "react";
import { useLocalStorage } from "usehooks-ts";
import { useRuntimeConfig } from "../Auth";

export const RiskProvider: FC<React.PropsWithChildren> = ({ children }) => {
  const { dataSovereigntyRisk } = useRuntimeConfig();
  const [isDataSovereigntyAcknowledged, setIsDataSovereigntyAcknowledged] =
    useLocalStorage("risks.data-sovereignty.acknowledged", false);

  const [items, setItems] = useState(() => {
    const _items: FlashbarProps.MessageDefinition[] = [];
    dataSovereigntyRisk &&
      !isDataSovereigntyAcknowledged &&
      _items.push({
        type: "warning",
        header: "Data Sovereignty Risk",
        dismissible: true,
        dismissLabel: "Dismiss",
        onDismiss: () => {
          setItems([]);
          setIsDataSovereigntyAcknowledged(true);
        },
        content: (
          <>
            The foundations models for this service have been deployed to a
            different region than primary application. This may pose compliance
            concerns depending on your country and the data being used within
            this solution.
          </>
        ),
        id: "dataSovereigntyRisk",
      });
    return _items;
  });

  return (
    <>
      {dataSovereigntyRisk && <Flashbar items={items} />}
      {children}
    </>
  );
};

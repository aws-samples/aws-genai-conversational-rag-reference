/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import { Button } from "@cloudscape-design/components";
import { ChatMessage } from "api-typescript-react-query-hooks";
import CopyText from "../../buttons/CopyText";

type MessageProps = {
  message: ChatMessage;
};

export default function Message({ message }: MessageProps) {
  let headerText = message.type === "human" ? "You" : "Assistant";
  const aiStyle: React.HTMLAttributes<HTMLDivElement>["style"] =
    message.type === "ai"
      ? {
          justifySelf: "flex-end",
          alignItems: "flex-end",
        }
      : {};
  const time = new Date(message.createdAt).toLocaleTimeString();
  return (
    <div
      style={{
        padding: "15px 10px",
        display: "flex",
        flexDirection: "column",
        gap: "5px",
        alignItems: "flex-start",
        ...aiStyle,
      }}
    >
      <div
        style={{
          width: "100%",
          display: "flex",
          // flexDirection: message.type === "human" ? "row" : "row-reverse",
          fontSize: "0.9em",
          justifyContent: "flex-start",
          gap: "8px",
        }}
      >
        <span style={{ fontWeight: "bold" }}>{headerText}</span>
        <span style={{ color: "#aaa" }}>{time}</span>
      </div>
      <div
        style={{
          background: message.type === "human" ? "#fff" : "#C9E6FA",
          padding: "8px 12px",
          borderRadius:
            message.type === "human" ? "0 10px 10px 10px" : "10px 0 10px 10px",
        }}
      >
        {message.text}
      </div>
      <div
        style={{
          display: "flex",
          width: "100%",
          // flexDirection: message.type === "human" ? "row" : "row-reverse",
          justifyContent: "flex-start",
          fontSize: "0.8em",
        }}
      >
        <CopyText textToCopy={message.text} contentName="Message" />
        {message.type === "ai" && (
          <Button iconName="status-info" variant="inline-icon" />
        )}
        <Button iconName="delete-marker" variant="inline-icon" />
      </div>
    </div>
  );
}

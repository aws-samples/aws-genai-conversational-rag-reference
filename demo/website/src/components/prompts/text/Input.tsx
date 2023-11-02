/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import Textarea from '@cloudscape-design/components/textarea';

type TextPromptInputProps = {
  text: string;
  onSend: (text: string) => void;
};

export default function TextPromptInputProps({ text = '', onSend }: TextPromptInputProps) {
  return <Textarea onChange={({ detail }) => onSend(detail.value)} value={text} placeholder="Prompt" />;
}

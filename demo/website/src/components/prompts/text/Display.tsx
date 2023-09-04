/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
type TextPromptDisplayProps = {
  text: string;
};

export default function TextPromptDisplayProps({
  text = "",
}: TextPromptDisplayProps) {
  return <p>{text}</p>;
}

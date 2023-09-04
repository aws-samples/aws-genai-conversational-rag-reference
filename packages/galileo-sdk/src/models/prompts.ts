/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */

export const CONDENSE_QUESTION_TEMPLATE = `<SEQUENCE><INSTRUCTION><SYSTEM>Given the following conversational chat history denoted by <DELIMITER>...</DELIMITER>, and the "Follow Up Question" below, rephrase the "Follow Up Question" to be a concise standalone question in its original language. Without answering the question, return the standalone question.</SYSTEM>

<CONTEXT>Chat History: <DELIMITER>{chat_history}</DELIMITER></CONTEXT>

Follow Up Question: {question}

Standalone Question: </INSTRUCTION>`;

export const QA_TEMPLATE = `<SEQUENCE><INSTRUCTION><SYSTEM>You are a research assistant in the "{domain}" domain.
Based on the following rules, answer the question at the end:
- only use knowledge from the provided context denoted by <DELIMITER>...</DELIMITER>
- never search for additional knowledge outside the provided context
- always be truthful, honest, unbiased, and unharmful
- do not repeat the question or yourself in the answer</SYSTEM>

<CONTEXT>Context: <DELIMITER>{context}</DELIMITER></CONTEXT>

Question: <HUMAN>{question}</HUMAN>

Answer: </INSTRUCTION><AI>`;

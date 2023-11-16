# Overrides (Hacks)

This folder providers temporary helpers to override default stuff in the application. As we work on more robust solutions for configuring and persisting configs throughout, we still need an easy way to test and demo configs consistently, hence this dir.

## Chat Engine Config

The chat engine config defines the runtime settings for the chat engine. When you use the "Chat Settings" in the website UI, you can copy/paste the those config settings into overrides dir as `chat-engine-config.json` file and redeploy. After that those will become the defaults for all chats.

1. Open UI and got to the chat which has the setting you want to make the defaults
2. Open the "Chat Settings" panel on the bottom
3. Click the settings menu (⠇), and choose "copy" action
4. That will copy your current settings to the clipboard
5. Create a new file at `demo/overrides/chat-engine-config.json`
6. Paste the clipboard value into that file and save
7. Now run cdk deployment (including synth) as normal... from the cli is ok too

This file also needs to be added to `demo/website/public/chat-engine-config.json`, to ensure "Chat Settings" default in the UI match this. The website build will check for this file and copy it if exists.

> ATTENTION: if you are using multiple LLMs that have different model adaptor prompt settings, the above will prevent the engine from dynamically resolve prompts for those engines, and all prompts defined in the config be used as the defaults.
> - Settings provided by users in the "Chat Settings" UI will still override these values though

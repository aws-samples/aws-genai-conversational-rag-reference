/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import { NorthStarThemeProvider } from '@aws-northstar/ui';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import Auth from './Auth';
import { ApiProvider } from './providers/ApiProvider';
import { AppLayoutProvider } from './providers/AppLayoutProvider';
import ChatEngineConfigProvider from './providers/ChatEngineConfig';
import { FlagsProvider } from './providers/FlagsProvider';
import reportWebVitals from './reportWebVitals';
import './styles.css';

if (process.env.REACT_APP_ENABLE_MOCKS) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { worker } = require('./mocks/browser');
  worker.start({
    onUnhandledRequest: 'bypass',
  });
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <NorthStarThemeProvider>
      <BrowserRouter>
        <Auth>
          <FlagsProvider>
            <ApiProvider>
              <AppLayoutProvider>
                <ChatEngineConfigProvider>
                  <App />
                </ChatEngineConfigProvider>
              </AppLayoutProvider>
            </ApiProvider>
          </FlagsProvider>
        </Auth>
      </BrowserRouter>
    </NorthStarThemeProvider>
  </React.StrictMode>,
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();

/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import { useCognitoAuthContext } from "@aws-northstar/ui";
import AppLayout from "@aws-northstar/ui/components/AppLayout";
import { SideNavigationProps } from "@cloudscape-design/components";
import { Navigate, Route, Routes } from "react-router-dom";
import { useAppUser } from "./Auth";
import Config from "./config.json";
import Chat from "./pages/Chat";
import Settings from "./pages/Settings";
import { RiskProvider } from "./providers/RiskProvider";

/**
 * Define your nav items here.
 */
const SIDEBAR_NAVIGATION_ITEMS: SideNavigationProps.Item[] = [
  {
    text: "Chat",
    type: "link",
    href: "/chat",
  },
  // TODO: enable settings once we implement it
  // {
  //   text: "Settings",
  //   type: "link",
  //   href: "/settings",
  // },
];

/**
 * Defines the App layout and contains logic for routing.
 */
const App: React.FC = () => {
  const { getAuthenticatedUser } = useCognitoAuthContext();
  const user = useAppUser();

  return (
    <AppLayout
      minContentWidth={800}
      title={Config.applicationName}
      logo="/logo512.png"
      defaultBreadcrumb="Research Assistant"
      navigationItems={SIDEBAR_NAVIGATION_ITEMS}
      notifications={<RiskProvider />}
      onSignout={() =>
        new Promise(() => {
          getAuthenticatedUser && getAuthenticatedUser()?.signOut();
          window.location.href = "/";
        })
      }
      user={user}
    >
      <Routes>
        <Route path={"/chat"} element={<Chat />}>
          <Route path={":id"} element={<Chat />} />
        </Route>
        <Route path={"/settings"} element={<Settings />} />
        <Route path={"/"} element={<Navigate to="/chat" replace />} />
      </Routes>
    </AppLayout>
  );
};

export default App;

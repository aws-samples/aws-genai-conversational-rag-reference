/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import { last } from 'lodash';
import {
  FC,
  PropsWithChildren,
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useDebounce } from 'usehooks-ts';

export type Content = ReactNode;
export type ManagedAppLayoutContent = [uuid: string, content: Content];
export type ManagedAppLayoutContentList = ManagedAppLayoutContent[];

export interface IManagedAppLayoutContentContext {
  active: Content | undefined;
  addContent: (uuid: string, content: Content) => void;
  removeContent: (uuid: string) => void;
}

export function managedContentFactory<
  Props extends PropsWithChildren,
  TProps extends PropsWithChildren<{ uuid: string }> = Props & { uuid: string },
>(Component: React.ComponentType<Props>) {
  const Context = createContext<IManagedAppLayoutContentContext | undefined>(undefined);

  const Provider: FC<PropsWithChildren> = ({ children }) => {
    const [items, setItems] = useState<ManagedAppLayoutContentList>([]);

    const addContent = useCallback(
      (uuid: string, content: Content) => {
        setItems((current) => {
          if (current.find(([_uuid]) => _uuid === uuid)) {
            // ignore - already registered
            return current;
          } else {
            return current.concat([[uuid, content]]);
          }
        });
      },
      [setItems],
    );

    const removeContent = useCallback(
      (uuid: string) => {
        setItems((current) => current.filter(([_uuid]) => _uuid !== uuid));
      },
      [setItems],
    );

    const active = useDebounce<ManagedAppLayoutContent | undefined>(last(items), 50);
    const [activeUUID, activeNode] = active || [];
    const context = useMemo<IManagedAppLayoutContentContext>(
      () => ({
        active: activeNode,
        addContent,
        removeContent,
      }),
      [activeUUID],
    );

    return <Context.Provider value={context}>{children}</Context.Provider>;
  };

  function useHook() {
    const context = useContext(Context);
    if (context == null) {
      throw new Error('Must wrap in provider');
    }
    return context;
  }

  const ManagedItemComponent: FC<TProps> = ({ uuid, ...props }) => {
    const { addContent, removeContent } = useHook();
    const content = useMemo(
      // @ts-ignore
      () => <Component {...(props as unknown as Props)} />,
      [uuid, props],
    );

    useEffect(() => {
      addContent(uuid, content);

      return () => removeContent(uuid);
    }, [uuid, props]);

    // This component never directly renders, it just adds the content to help stack which
    // shows the most contextual help (the last help)
    return null;
  };

  return {
    Context,
    Provider,
    Hook: useHook,
    ManagedItemComponent,
  };
}

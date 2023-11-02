/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import { Button, ButtonProps, Modal, ModalProps } from '@cloudscape-design/components';
import { FC, PropsWithChildren, useState } from 'react';

export interface ModalButtonProps {
  readonly modal: Omit<ModalProps, 'visible' | 'children'>;
  readonly button: Omit<ButtonProps, 'onClick'>;
}

export const ModalButton: FC<PropsWithChildren<ModalButtonProps>> = ({ children, modal, button }) => {
  const [visisble, setVisible] = useState(false);

  return (
    <>
      <Button {...button} onClick={() => setVisible(true)} />
      <Modal {...modal} visible={visisble} onDismiss={() => setVisible(false)}>
        {children}
      </Modal>
    </>
  );
};

import { screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import * as toast from 'react-hot-toast';
import { describe, expect, it, vi } from 'vitest';

import { NavigationMenuWidth } from './consts.tsx';
import { NavigationMenu } from './navigation-menu.tsx';
import { renderWithContext } from '../../../test/render-with-context.tsx';
import * as contextHooks from '../../hooks/context.tsx';
import * as logoutHooks from '../../hooks/use-logout.tsx';
import { AboutModal } from '../modals/about.tsx';
import { CheatsModal } from '../modals/cheats.tsx';
import { ControlsModal } from '../modals/controls.tsx';
import { DownloadSaveModal } from '../modals/download-save.tsx';
import { FileSystemModal } from '../modals/file-system.tsx';
import { LegalModal } from '../modals/legal.tsx';
import { LoadLocalRomModal } from '../modals/load-local-rom.tsx';
import { LoadRomModal } from '../modals/load-rom.tsx';
import { LoadSaveModal } from '../modals/load-save.tsx';
import { LoginModal } from '../modals/login.tsx';
import { SaveStatesModal } from '../modals/save-states.tsx';
import { UploadCheatsModal } from '../modals/upload-cheats.tsx';
import { UploadRomToServerModal } from '../modals/upload-rom-to-server.tsx';
import { UploadRomModal } from '../modals/upload-rom.tsx';
import { UploadSaveToServerModal } from '../modals/upload-save-to-server.tsx';
import { UploadSavesModal } from '../modals/upload-saves.tsx';

import type { GBAEmulator } from '../../emulator/mgba/mgba-emulator.tsx';

vi.mock('modern-screenshot', () => ({
  domToPng: () => Promise.resolve('dataurl')
}));

describe('<NavigationMenu />', () => {
  it('renders menu and dismiss buttons', () => {
    renderWithContext(<NavigationMenu />);

    expect(screen.getByRole('list', { name: 'Menu' })).toBeInTheDocument();
    expect(screen.getByLabelText('Menu Toggle')).toBeInTheDocument();
    expect(screen.getByLabelText('Menu Dismiss')).toBeInTheDocument();
  });

  it('toggles menu with button', async () => {
    renderWithContext(<NavigationMenu />);

    expect(screen.getByTestId('menu-wrapper')).toHaveStyle(`left: 0`);
    expect(screen.getByLabelText('Menu Toggle')).toHaveStyle(
      `left: ${NavigationMenuWidth - 6}px`
    );
    expect(screen.getByLabelText('Menu Dismiss')).toBeInTheDocument();

    await userEvent.click(screen.getByLabelText('Menu Toggle'));

    expect(screen.getByTestId('menu-wrapper')).toHaveStyle(
      `left: -${NavigationMenuWidth + 5}px`
    );
    expect(screen.getByLabelText('Menu Toggle')).toHaveStyle('left: -8px');
    expect(screen.queryByLabelText('Menu Dismiss')).not.toBeInTheDocument();

    await userEvent.click(screen.getByLabelText('Menu Toggle'));

    expect(screen.getByTestId('menu-wrapper')).toHaveStyle(`left: 0`);
    expect(screen.getByLabelText('Menu Toggle')).toHaveStyle(
      `left: ${NavigationMenuWidth - 6}px`
    );
    expect(screen.getByLabelText('Menu Dismiss')).toBeInTheDocument();
  });

  it('dismisses menu with overlay', async () => {
    renderWithContext(<NavigationMenu />);

    expect(screen.getByTestId('menu-wrapper')).toHaveStyle(`left: 0`);
    expect(screen.getByLabelText('Menu Toggle')).toHaveStyle(
      `left: ${NavigationMenuWidth - 6}px`
    );
    expect(screen.getByLabelText('Menu Dismiss')).toBeInTheDocument();

    await userEvent.click(screen.getByLabelText('Menu Dismiss'));

    expect(screen.getByTestId('menu-wrapper')).toHaveStyle(
      `left: -${NavigationMenuWidth + 5}px`
    );
    expect(screen.getByLabelText('Menu Toggle')).toHaveStyle('left: -8px');
    expect(screen.queryByLabelText('Menu Dismiss')).not.toBeInTheDocument();
  });

  describe('menu nodes', () => {
    it.each([
      ['About', <AboutModal />],
      ['Upload Saves', <UploadSavesModal />],
      ['Upload Cheats', <UploadCheatsModal />],
      ['Upload Rom', <UploadRomModal />],
      ['Load Local Rom', <LoadLocalRomModal />],
      ['Controls', <ControlsModal />],
      ['File System', <FileSystemModal />],
      ['Legal', <LegalModal />],
      ['Login', <LoginModal />]
    ])('%s opens modal on click', async (title, expected) => {
      const setIsModalOpenSpy = vi.fn();
      const setModalContextSpy = vi.fn();
      const { useModalContext: original } = await vi.importActual<
        typeof contextHooks
      >('../../hooks/context.tsx');

      vi.spyOn(contextHooks, 'useModalContext').mockImplementation(() => ({
        ...original(),
        setModalContent: setModalContextSpy,
        setIsModalOpen: setIsModalOpenSpy
      }));

      renderWithContext(<NavigationMenu />);

      const menuNode = screen.getByText(title);

      expect(menuNode).toBeInTheDocument();

      await userEvent.click(menuNode);

      expect(setModalContextSpy).toHaveBeenCalledWith(expected);
      expect(setIsModalOpenSpy).toHaveBeenCalledWith(true);
    });

    it.each([
      ['Download Save', <DownloadSaveModal />],
      ['Manage Save States', <SaveStatesModal />],
      ['Manage Cheats', <CheatsModal />]
    ])(
      '%s opens modal on click with running emulator',
      async (title, expected) => {
        const setIsModalOpenSpy = vi.fn();
        const setModalContextSpy = vi.fn();
        const {
          useModalContext: originalModal,
          useEmulatorContext: originalEmulator
        } = await vi.importActual<typeof contextHooks>(
          '../../hooks/context.tsx'
        );

        vi.spyOn(contextHooks, 'useModalContext').mockImplementation(() => ({
          ...originalModal(),
          setModalContent: setModalContextSpy,
          setIsModalOpen: setIsModalOpenSpy
        }));

        vi.spyOn(contextHooks, 'useEmulatorContext').mockImplementation(() => ({
          ...originalEmulator(),
          isEmulatorRunning: true
        }));

        renderWithContext(<NavigationMenu />);

        const menuNode = screen.getByText(title);

        expect(menuNode).toBeInTheDocument();

        await userEvent.click(menuNode);

        expect(setModalContextSpy).toHaveBeenCalledWith(expected);
        expect(setIsModalOpenSpy).toHaveBeenCalledWith(true);
      }
    );

    it('Quick Reload calls emulator on click when running', async () => {
      const quickReloadSpy: () => void = vi.fn();
      const { useEmulatorContext: originalEmulator } = await vi.importActual<
        typeof contextHooks
      >('../../hooks/context.tsx');

      vi.spyOn(contextHooks, 'useEmulatorContext').mockImplementation(() => ({
        ...originalEmulator(),
        isEmulatorRunning: true,
        emulator: {
          quickReload: quickReloadSpy
        } as GBAEmulator
      }));

      renderWithContext(<NavigationMenu />);

      const menuNode = screen.getByText('Quick Reload');

      expect(menuNode).toBeInTheDocument();

      await userEvent.click(menuNode);

      expect(quickReloadSpy).toHaveBeenCalledOnce();
    });

    it('Screenshot calls emulator screenshot and downloads file', async () => {
      const screenShotSpy: (cb: () => void) => void = vi.fn((cb) => cb());
      const { useEmulatorContext: originalEmulator } = await vi.importActual<
        typeof contextHooks
      >('../../hooks/context.tsx');

      vi.spyOn(contextHooks, 'useEmulatorContext').mockImplementation(() => ({
        ...originalEmulator(),
        emulator: {
          screenShot: screenShotSpy,
          getCurrentGameName: () => '/some_rom.gba'
        } as GBAEmulator,
        isEmulatorRunning: true,
        canvas: {} as HTMLCanvasElement
      }));

      const anchorClickSpy = vi
        .spyOn(HTMLAnchorElement.prototype, 'click')
        .mockReturnValue();
      const anchorRemoveSpy = vi.spyOn(HTMLAnchorElement.prototype, 'remove');

      renderWithContext(<NavigationMenu />);

      const menuNode = screen.getByText('Screenshot');

      expect(menuNode).toBeInTheDocument();

      await userEvent.click(menuNode);

      expect(screenShotSpy).toHaveBeenCalledOnce();
      expect(anchorClickSpy).toHaveBeenCalledOnce();
      expect(anchorRemoveSpy).toHaveBeenCalledOnce();
    });

    it('Screenshot toasts on exception', async () => {
      const { useEmulatorContext: originalEmulator } = await vi.importActual<
        typeof contextHooks
      >('../../hooks/context.tsx');

      vi.spyOn(contextHooks, 'useEmulatorContext').mockImplementation(() => ({
        ...originalEmulator(),
        emulator: {
          screenShot: (cb) => cb()
          // missing getCurrentGameName
        } as GBAEmulator,
        isEmulatorRunning: true,
        canvas: {} as HTMLCanvasElement
      }));

      const toastErrorSpy = vi.spyOn(toast.default, 'error');

      renderWithContext(<NavigationMenu />);

      const menuNode = screen.getByText('Screenshot');

      expect(menuNode).toBeInTheDocument();

      await userEvent.click(menuNode);

      expect(toastErrorSpy).toHaveBeenCalledWith('Screenshot has failed');
    });

    it('Full Screen requests canvas full screen on click when running', async () => {
      const requestFullScreenSpy: () => Promise<void> = vi.fn(() =>
        Promise.resolve(undefined)
      );
      const { useEmulatorContext: originalEmulator } = await vi.importActual<
        typeof contextHooks
      >('../../hooks/context.tsx');

      vi.spyOn(contextHooks, 'useEmulatorContext').mockImplementation(() => ({
        ...originalEmulator(),
        isEmulatorRunning: true,
        canvas: {
          requestFullscreen: requestFullScreenSpy
        } as HTMLCanvasElement
      }));

      renderWithContext(<NavigationMenu />);

      const menuNode = screen.getByText('Full Screen');

      expect(menuNode).toBeInTheDocument();

      await userEvent.click(menuNode);

      expect(requestFullScreenSpy).toHaveBeenCalledOnce();
    });

    it('Full Screen toasts on exception', async () => {
      const requestFullScreenSpy: () => Promise<void> = vi.fn(() =>
        Promise.reject(new Error(''))
      );
      const { useEmulatorContext: originalEmulator } = await vi.importActual<
        typeof contextHooks
      >('../../hooks/context.tsx');

      vi.spyOn(contextHooks, 'useEmulatorContext').mockImplementation(() => ({
        ...originalEmulator(),
        isEmulatorRunning: true,
        canvas: {
          requestFullscreen: requestFullScreenSpy
        } as HTMLCanvasElement
      }));

      const toastErrorSpy = vi.spyOn(toast.default, 'error');

      renderWithContext(<NavigationMenu />);

      const menuNode = screen.getByText('Full Screen');

      expect(menuNode).toBeInTheDocument();

      await userEvent.click(menuNode);

      expect(toastErrorSpy).toHaveBeenCalledWith(
        'Full screen request has failed'
      );
    });

    it('Logout fires logout request with authentication', async () => {
      const executeLogoutSpy = vi.fn();
      const { useAuthContext: originalAuth } = await vi.importActual<
        typeof contextHooks
      >('../../hooks/context.tsx');

      vi.spyOn(contextHooks, 'useAuthContext').mockImplementation(() => ({
        ...originalAuth(),
        isAuthenticated: () => true
      }));

      vi.spyOn(logoutHooks, 'useLogout').mockReturnValue({
        isLoading: false,
        error: false,
        execute: executeLogoutSpy
      });

      renderWithContext(<NavigationMenu />);

      const menuNode = screen.getByText('Logout');

      expect(menuNode).toBeInTheDocument();

      await userEvent.click(menuNode);

      expect(executeLogoutSpy).toHaveBeenCalledOnce();
    });

    it.each([
      ['Load Save (Server)', <LoadSaveModal />],
      ['Load Rom (Server)', <LoadRomModal />]
    ])(
      '%s opens modal on click with authentication',
      async (title, expected) => {
        const setIsModalOpenSpy = vi.fn();
        const setModalContextSpy = vi.fn();
        const { useModalContext: originalModal, useAuthContext: originalAuth } =
          await vi.importActual<typeof contextHooks>('../../hooks/context.tsx');

        vi.spyOn(contextHooks, 'useModalContext').mockImplementation(() => ({
          ...originalModal(),
          setModalContent: setModalContextSpy,
          setIsModalOpen: setIsModalOpenSpy
        }));

        vi.spyOn(contextHooks, 'useAuthContext').mockImplementation(() => ({
          ...originalAuth(),
          isAuthenticated: () => true
        }));

        renderWithContext(<NavigationMenu />);

        const menuNode = screen.getByText(title);

        expect(menuNode).toBeInTheDocument();

        await userEvent.click(menuNode);

        expect(setModalContextSpy).toHaveBeenCalledWith(expected);
        expect(setIsModalOpenSpy).toHaveBeenCalledWith(true);
      }
    );

    it.each([
      ['Send Save to Server', <UploadSaveToServerModal />],
      ['Send Rom to Server', <UploadRomToServerModal />]
    ])(
      '%s opens modal on click with authentication and running emulator',
      async (title, expected) => {
        const setIsModalOpenSpy = vi.fn();
        const setModalContextSpy = vi.fn();
        const {
          useModalContext: originalModal,
          useAuthContext: originalAuth,
          useEmulatorContext: originalEmulator
        } = await vi.importActual<typeof contextHooks>(
          '../../hooks/context.tsx'
        );

        vi.spyOn(contextHooks, 'useModalContext').mockImplementation(() => ({
          ...originalModal(),
          setModalContent: setModalContextSpy,
          setIsModalOpen: setIsModalOpenSpy
        }));

        vi.spyOn(contextHooks, 'useAuthContext').mockImplementation(() => ({
          ...originalAuth(),
          isAuthenticated: () => true
        }));

        vi.spyOn(contextHooks, 'useEmulatorContext').mockImplementation(() => ({
          ...originalEmulator(),
          isEmulatorRunning: true
        }));

        renderWithContext(<NavigationMenu />);

        const menuNode = screen.getByText(title);

        expect(menuNode).toBeInTheDocument();

        await userEvent.click(menuNode);

        expect(setModalContextSpy).toHaveBeenCalledWith(expected);
        expect(setIsModalOpenSpy).toHaveBeenCalledWith(true);
      }
    );
  });
});

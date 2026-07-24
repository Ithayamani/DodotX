import { Alert as RNAlert, Platform } from 'react-native';

type AlertButton = {
  text?: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
};

/**
 * React Native's Alert.alert renders nothing on web -- react-native-web has no native
 * dialog to hook into, so every error/confirmation message silently vanishes there
 * (confirmed: the failure path still runs, buttons' onPress never fires, but nothing
 * is shown). Drop-in replacement with the same call signature; falls back to
 * window.alert/window.confirm on web so `Alert.alert(...)` call sites don't change,
 * only their import source does.
 */
function alert(title: string, message?: string, buttons?: AlertButton[]): void {
  if (Platform.OS !== 'web') {
    RNAlert.alert(title, message, buttons);
    return;
  }

  const text = message ? `${title}\n\n${message}` : title;

  if (!buttons || buttons.length === 0) {
    window.alert(text);
    return;
  }

  if (buttons.length === 1) {
    window.alert(text);
    buttons[0].onPress?.();
    return;
  }

  // Two-plus buttons: treat as confirm/cancel, matching this codebase's only
  // multi-button pattern ([Cancel, destructive-confirm]). The 'cancel'-style button
  // maps to window.confirm's Cancel; the first non-cancel button maps to OK.
  const cancelButton = buttons.find((b) => b.style === 'cancel') || buttons[0];
  const confirmButton = buttons.find((b) => b !== cancelButton) || buttons[buttons.length - 1];

  if (window.confirm(text)) {
    confirmButton.onPress?.();
  } else {
    cancelButton.onPress?.();
  }
}

export const Alert = { alert };

import {NativeModules} from 'react-native';

export type InstalledApp = {
  label: string;
  packageName: string;
  /** file:// URI to a cached 128x128 PNG icon. */
  icon: string;
  /** Preinstalled and not uninstallable. */
  isSystem: boolean;
};

type InstalledAppsNative = {
  getInstalledApps: () => Promise<InstalledApp[]>;
  launchApp: (packageName: string) => Promise<boolean>;
  isDefaultLauncher: () => Promise<boolean>;
  openAppInfo: (packageName: string) => Promise<boolean>;
  uninstallApp: (packageName: string) => Promise<boolean>;
};

const InstalledApps: InstalledAppsNative | undefined =
  NativeModules.InstalledApps;

/** Lists every launchable app on the device (label, package name, icon). */
export async function getInstalledApps(): Promise<InstalledApp[]> {
  if (!InstalledApps?.getInstalledApps) {
    throw new Error('InstalledApps native module unavailable — rebuild the app.');
  }
  return InstalledApps.getInstalledApps();
}

/** Opens the given app by package name. */
export async function launchApp(packageName: string): Promise<void> {
  if (!InstalledApps?.launchApp) {
    throw new Error('InstalledApps native module unavailable — rebuild the app.');
  }
  await InstalledApps.launchApp(packageName);
}

/** Whether this app is currently the phone's Home (launcher). False on an
 * older build without the native method. */
export async function isDefaultLauncher(): Promise<boolean> {
  try {
    return (await InstalledApps?.isDefaultLauncher?.()) ?? false;
  } catch {
    return false;
  }
}

/** Opens Android's "App info" screen for the app. */
export async function openAppInfo(packageName: string): Promise<void> {
  if (!InstalledApps?.openAppInfo) {
    throw new Error('InstalledApps native module unavailable — rebuild the app.');
  }
  await InstalledApps.openAppInfo(packageName);
}

/** Opens the system uninstall confirmation for the app. */
export async function uninstallApp(packageName: string): Promise<void> {
  if (!InstalledApps?.uninstallApp) {
    throw new Error('InstalledApps native module unavailable — rebuild the app.');
  }
  await InstalledApps.uninstallApp(packageName);
}

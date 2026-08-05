import {NativeModules} from 'react-native';

export type InstalledApp = {
  label: string;
  packageName: string;
  /** file:// URI to a cached 128x128 PNG icon. */
  icon: string;
};

type InstalledAppsNative = {
  getInstalledApps: () => Promise<InstalledApp[]>;
  launchApp: (packageName: string) => Promise<boolean>;
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

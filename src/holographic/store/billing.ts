import {NativeModules} from 'react-native';
import {useBazaar} from '@cafebazaar/react-native-poolakey';
import {BAZAAR_RSA_PUBLIC_KEY, PREMIUM_SKU} from './config';

export {PREMIUM_SKU, useBazaar, BAZAAR_RSA_PUBLIC_KEY};

/** Whether the Poolakey native module is linked (app was rebuilt after adding it). */
export function isBillingAvailable(): boolean {
  return !!NativeModules.ReactNativePoolakey;
}

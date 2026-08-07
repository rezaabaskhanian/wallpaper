import React from 'react';
import {Pressable, StyleSheet, View} from 'react-native';
import {useBatteryLevel, usePowerState} from 'react-native-device-info';
import AppText from './AppText';
import DraggableWidget from './DraggableWidget';
import BatteryIcon from './BatteryIcon';
import BoltIcon from './BoltIcon';
import GearIcon from './GearIcon';
import {toFa} from './date';
import {useSettings} from './SettingsContext';
import {weatherIcon, type Weather} from './useWeather';

type Props = {
  onOpenSettings: () => void;
  /** When true (screen saver), hide the battery + settings gear group. */
  dream?: boolean;
  /** Live weather, fetched once and shared with WeatherEffects (see
   * HolographicHome); null when unavailable/disabled. */
  weather?: Weather | null;
};

/**
 * Top status row: air temperature pinned to the left, battery + settings gear
 * grouped on the right.
 */
export default function TopLeftBar({
  onOpenSettings,
  dream = false,
  weather = null,
}: Props) {
  const {settings, update} = useSettings();
  const batteryLevel = useBatteryLevel(); // 0..1 (null/-1 when unavailable)
  const {batteryState} = usePowerState();

  const hours24 = new Date().getHours();
  const isNight = weather ? weather.isNight : hours24 < 6 || hours24 >= 19;
  const temp = weather ? weather.temp : settings.manualTemp;
  const icon = weatherIcon(weather ? weather.code : 0, isNight);

  const batteryPct =
    batteryLevel != null && batteryLevel >= 0
      ? Math.round(batteryLevel * 100)
      : null;
  const isCharging = batteryState === 'charging' || batteryState === 'full';

  return (
    <View style={styles.bar}>
      {/* Left: weather / temperature (draggable in layout-edit mode) */}
      {settings.showWeather ? (
        <DraggableWidget
          offset={settings.weatherOffset}
          editing={settings.editLayout}
          onCommit={o => update('weatherOffset', o)}
          label="دما">
          <AppText style={styles.item}>
            {icon} {toFa(temp)}°
          </AppText>
        </DraggableWidget>
      ) : (
        <View />
      )}

      {/* Right: battery + settings (hidden while dreaming) */}
      {dream ? (
        <View />
      ) : (
        <View style={styles.right}>
          {batteryPct != null ? (
            <View style={styles.battery}>
              <BatteryIcon size={20} color="#ffffff" level={batteryPct} />
              <AppText style={styles.item}>{toFa(batteryPct)}٪</AppText>
              {isCharging ? <BoltIcon size={14} color="#ffffff" /> : null}
            </View>
          ) : null}

          <Pressable onPress={onOpenSettings} hitSlop={12} style={styles.gearBtn}>
            <GearIcon size={20} color="#eafffb" />
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    top: 52,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 300,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  battery: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  item: {
    color: '#f5e6b3',
    fontSize: 16,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowRadius: 8,
  },
  gearBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
});

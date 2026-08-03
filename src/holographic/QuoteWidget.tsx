import React, {useEffect, useState} from 'react';
import {AppState, StyleSheet} from 'react-native';
import AppText from './AppText';
import DraggableWidget from './DraggableWidget';
import {useSettings} from './SettingsContext';
import {getRandomQuote, QUOTES, type Quote} from './quotes';

/**
 * Bottom-center quote. Pulls a random line from the quotes DB and swaps it each
 * time the app returns to the foreground (i.e. when the screen is turned back
 * on / unlocked). Falls back to the user's custom lines from settings when the
 * quotes DB is empty.
 */
export default function QuoteWidget() {
  const {settings, update} = useSettings();
  const [quote, setQuote] = useState<Quote | null>(() => getRandomQuote());

  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') {
        setQuote(prev => getRandomQuote(prev?.id) ?? prev);
      }
    });
    return () => sub.remove();
  }, []);

  if (!settings.showQuote) {
    return null;
  }

  const hasDb = QUOTES.length > 0;
  const line1 = hasDb ? quote?.line1 : settings.quoteLine1;
  const line2 = hasDb ? quote?.line2 : settings.quoteLine2;

  return (
    <DraggableWidget
      style={styles.wrap}
      offset={settings.quoteOffset}
      editing={settings.editLayout}
      onCommit={o => update('quoteOffset', o)}
      label="متن پایین">
      {line1 ? <AppText style={styles.line1}>{line1}</AppText> : null}
      {line2 ? <AppText style={styles.line2}>{line2}</AppText> : null}
    </DraggableWidget>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 54,
    alignItems: 'center',
    zIndex: 150,
  },
  line1: {
    color: 'rgba(234,255,251,0.85)',
    fontSize: 15,
    marginBottom: 6,
    writingDirection: 'rtl',
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowRadius: 8,
  },
  line2: {
    color: '#f5e6b3',
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 0.5,
    writingDirection: 'rtl',
    textAlign: 'center',
    textShadowColor: 'rgba(212,175,55,0.55)',
    textShadowRadius: 16,
  },
});

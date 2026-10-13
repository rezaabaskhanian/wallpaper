import React, {useEffect, useState} from 'react';
import {ActivityIndicator, Pressable, StyleSheet, TextInput, View} from 'react-native';
import AppText from './AppText';
import {showAlert} from './AppAlert';
import {toFa} from './date';
import {requestNotificationPermission} from './occasionReminders';
import {fetchActivePoll, submitWallpaperRequest, votePoll, type Poll} from './store/feedback';

/**
 * Gallery front page: the open poll («دسته‌ی بعدی چی باشه؟») with live
 * percentages once voted, and a one-line «والپیپر خاصی می‌خوای؟» request box.
 * Both tell the user they'll be notified — and ask for the notification
 * permission right then, when it obviously makes sense.
 */
export function PollCard() {
  const [poll, setPoll] = useState<Poll | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetchActivePoll()
      .then(setPoll)
      .catch(() => setPoll(null));
  }, []);

  if (!poll) return null;
  const voted = !!poll.myOptionId;

  const vote = async (optionId: string) => {
    if (busy || optionId === poll.myOptionId) return;
    setBusy(true);
    try {
      const updated = await votePoll(poll.id, optionId);
      if (updated) setPoll(updated);
      if (!voted) {
        showAlert('رأیت ثبت شد ✅', 'وقتی برنده اضافه شد خبرت می‌کنیم.', {
          onDismiss: requestNotificationPermission,
        });
      }
    } catch (e) {
      showAlert('خطا', e instanceof Error ? e.message : 'رأی ثبت نشد.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.card}>
      <AppText style={styles.title}>{poll.question}</AppText>
      {poll.options.map(o => {
        const pct = poll.totalVotes ? Math.round((o.votes / poll.totalVotes) * 100) : 0;
        const mine = o.id === poll.myOptionId;
        return (
          <Pressable
            key={o.id}
            onPress={() => vote(o.id)}
            style={[styles.option, mine && styles.optionMine]}
            accessibilityRole="button"
            accessibilityState={{selected: mine}}>
            {voted ? <View style={[styles.bar, {width: `${pct}%`}]} /> : null}
            <AppText style={[styles.optionText, mine && styles.optionTextMine]}>
              {mine ? '✓ ' : ''}
              {o.title}
            </AppText>
            {voted ? <AppText style={styles.pct}>{toFa(pct)}٪</AppText> : null}
          </Pressable>
        );
      })}
      {busy ? <ActivityIndicator color="#8b5cf6" style={styles.busy} /> : null}
      <AppText style={styles.hint}>
        {voted ? 'می‌تونی رأیت رو عوض کنی.' : 'بزن تا رأی بدی؛ برنده به گالری اضافه می‌شه.'}
      </AppText>
    </View>
  );
}

export function RequestCard() {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const trimmed = text.trim();

  const send = async () => {
    if (trimmed.length < 2 || busy) return;
    setBusy(true);
    try {
      await submitWallpaperRequest(trimmed);
      setText('');
      showAlert('درخواستت رسید 🙌', 'وقتی آماده شد خبرت می‌کنیم.', {
        onDismiss: requestNotificationPermission,
      });
    } catch (e) {
      showAlert('خطا', e instanceof Error ? e.message : 'ارسال نشد.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.card}>
      <AppText style={styles.title}>والپیپر خاصی می‌خوای؟</AppText>
      <AppText style={styles.hint}>بنویس چی دوست داری؛ اضافه‌اش می‌کنیم و خبرت می‌کنیم.</AppText>
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="مثلاً ماشین اسپورت"
          placeholderTextColor="rgba(255,255,255,0.35)"
          maxLength={100}
          returnKeyType="send"
          onSubmitEditing={send}
        />
        <Pressable
          style={[styles.sendBtn, (trimmed.length < 2 || busy) && styles.sendBtnDisabled]}
          disabled={trimmed.length < 2 || busy}
          onPress={send}
          accessibilityRole="button">
          <AppText style={styles.sendText}>{busy ? '…' : 'بفرست'}</AppText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 12,
    marginTop: 18,
    padding: 14,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  title: {
    color: '#eafffb',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'right',
    writingDirection: 'rtl',
    marginBottom: 8,
  },
  option: {
    minHeight: 48,
    marginTop: 8,
    borderRadius: 12,
    paddingHorizontal: 14,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  optionMine: {borderColor: '#8b5cf6'},
  bar: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    backgroundColor: 'rgba(139, 92, 246, 0.28)',
  },
  optionText: {color: 'rgba(255,255,255,0.85)', fontSize: 15, writingDirection: 'rtl'},
  optionTextMine: {color: '#ffffff', fontWeight: '700'},
  pct: {color: '#c4b5fd', fontSize: 14, fontWeight: '700'},
  busy: {marginTop: 8},
  hint: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 13,
    textAlign: 'right',
    writingDirection: 'rtl',
    marginTop: 8,
  },
  inputRow: {flexDirection: 'row-reverse', gap: 8, marginTop: 10},
  input: {
    flex: 1,
    minHeight: 48,
    borderRadius: 12,
    paddingHorizontal: 12,
    color: '#eafffb',
    fontSize: 15,
    textAlign: 'right',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.25)',
  },
  sendBtn: {
    minHeight: 48,
    paddingHorizontal: 18,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7c3aed',
  },
  sendBtnDisabled: {opacity: 0.5},
  sendText: {color: '#ffffff', fontSize: 15, fontWeight: '700'},
});

import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, KeyboardAvoidingView, PanResponder, Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather } from '@expo/vector-icons';
import { addTask, deleteTask, filterTasks, toggleTask } from './src/tasks';

const STORAGE_KEY = '@focus-list/tasks-v1';
const THEME_KEY = '@focus-list/theme-v1';
const FILTERS = ['all', 'active', 'completed'];

const PALETTE = {
  light: { bg: '#f4f2fb', card: '#ffffff', border: '#e8e5f5', text: '#1d1a33', muted: '#8a86a6', accent: '#6b4eff', accentText: '#ffffff', chip: '#ece9ff', hero: '#6b4eff', heroTrack: 'rgba(255,255,255,0.3)', heroText: '#ffffff', heroMuted: '#e4dcff', danger: '#c62828' },
  dark: { bg: '#14131f', card: '#1f1d2e', border: '#2d2a42', text: '#f3f2fb', muted: '#9a97b3', accent: '#8b72ff', accentText: '#ffffff', chip: '#2b2850', hero: '#2b2658', heroTrack: '#413c7d', heroText: '#ffffff', heroMuted: '#c9c3ff', danger: '#ff9a8a' },
};

export default function App() {
  const [tasks, setTasks] = useState([]);
  const [title, setTitle] = useState('');
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [storageError, setStorageError] = useState(false);
  const [themePreference, setThemePreference] = useState(null);
  const [themeReady, setThemeReady] = useState(false);
  const [themeError, setThemeError] = useState(false);
  const writeQueue = useRef(Promise.resolve());
  const writeFailed = useRef(false);
  const themeWriteQueue = useRef(Promise.resolve());

  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY).then((saved) => {
      if (saved === 'light' || saved === 'dark') setThemePreference(saved);
    }).catch(() => {
      setThemeError(true);
    }).finally(() => {
      setThemeReady(true);
    });
  }, []);

  useEffect(() => {
    async function loadTasks() {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (!Array.isArray(parsed) || !parsed.every((task) =>
            task && typeof task.id === 'string' && typeof task.title === 'string' && typeof task.completed === 'boolean')) {
            throw new Error('Invalid saved tasks');
          }
          setTasks(parsed);
        }
      } catch {
        setStorageError(true);
      } finally {
        setLoading(false);
      }
    }
    loadTasks();
  }, []);

  useEffect(() => {
    if (loading || storageError) return;
    const value = JSON.stringify(tasks);
    writeQueue.current = writeQueue.current.then(async () => {
      if (!writeFailed.current) await AsyncStorage.setItem(STORAGE_KEY, value);
    }).catch(() => {
      writeFailed.current = true;
      setStorageError(true);
    });
  }, [tasks, loading, storageError]);

  // Light matches the reference design by default; a saved choice overrides it.
  const isDark = (themePreference ?? 'light') === 'dark';
  const t = isDark ? PALETTE.dark : PALETTE.light;
  const activeCount = tasks.filter((task) => !task.completed).length;
  const doneCount = tasks.length - activeCount;
  const progress = tasks.length === 0 ? 0 : Math.round((doneCount / tasks.length) * 100);
  const visibleTasks = filterTasks(tasks, filter);
  const todayLabel = new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  function toggleTheme() {
    const nextTheme = isDark ? 'light' : 'dark';
    setThemePreference(nextTheme);
    themeWriteQueue.current = themeWriteQueue.current.then(() => AsyncStorage.setItem(THEME_KEY, nextTheme)).then(() => {
      setThemeError(false);
    }).catch(() => {
      setThemeError(true);
    });
  }

  function handleAdd() {
    if (!title.trim()) return;
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setTasks((current) => addTask(current, title, id));
    setTitle('');
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: t.bg }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
          <View style={styles.topline}>
            <View style={[styles.avatar, { backgroundColor: t.chip }]}><Feather name="user" size={18} color={t.accent} /></View>
            <View style={styles.greeting}>
              <Text style={[styles.hello, { color: t.muted }]}>Focus List</Text>
              <Text style={[styles.today, { color: t.text }]}>{todayLabel}</Text>
            </View>
            <Pressable accessibilityRole="switch" accessibilityLabel="Dark mode" accessibilityState={{ checked: isDark, disabled: !themeReady }} aria-checked={isDark} onPress={toggleTheme} disabled={!themeReady} style={[styles.themeButton, { backgroundColor: t.card, borderColor: t.border }]}>
              <Feather name={isDark ? 'sun' : 'moon'} size={18} color={t.accent} />
            </Pressable>
          </View>

          <Text style={[styles.title, { color: t.text }]}>{'Make room for\nwhat matters.'}</Text>

          <View style={styles.bento}>
            <View style={[styles.heroCard, { backgroundColor: t.hero }]}>
              <View style={styles.heroTop}>
                <Text style={[styles.heroLabel, { color: t.heroMuted }]}>To do</Text>
                <View style={[styles.heroBadge, { backgroundColor: t.heroTrack }]}><Feather name="zap" size={14} color={t.heroText} /></View>
              </View>
              <Text style={[styles.heroNumber, { color: t.heroText }]}>{activeCount}</Text>
              <View style={[styles.track, { backgroundColor: t.heroTrack }]}>
                <View style={[styles.fill, { width: `${progress}%`, backgroundColor: t.heroText }]} />
              </View>
              <Text style={[styles.heroCaption, { color: t.heroMuted }]}>{progress}% complete</Text>
            </View>
            <View style={styles.sideColumn}>
              <View style={[styles.smallCard, { backgroundColor: t.card, borderColor: t.border }]}>
                <Text style={[styles.smallNumber, { color: t.text }]}>{doneCount}</Text>
                <Text style={[styles.smallLabel, { color: t.muted }]}>Done</Text>
              </View>
              <View style={[styles.smallCard, { backgroundColor: t.card, borderColor: t.border }]}>
                <Text style={[styles.smallNumber, { color: t.text }]}>{tasks.length}</Text>
                <Text style={[styles.smallLabel, { color: t.muted }]}>Total</Text>
              </View>
            </View>
          </View>

          <View style={[styles.inputCard, { backgroundColor: t.card, borderColor: t.border }]}>
            <TextInput accessibilityLabel="New task" style={[styles.input, { color: t.text }]} placeholder="What needs to get done?" placeholderTextColor={t.muted} keyboardAppearance={isDark ? 'dark' : 'light'} value={title} onChangeText={setTitle} onSubmitEditing={handleAdd} maxLength={120} returnKeyType="done" />
            <Pressable accessibilityRole="button" accessibilityLabel="Add task" onPress={handleAdd} style={[styles.addButton, { backgroundColor: t.accent }]}><Feather name="plus" size={22} color={t.accentText} /></Pressable>
          </View>

          <View style={styles.sectionHeading}>
            <Text style={[styles.sectionTitle, { color: t.text }]}>Today's tasks</Text>
            <Text style={[styles.sectionCount, { color: t.muted }]}>{tasks.length} total</Text>
          </View>
          <View style={styles.filters}>
            {FILTERS.map((item) => {
              const selected = filter === item;
              return (
                <Pressable key={item} accessibilityRole="button" accessibilityState={{ selected }} onPress={() => setFilter(item)} style={[styles.filter, { backgroundColor: selected ? t.accent : t.chip }]}>
                  <Text style={[styles.filterText, { color: selected ? t.accentText : t.accent }]}>{item[0].toUpperCase() + item.slice(1)}</Text>
                </Pressable>
              );
            })}
          </View>

          {storageError && <Text accessibilityRole="alert" style={[styles.error, { color: t.danger }]}>Could not access saved tasks. Changes in this session will not be saved.</Text>}
          {themeError && <Text accessibilityRole="alert" style={[styles.error, { color: t.danger }]}>Could not access your saved appearance preference.</Text>}

          {loading ? <ActivityIndicator color={t.accent} style={styles.empty} /> : visibleTasks.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: t.card, borderColor: t.border }]}>
              <View style={[styles.emptyIcon, { backgroundColor: t.chip }]}><Feather name="coffee" size={22} color={t.accent} /></View>
              <Text style={[styles.emptyTitle, { color: t.text }]}>{tasks.length === 0 ? 'A fresh start.' : 'Nothing here right now.'}</Text>
              <Text style={[styles.emptyText, { color: t.muted }]}>{tasks.length === 0 ? 'Add a task and take it one step at a time.' : 'Try another filter to see your tasks.'}</Text>
            </View>
          ) : visibleTasks.map((task) => (
            <SwipeableTaskRow
              key={task.id}
              task={task}
              t={t}
              onToggle={() => setTasks((current) => toggleTask(current, task.id))}
              onDelete={() => setTasks((current) => deleteTask(current, task.id))}
            />
          ))}

          <Text style={[styles.footer, { color: t.muted }]}>One thing at a time.</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const SWIPE_THRESHOLD = 90;

function SwipeableTaskRow({ task, t, onToggle, onDelete }) {
  const translateX = useRef(new Animated.Value(0)).current;
  const handlers = useRef({ onToggle, onDelete });
  handlers.current = { onToggle, onDelete };
  const useNativeDriver = Platform.OS !== 'web';

  const panResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 10 && Math.abs(g.dx) > Math.abs(g.dy) * 2,
    onPanResponderMove: (_, g) => translateX.setValue(g.dx),
    onPanResponderRelease: (_, g) => {
      if (g.dx <= -SWIPE_THRESHOLD) {
        Animated.timing(translateX, { toValue: -400, duration: 160, useNativeDriver }).start(() => handlers.current.onDelete());
        return;
      }
      if (g.dx >= SWIPE_THRESHOLD) handlers.current.onToggle();
      Animated.spring(translateX, { toValue: 0, useNativeDriver }).start();
    },
    onPanResponderTerminationRequest: () => false,
    onPanResponderTerminate: () => Animated.spring(translateX, { toValue: 0, useNativeDriver }).start(),
  })).current;

  const completeOpacity = translateX.interpolate({ inputRange: [0, 40], outputRange: [0, 1], extrapolate: 'clamp' });
  const deleteOpacity = translateX.interpolate({ inputRange: [-40, 0], outputRange: [1, 0], extrapolate: 'clamp' });

  return (
    <View style={styles.swipeWrap}>
      <Animated.View style={[styles.swipeLayer, styles.swipeComplete, { backgroundColor: t.accent, opacity: completeOpacity }]}>
        <Feather name="check" size={18} color={t.accentText} />
        <Text style={[styles.swipeText, { color: t.accentText }]}>{task.completed ? 'Mark active' : 'Complete'}</Text>
      </Animated.View>
      <Animated.View style={[styles.swipeLayer, styles.swipeDelete, { backgroundColor: t.danger, opacity: deleteOpacity }]}>
        <Text style={[styles.swipeText, { color: t.accentText }]}>Delete</Text>
        <Feather name="trash-2" size={18} color={t.accentText} />
      </Animated.View>
      <Animated.View {...panResponder.panHandlers} style={[styles.taskCard, { backgroundColor: t.card, borderColor: t.border, transform: [{ translateX }] }]}>
        <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: task.completed }} accessibilityLabel={`${task.completed ? 'Mark active' : 'Complete'}: ${task.title}`} onPress={onToggle} style={[styles.checkbox, { borderColor: task.completed ? t.accent : t.muted, backgroundColor: task.completed ? t.accent : 'transparent' }]}>
          {task.completed && <Feather name="check" size={15} color={t.accentText} />}
        </Pressable>
        <Text style={[styles.taskTitle, { color: task.completed ? t.muted : t.text }, task.completed && styles.taskCompleted]}>{task.title}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel={`Delete: ${task.title}`} onPress={onDelete} hitSlop={8} style={styles.deleteButton}>
          <Feather name="trash-2" size={17} color={t.muted} />
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  flex: { flex: 1 },
  page: { width: '100%', maxWidth: 600, alignSelf: 'center', paddingHorizontal: 22, paddingTop: 24, paddingBottom: 48, gap: 16 },
  topline: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  greeting: { flex: 1 },
  hello: { fontSize: 13, fontWeight: '600' },
  today: { fontSize: 15, fontWeight: '800', marginTop: 2 },
  themeButton: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 36, fontWeight: '900', lineHeight: 42, letterSpacing: -0.6, marginTop: 10 },
  bento: { flexDirection: 'row', gap: 12 },
  heroCard: { flex: 1.4, borderRadius: 26, padding: 20, justifyContent: 'space-between', minHeight: 184 },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroLabel: { fontSize: 14, fontWeight: '700' },
  heroBadge: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  heroNumber: { fontSize: 60, fontWeight: '900', lineHeight: 66, letterSpacing: -2 },
  track: { height: 6, borderRadius: 3, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3 },
  heroCaption: { fontSize: 12, fontWeight: '600', marginTop: 10 },
  sideColumn: { flex: 1, gap: 12 },
  smallCard: { flex: 1, borderRadius: 22, borderWidth: 1, padding: 14, justifyContent: 'center', gap: 2 },
  smallNumber: { fontSize: 28, fontWeight: '900' },
  smallLabel: { fontSize: 12, fontWeight: '600' },
  inputCard: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 20, padding: 6, marginTop: 4 },
  input: { flex: 1, paddingHorizontal: 12, paddingVertical: 12, fontSize: 16 },
  addButton: { width: 46, height: 46, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  sectionHeading: { marginTop: 8, flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  sectionTitle: { fontSize: 20, fontWeight: '800' },
  sectionCount: { fontSize: 12, fontWeight: '600' },
  filters: { flexDirection: 'row', gap: 8 },
  filter: { paddingVertical: 9, paddingHorizontal: 16, borderRadius: 999 },
  filterText: { fontSize: 13, fontWeight: '700' },
  taskCard: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 20, paddingVertical: 14, paddingHorizontal: 14, gap: 12 },
  checkbox: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  taskTitle: { flex: 1, fontSize: 16, fontWeight: '500' },
  taskCompleted: { textDecorationLine: 'line-through' },
  swipeWrap: { borderRadius: 20, overflow: 'hidden' },
  swipeLayer: { ...StyleSheet.absoluteFillObject, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 22, gap: 8, borderRadius: 20 },
  swipeComplete: { justifyContent: 'flex-start' },
  swipeDelete: { justifyContent: 'flex-end' },
  swipeText: { fontSize: 14, fontWeight: '800' },
  deleteButton: { padding: 6 },
  emptyCard: { alignItems: 'center', borderWidth: 1, borderRadius: 20, paddingVertical: 30, paddingHorizontal: 20, gap: 6 },
  emptyIcon: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  emptyTitle: { fontSize: 16, fontWeight: '800' },
  emptyText: { fontSize: 13, textAlign: 'center' },
  empty: { paddingVertical: 36 },
  error: { fontSize: 13, fontWeight: '600' },
  footer: { fontSize: 12, fontWeight: '600', textAlign: 'center', marginTop: 12 },
});

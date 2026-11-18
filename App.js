import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather } from '@expo/vector-icons';
import { addTask, deleteTask, filterTasks, toggleTask } from './src/tasks';

const STORAGE_KEY = '@focus-list/tasks-v1';
const THEME_KEY = '@focus-list/theme-v1';
const FILTERS = ['all', 'active', 'completed'];

const PALETTE = {
  dark: { bg: '#0b0d0c', card: '#161a17', border: '#262c27', text: '#f4f6f2', muted: '#8d958f', accent: '#7ee8b8', accentText: '#0b0d0c', hero: '#1d231e', heroTrack: '#2e3830', heroText: '#f4f6f2', heroMuted: '#9aa59e', danger: '#ff9a8a' },
  light: { bg: '#f2f3ef', card: '#ffffff', border: '#e0e3dd', text: '#111412', muted: '#6b726c', accent: '#1f8f63', accentText: '#ffffff', hero: '#111412', heroTrack: '#2a302b', heroText: '#f4f6f2', heroMuted: '#9aa39c', danger: '#b3261e' },
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

  // Dark is the default look for the presentation; the saved choice overrides it.
  const isDark = (themePreference ?? 'dark') === 'dark';
  const t = isDark ? PALETTE.dark : PALETTE.light;
  const activeCount = tasks.filter((task) => !task.completed).length;
  const doneCount = tasks.length - activeCount;
  const progress = tasks.length === 0 ? 0 : Math.round((doneCount / tasks.length) * 100);
  const visibleTasks = filterTasks(tasks, filter);

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
            <View style={[styles.brandIcon, { backgroundColor: t.accent }]}><Feather name="check" size={18} color={t.accentText} /></View>
            <Text style={[styles.brand, { color: t.text }]}>Focus List</Text>
            <Pressable accessibilityRole="switch" accessibilityLabel="Dark mode" accessibilityState={{ checked: isDark, disabled: !themeReady }} aria-checked={isDark} onPress={toggleTheme} disabled={!themeReady} style={[styles.themeButton, { backgroundColor: t.card, borderColor: t.border }]}>
              <Feather name={isDark ? 'sun' : 'moon'} size={18} color={t.text} />
            </Pressable>
          </View>

          <Text style={[styles.title, { color: t.text }]}>{'Make room for\nwhat matters.'}</Text>

          <View style={styles.bento}>
            <View style={[styles.heroCard, { backgroundColor: t.hero }]}>
              <Text style={[styles.heroLabel, { color: t.heroMuted }]}>TO DO</Text>
              <Text style={[styles.heroNumber, { color: t.heroText }]}>{activeCount}</Text>
              <View style={[styles.track, { backgroundColor: t.heroTrack }]}>
                <View style={[styles.fill, { width: `${progress}%`, backgroundColor: t.accent }]} />
              </View>
              <Text style={[styles.heroCaption, { color: t.heroMuted }]}>{progress}% complete</Text>
            </View>
            <View style={styles.sideColumn}>
              <View style={[styles.smallCard, { backgroundColor: t.card, borderColor: t.border }]}>
                <Feather name="check-circle" size={18} color={t.accent} />
                <Text style={[styles.smallNumber, { color: t.text }]}>{doneCount}</Text>
                <Text style={[styles.smallLabel, { color: t.muted }]}>DONE</Text>
              </View>
              <View style={[styles.smallCard, { backgroundColor: t.card, borderColor: t.border }]}>
                <Feather name="layers" size={18} color={t.muted} />
                <Text style={[styles.smallNumber, { color: t.text }]}>{tasks.length}</Text>
                <Text style={[styles.smallLabel, { color: t.muted }]}>TOTAL</Text>
              </View>
            </View>
          </View>

          <View style={[styles.inputCard, { backgroundColor: t.card, borderColor: t.border }]}>
            <TextInput accessibilityLabel="New task" style={[styles.input, { color: t.text }]} placeholder="What needs to get done?" placeholderTextColor={t.muted} keyboardAppearance={isDark ? 'dark' : 'light'} value={title} onChangeText={setTitle} onSubmitEditing={handleAdd} maxLength={120} returnKeyType="done" />
            <Pressable accessibilityRole="button" accessibilityLabel="Add task" onPress={handleAdd} style={[styles.addButton, { backgroundColor: t.accent }]}><Feather name="plus" size={22} color={t.accentText} /></Pressable>
          </View>

          <View style={[styles.segments, { backgroundColor: t.card, borderColor: t.border }]}>
            {FILTERS.map((item) => {
              const selected = filter === item;
              return (
                <Pressable key={item} accessibilityRole="button" accessibilityState={{ selected }} onPress={() => setFilter(item)} style={[styles.segment, selected && { backgroundColor: t.accent }]}>
                  <Text style={[styles.segmentText, { color: selected ? t.accentText : t.muted }]}>{item[0].toUpperCase() + item.slice(1)}</Text>
                </Pressable>
              );
            })}
          </View>

          {storageError && <Text accessibilityRole="alert" style={[styles.error, { color: t.danger }]}>Could not access saved tasks. Changes in this session will not be saved.</Text>}
          {themeError && <Text accessibilityRole="alert" style={[styles.error, { color: t.danger }]}>Could not access your saved appearance preference.</Text>}

          {loading ? <ActivityIndicator color={t.accent} style={styles.empty} /> : visibleTasks.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: t.card, borderColor: t.border }]}>
              <Feather name="coffee" size={26} color={t.accent} />
              <Text style={[styles.emptyTitle, { color: t.text }]}>{tasks.length === 0 ? 'A fresh start.' : 'Nothing here right now.'}</Text>
              <Text style={[styles.emptyText, { color: t.muted }]}>{tasks.length === 0 ? 'Add a task and take it one step at a time.' : 'Try another filter to see your tasks.'}</Text>
            </View>
          ) : visibleTasks.map((task) => (
            <View key={task.id} style={[styles.taskCard, { backgroundColor: t.card, borderColor: t.border }]}>
              <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: task.completed }} accessibilityLabel={`${task.completed ? 'Mark active' : 'Complete'}: ${task.title}`} onPress={() => setTasks((current) => toggleTask(current, task.id))} style={[styles.checkbox, { borderColor: task.completed ? t.accent : t.muted, backgroundColor: task.completed ? t.accent : 'transparent' }]}>
                {task.completed && <Feather name="check" size={15} color={t.accentText} />}
              </Pressable>
              <Text style={[styles.taskTitle, { color: task.completed ? t.muted : t.text }, task.completed && styles.taskCompleted]}>{task.title}</Text>
              <Pressable accessibilityRole="button" accessibilityLabel={`Delete: ${task.title}`} onPress={() => setTasks((current) => deleteTask(current, task.id))} hitSlop={8} style={styles.deleteButton}>
                <Feather name="trash-2" size={17} color={t.muted} />
              </Pressable>
            </View>
          ))}

          <Text style={[styles.footer, { color: t.muted }]}>ONE THING AT A TIME.</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  flex: { flex: 1 },
  page: { width: '100%', maxWidth: 600, alignSelf: 'center', paddingHorizontal: 22, paddingTop: 28, paddingBottom: 48, gap: 16 },
  topline: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  brandIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  brand: { fontSize: 15, fontWeight: '800', letterSpacing: 0.3 },
  themeButton: { marginLeft: 'auto', width: 42, height: 42, borderRadius: 21, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 40, fontWeight: '900', lineHeight: 46, letterSpacing: -0.8, marginTop: 14, marginBottom: 6 },
  bento: { flexDirection: 'row', gap: 12 },
  heroCard: { flex: 1.4, borderRadius: 24, padding: 20, justifyContent: 'space-between', minHeight: 176 },
  heroLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 1.2 },
  heroNumber: { fontSize: 64, fontWeight: '900', lineHeight: 70, letterSpacing: -2 },
  track: { height: 6, borderRadius: 3, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3 },
  heroCaption: { fontSize: 12, fontWeight: '600', marginTop: 10 },
  sideColumn: { flex: 1, gap: 12 },
  smallCard: { flex: 1, borderRadius: 20, borderWidth: 1, padding: 14, justifyContent: 'space-between' },
  smallNumber: { fontSize: 26, fontWeight: '900' },
  smallLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  inputCard: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 18, padding: 6, marginTop: 8 },
  input: { flex: 1, paddingHorizontal: 12, paddingVertical: 12, fontSize: 16 },
  addButton: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  segments: { flexDirection: 'row', borderWidth: 1, borderRadius: 16, padding: 4 },
  segment: { flex: 1, paddingVertical: 9, borderRadius: 12, alignItems: 'center' },
  segmentText: { fontSize: 13, fontWeight: '700' },
  taskCard: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 18, paddingVertical: 14, paddingHorizontal: 14, gap: 12 },
  checkbox: { width: 24, height: 24, borderRadius: 8, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  taskTitle: { flex: 1, fontSize: 16, fontWeight: '500' },
  taskCompleted: { textDecorationLine: 'line-through' },
  deleteButton: { padding: 6 },
  emptyCard: { alignItems: 'center', borderWidth: 1, borderRadius: 18, paddingVertical: 32, paddingHorizontal: 20, gap: 6 },
  emptyTitle: { fontSize: 16, fontWeight: '800', marginTop: 6 },
  emptyText: { fontSize: 13, textAlign: 'center' },
  empty: { paddingVertical: 36 },
  error: { fontSize: 13, fontWeight: '600' },
  footer: { fontSize: 10, fontWeight: '800', letterSpacing: 1.2, textAlign: 'center', marginTop: 16 },
});

import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, useColorScheme, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather } from '@expo/vector-icons';
import { addTask, deleteTask, filterTasks, toggleTask } from './src/tasks';

const STORAGE_KEY = '@focus-list/tasks-v1';
const THEME_KEY = '@focus-list/theme-v1';
const FILTERS = ['all', 'active', 'completed'];

export default function App() {
  const [tasks, setTasks] = useState([]);
  const [title, setTitle] = useState('');
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [storageError, setStorageError] = useState(false);
  const [themePreference, setThemePreference] = useState(null);
  const [themeReady, setThemeReady] = useState(false);
  const [themeError, setThemeError] = useState(false);
  const systemTheme = useColorScheme();
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

  const activeCount = tasks.filter((task) => !task.completed).length;
  const visibleTasks = filterTasks(tasks, filter);
  const isDark = (themePreference || systemTheme) === 'dark';

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
    <SafeAreaView style={[styles.safeArea, isDark && darkStyles.safeArea]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
          <View style={styles.topline}>
            <View style={styles.brandIcon}><Feather name="check" size={19} color="#ffffff" /></View>
            <Text style={[styles.brand, isDark && darkStyles.brand]}>FOCUS LIST</Text>
            <Pressable accessibilityRole="switch" accessibilityLabel="Dark mode" accessibilityState={{ checked: isDark, disabled: !themeReady }} aria-checked={isDark} onPress={toggleTheme} disabled={!themeReady} style={[styles.themeButton, isDark && darkStyles.themeButton]}>
              <Feather name={isDark ? 'sun' : 'moon'} size={19} color={isDark ? '#f0cc83' : '#315a4c'} />
            </Pressable>
          </View>

          <View style={styles.heading}>
            <Text style={[styles.eyebrow, isDark && darkStyles.eyebrow]}>A LITTLE PROGRESS, EVERY DAY</Text>
            <Text style={[styles.title, isDark && darkStyles.title]}>Make room for{ '\n' }what matters.</Text>
            <Text style={[styles.subtitle, isDark && darkStyles.subtitle]}>A clear list for a clearer mind.</Text>
          </View>

          <View style={[styles.summary, isDark && darkStyles.summary]}>
            <View><Text style={[styles.summaryNumber, isDark && darkStyles.summaryNumber]}>{activeCount}</Text><Text style={[styles.summaryLabel, isDark && darkStyles.summaryLabel]}>TO DO</Text></View>
            <View style={[styles.summaryDivider, isDark && darkStyles.summaryDivider]} />
            <View><Text style={[styles.summaryNumber, isDark && darkStyles.summaryNumber]}>{tasks.length - activeCount}</Text><Text style={[styles.summaryLabel, isDark && darkStyles.summaryLabel]}>DONE</Text></View>
            <Feather name="sun" size={28} color="#e6aa45" style={styles.summaryIcon} />
          </View>

          <View style={styles.sectionHeading}><Text style={[styles.sectionTitle, isDark && darkStyles.sectionTitle]}>Your tasks</Text><Text style={[styles.sectionCount, isDark && darkStyles.secondary]}>{tasks.length} total</Text></View>
          <View style={[styles.inputRow, isDark && darkStyles.inputRow]}>
            <TextInput accessibilityLabel="New task" style={[styles.input, isDark && darkStyles.input]} placeholder="What needs to get done?" placeholderTextColor={isDark ? '#a5b4ac' : '#8c9693'} keyboardAppearance={isDark ? 'dark' : 'light'} value={title} onChangeText={setTitle} onSubmitEditing={handleAdd} maxLength={120} returnKeyType="done" />
            <Pressable accessibilityRole="button" accessibilityLabel="Add task" onPress={handleAdd} style={styles.addButton}><Feather name="plus" size={23} color="#ffffff" /></Pressable>
          </View>
          <View style={styles.filters}>
            {FILTERS.map((item) => <Pressable key={item} accessibilityRole="button" accessibilityState={{ selected: filter === item }} onPress={() => setFilter(item)} style={[styles.filter, filter === item && styles.filterSelected, isDark && filter === item && darkStyles.filterSelected]}><Text style={[styles.filterText, isDark && darkStyles.secondary, filter === item && styles.filterTextSelected, isDark && filter === item && darkStyles.filterTextSelected]}>{item[0].toUpperCase() + item.slice(1)}</Text></Pressable>)}
          </View>
          {storageError && <Text accessibilityRole="alert" style={[styles.error, isDark && darkStyles.error]}>Could not access saved tasks. Changes in this session will not be saved.</Text>}
          {themeError && <Text accessibilityRole="alert" style={[styles.error, isDark && darkStyles.error]}>Could not access your saved appearance preference.</Text>}
          {loading ? <ActivityIndicator color={isDark ? '#a7d2bb' : '#184e45'} style={styles.empty} /> : visibleTasks.length === 0 ? <View style={styles.empty}><Feather name="coffee" size={24} color={isDark ? '#a5b4ac' : '#8da59c'} /><Text style={[styles.emptyTitle, isDark && darkStyles.emptyTitle]}>{tasks.length === 0 ? 'A fresh start.' : 'Nothing here right now.'}</Text><Text style={[styles.emptyText, isDark && darkStyles.secondary]}>{tasks.length === 0 ? 'Add a task and take it one step at a time.' : 'Try another filter to see your tasks.'}</Text></View> : visibleTasks.map((task) => (
            <View key={task.id} style={[styles.taskRow, isDark && darkStyles.taskRow]}>
              <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: task.completed }} accessibilityLabel={`${task.completed ? 'Mark active' : 'Complete'}: ${task.title}`} onPress={() => setTasks((current) => toggleTask(current, task.id))} style={[styles.checkbox, isDark && darkStyles.checkbox, task.completed && styles.checked]}>{task.completed && <Feather name="check" size={14} color="#ffffff" />}</Pressable>
              <Text style={[styles.taskTitle, isDark && darkStyles.taskTitle, task.completed && styles.taskCompleted, isDark && task.completed && darkStyles.secondary]}>{task.title}</Text>
              <Pressable accessibilityRole="button" accessibilityLabel={`Delete: ${task.title}`} onPress={() => setTasks((current) => deleteTask(current, task.id))} style={styles.deleteButton}><Feather name="trash-2" size={17} color={isDark ? '#a5b4ac' : '#8d9994'} /></Pressable>
            </View>
          ))}
          <Text style={[styles.footer, isDark && darkStyles.secondary]}>ONE THING AT A TIME.</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f5f7f4' }, flex: { flex: 1 },
  page: { width: '100%', maxWidth: 560, alignSelf: 'center', paddingHorizontal: 24, paddingTop: 32, paddingBottom: 42 },
  topline: { flexDirection: 'row', alignItems: 'center', gap: 9 }, brandIcon: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#184e45', alignItems: 'center', justifyContent: 'center' }, brand: { color: '#183d36', fontSize: 12, fontWeight: '800' }, themeButton: { marginLeft: 'auto', width: 40, height: 40, borderRadius: 8, backgroundColor: '#e4eee7', alignItems: 'center', justifyContent: 'center' },
  heading: { marginTop: 55 }, eyebrow: { color: '#b97a36', fontWeight: '800', fontSize: 10 }, title: { color: '#193b34', fontSize: 36, fontWeight: '800', lineHeight: 43, marginTop: 12 }, subtitle: { color: '#74847c', fontSize: 15, marginTop: 12 },
  summary: { marginTop: 32, padding: 21, backgroundColor: '#e4eee7', borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 25 }, summaryNumber: { color: '#184e45', fontSize: 25, fontWeight: '800' }, summaryLabel: { color: '#6e8b7c', fontSize: 10, fontWeight: '700', marginTop: 3 }, summaryDivider: { width: 1, height: 32, backgroundColor: '#c5d9cc' }, summaryIcon: { marginLeft: 'auto' },
  sectionHeading: { marginTop: 37, marginBottom: 16, flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }, sectionTitle: { color: '#223e37', fontSize: 20, fontWeight: '800' }, sectionCount: { color: '#8d9992', fontSize: 12 },
  inputRow: { flexDirection: 'row', backgroundColor: '#ffffff', borderColor: '#dce5df', borderWidth: 1, borderRadius: 8, padding: 5 }, input: { flex: 1, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: '#233f38' }, addButton: { width: 43, height: 43, borderRadius: 6, backgroundColor: '#184e45', alignItems: 'center', justifyContent: 'center' },
  filters: { flexDirection: 'row', gap: 6, marginTop: 20, marginBottom: 8 }, filter: { paddingVertical: 8, paddingHorizontal: 13, borderRadius: 6 }, filterSelected: { backgroundColor: '#dcebe0' }, filterText: { color: '#899790', fontSize: 12, fontWeight: '700' }, filterTextSelected: { color: '#235a4a' },
  taskRow: { minHeight: 62, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#e4ebe6', gap: 12 }, checkbox: { height: 22, width: 22, borderRadius: 6, borderWidth: 1.5, borderColor: '#afc1b5', alignItems: 'center', justifyContent: 'center' }, checked: { backgroundColor: '#4e8a70', borderColor: '#4e8a70' }, taskTitle: { flex: 1, color: '#2c443b', fontSize: 15 }, taskCompleted: { color: '#9aa8a0', textDecorationLine: 'line-through' }, deleteButton: { padding: 9 },
  empty: { alignItems: 'center', paddingVertical: 42 }, emptyTitle: { color: '#46685a', fontWeight: '700', fontSize: 15, marginTop: 12 }, emptyText: { color: '#91a198', fontSize: 13, marginTop: 6, textAlign: 'center' }, error: { color: '#a23d33', marginTop: 12, fontSize: 13 }, footer: { color: '#a5b3aa', fontSize: 10, fontWeight: '700', textAlign: 'center', marginTop: 48 },
});

const darkStyles = StyleSheet.create({
  safeArea: { backgroundColor: '#171d1a' }, brand: { color: '#e5eee7' }, themeButton: { backgroundColor: '#2b3b32' },
  eyebrow: { color: '#e5b971' }, title: { color: '#f0f4ec' }, subtitle: { color: '#b0c0b5' },
  summary: { backgroundColor: '#293c31' }, summaryNumber: { color: '#d5efdd' }, summaryLabel: { color: '#afc7b7' }, summaryDivider: { backgroundColor: '#52705c' },
  sectionTitle: { color: '#e5eee7' }, secondary: { color: '#a5b4ac' },
  inputRow: { backgroundColor: '#252f29', borderColor: '#45554b' }, input: { color: '#eef4ee' },
  filterSelected: { backgroundColor: '#375344' }, filterTextSelected: { color: '#d6f0dd' },
  taskRow: { borderBottomColor: '#3b4940' }, checkbox: { borderColor: '#91a99a' }, taskTitle: { color: '#e3ebe3' },
  emptyTitle: { color: '#d0dfd2' }, error: { color: '#ffb5a7' },
});
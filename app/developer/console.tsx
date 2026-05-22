import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StatusBar,
  Alert,
  ActivityIndicator,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Colors, FontFamily, FontSize, Radius, Shadow, Space } from '../../theme';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { getDatabase, initDatabase } from '../../db/database';
import { useWanderPlanStore } from '../../db/store';

export default function SqliteConsoleScreen() {
  const router = useRouter();
  const [activeSegment, setActiveSegment] = useState<'sql' | 'import' | 'info'>('sql');
  const [sqlQuery, setSqlQuery] = useState('');
  const [sqlResult, setSqlResult] = useState<any>(null);
  const [base64Db, setBase64Db] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [dbPath, setDbPath] = useState('');
  const [dbSize, setDbSize] = useState('Unknown');

  const refreshTrips = useWanderPlanStore((state) => state.refreshTrips);

  useEffect(() => {
    loadDatabaseInfo();
  }, []);

  const loadDatabaseInfo = async () => {
    try {
      const path = `${(FileSystem as any).documentDirectory || ''}SQLite/wanderplan_new.db`;
      setDbPath(path);
      const info = await FileSystem.getInfoAsync(path);
      if (info.exists) {
        const sizeInMb = (info.size / (1024 * 1024)).toFixed(2);
        setDbSize(`${sizeInMb} MB (${info.size.toLocaleString()} bytes)`);
      } else {
        setDbSize('Database file does not exist yet (not initialized)');
      }
    } catch (e) {
      console.error(e);
      setDbSize('Error getting size');
    }
  };

  const handleExecuteSql = async () => {
    if (!sqlQuery.trim()) return;
    setIsLoading(true);
    setSqlResult(null);
    try {
      const db = await getDatabase();
      const cleanSql = sqlQuery.trim();
      
      // Determine if query returns rows or is a mutation
      const isSelect = cleanSql.toLowerCase().startsWith('select') || cleanSql.toLowerCase().startsWith('pragma');
      
      if (isSelect) {
        const rows = await db.getAllAsync(cleanSql);
        setSqlResult({ type: 'success', data: rows, count: rows.length });
      } else {
        await db.execAsync(cleanSql);
        setSqlResult({ type: 'success', message: 'Query executed successfully' });
      }
      await refreshTrips();
      await loadDatabaseInfo();
    } catch (err: any) {
      setSqlResult({ type: 'error', message: err.message || 'Unknown database error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleImportBase64 = async () => {
    if (!base64Db.trim()) {
      Alert.alert('Empty string', 'Please paste a valid base64-encoded SQLite file content.');
      return;
    }

    setIsLoading(true);
    try {
      const sqliteDir = `${(FileSystem as any).documentDirectory || ''}SQLite`;
      const path = `${sqliteDir}/wanderplan_new.db`;

      // Ensure SQLite folder directory exists
      const dirInfo = await FileSystem.getInfoAsync(sqliteDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(sqliteDir, { intermediates: true });
      }

      // Write parsed base64 content back to file
      await FileSystem.writeAsStringAsync(path, base64Db.trim(), {
        encoding: (FileSystem as any).EncodingType?.Base64 || 'base64',
      });

      // Clear the static instance so it opens the new database file next time
      Alert.alert(
        'Database Imported Successfully! 🚀',
        'Your pasted SQLite database file has overwritten the existing sandbox file. Click OK to refresh active stores.',
        [
          {
            text: 'OK',
            onPress: async () => {
              // Force database re-initialization
              await initDatabase();
              await refreshTrips();
              setBase64Db('');
              loadDatabaseInfo();
            },
          },
        ]
      );
    } catch (err: any) {
      console.error(err);
      Alert.alert('Import Failed', `Decryption error: ${err.message || 'Invalid base64 encoding sequence.'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportDatabase = async () => {
    try {
      const path = `${(FileSystem as any).documentDirectory || ''}SQLite/wanderplan_new.db`;
      const info = await FileSystem.getInfoAsync(path);
      if (!info.exists) {
        Alert.alert('Not initialized', 'Database file does not exist yet.');
        return;
      }

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(path);
      } else {
        await Share.share({
          message: `Database path: ${path}`,
        });
      }
    } catch (e) {
      console.error(e);
      Alert.alert('Share Failed', 'Unable to export database file.');
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <SafeAreaView edges={['top']}>
          <View style={styles.headerInner}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <MaterialCommunityIcons name="arrow-left" size={22} color={Colors.white} />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerSub}>Developer sandbox</Text>
              <Text style={styles.headerTitle}>SQLite Manager</Text>
            </View>
            <MaterialCommunityIcons name="database-cog" size={28} color="rgba(255,255,255,0.4)" />
          </View>
        </SafeAreaView>
      </View>

      {/* Segments */}
      <View style={styles.segmentWrap}>
        {(['sql', 'import', 'info'] as const).map((seg) => (
          <TouchableOpacity
            key={seg}
            onPress={() => setActiveSegment(seg)}
            style={[styles.segmentBtn, activeSegment === seg && styles.segmentBtnActive]}
          >
            <Text style={[styles.segmentText, activeSegment === seg && styles.segmentTextActive]}>
              {seg === 'sql' ? 'SQL Console' : seg === 'import' ? 'Paste Base64' : 'DB Info'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {activeSegment === 'sql' && (
          <Card style={styles.card} elevated>
            <Text style={styles.sectionTitle}>Execute SQL Statements</Text>
            <Text style={styles.helperText}>
              Write or paste standard SQLite statements directly. Query results are returned below.
            </Text>

            <TextInput
              style={styles.queryInput}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              placeholder="e.g. SELECT * FROM trips;&#10;or INSERT INTO packing_items VALUES(...);"
              placeholderTextColor={Colors.neutral400}
              value={sqlQuery}
              onChangeText={setSqlQuery}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <View style={styles.row}>
              <Button
                label="Execute"
                onPress={handleExecuteSql}
                loading={isLoading}
                disabled={!sqlQuery.trim()}
                gradient
                icon={<MaterialCommunityIcons name="play" size={16} color={Colors.white} />}
                style={{ flex: 1 }}
              />
              <Button
                label="Clear"
                onPress={() => { setSqlQuery(''); setSqlResult(null); }}
                variant="neutral"
                style={{ minWidth: 80 }}
              />
            </View>

            {sqlResult && (
              <View style={styles.resultBox}>
                <Text style={styles.resultHeader}>
                  {sqlResult.type === 'success' ? '✅ Result' : '❌ SQL Error'}
                </Text>
                
                {sqlResult.type === 'success' ? (
                  sqlResult.data ? (
                    <ScrollView horizontal>
                      <View>
                        <Text style={styles.countText}>Found {sqlResult.count} row(s):</Text>
                        <Text style={styles.resultText}>
                          {JSON.stringify(sqlResult.data, null, 2)}
                        </Text>
                      </View>
                    </ScrollView>
                  ) : (
                    <Text style={styles.resultSuccessText}>{sqlResult.message}</Text>
                  )
                ) : (
                  <Text style={styles.resultErrorText}>{sqlResult.message}</Text>
                )}
              </View>
            )}
          </Card>
        )}

        {activeSegment === 'import' && (
          <Card style={styles.card} elevated>
            <Text style={styles.sectionTitle}>Paste SQLite Binary (Base64)</Text>
            <Text style={styles.helperText}>
              Paste a base64 encoded `.db` file to fully replace your offline storage with a pre-populated dataset.
            </Text>

            <TextInput
              style={[styles.queryInput, { height: 160 }]}
              multiline
              numberOfLines={10}
              textAlignVertical="top"
              placeholder="Paste long base64 string here..."
              placeholderTextColor={Colors.neutral400}
              value={base64Db}
              onChangeText={setBase64Db}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Button
              label="Overwrite Sandbox SQLite DB"
              onPress={handleImportBase64}
              loading={isLoading}
              disabled={!base64Db.trim()}
              variant="danger"
              fullWidth
              icon={<MaterialCommunityIcons name="database-import" size={18} color={Colors.white} />}
              style={{ marginTop: Space[2] }}
            />
          </Card>
        )}

        {activeSegment === 'info' && (
          <View style={{ gap: Space[4] }}>
            <Card style={styles.card} elevated>
              <Text style={styles.sectionTitle}>Sandbox Information</Text>
              
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Database File</Text>
                <Text style={styles.infoVal}>wanderplan_new.db</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Local Path</Text>
                <Text style={styles.infoVal} numberOfLines={3}>{dbPath}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>File Size</Text>
                <Text style={styles.infoVal}>{dbSize}</Text>
              </View>

              <Button
                label="Share / Export SQLite File"
                onPress={handleExportDatabase}
                variant="primary"
                fullWidth
                icon={<MaterialCommunityIcons name="share-variant" size={18} color={Colors.white} />}
                style={{ marginTop: Space[3] }}
              />
            </Card>

            <Card style={styles.card} elevated>
              <Text style={styles.sectionTitle}>Schema Diagnostics</Text>
              <Text style={styles.helperText}>
                Active tables in wanderplan_new.db:
              </Text>
              <View style={styles.tableList}>
                {['trips', 'days', 'stops', 'packing_items', 'contacts'].map((tbl) => (
                  <View key={tbl} style={styles.tableRow}>
                    <MaterialCommunityIcons name="table" size={18} color={Colors.primary} />
                    <Text style={styles.tableName}>{tbl}</Text>
                    <Badge label="SQLITE" variant="neutral" />
                  </View>
                ))}
              </View>
            </Card>
          </View>
        )}

        <View style={{ height: Space[10] }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bgPrimary },
  header: { backgroundColor: Colors.primaryDark, paddingBottom: Space[4] },
  headerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Space[5],
    paddingTop: Space[2],
    gap: Space[4],
  },
  backBtn: {
    width: 40, height: 40, borderRadius: Radius.md,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerSub: { fontFamily: FontFamily.regular, fontSize: FontSize.sm, color: 'rgba(255,255,255,0.7)' },
  headerTitle: { fontFamily: FontFamily.bold, fontSize: FontSize.xl, color: Colors.white },
  
  segmentWrap: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderBottomWidth: 1, borderBottomColor: Colors.neutral100,
  },
  segmentBtn: {
    flex: 1, alignItems: 'center', paddingVertical: Space[3],
    borderBottomWidth: 2, borderBottomColor: Colors.transparent,
  },
  segmentBtnActive: { borderBottomColor: Colors.primary },
  segmentText: { fontFamily: FontFamily.medium, fontSize: FontSize.sm, color: Colors.neutral400 },
  segmentTextActive: { color: Colors.primary },

  content: { padding: Space[4], gap: Space[4] },
  card: {},
  sectionTitle: { fontFamily: FontFamily.bold, fontSize: FontSize.md, color: Colors.neutral900, marginBottom: Space[1] },
  helperText: { fontFamily: FontFamily.regular, fontSize: FontSize.sm, color: Colors.neutral400, marginBottom: Space[4], lineHeight: 20 },
  queryInput: {
    backgroundColor: Colors.neutral50,
    borderWidth: 1, borderColor: Colors.neutral100,
    borderRadius: Radius.md,
    padding: Space[3],
    fontFamily: 'monospace',
    fontSize: FontSize.sm,
    color: Colors.neutral900,
    minHeight: 120,
    marginBottom: Space[3],
  },
  row: { flexDirection: 'row', gap: Space[2] },
  
  resultBox: {
    marginTop: Space[4],
    backgroundColor: Colors.neutral50,
    borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.neutral100,
    padding: Space[3],
  },
  resultHeader: { fontFamily: FontFamily.bold, fontSize: FontSize.sm, color: Colors.neutral900, marginBottom: Space[2] },
  countText: { fontFamily: FontFamily.medium, fontSize: FontSize.xs, color: Colors.neutral400, marginBottom: Space[1] },
  resultText: { fontFamily: 'monospace', fontSize: FontSize.xs, color: Colors.neutral700, lineHeight: 16 },
  resultSuccessText: { fontFamily: FontFamily.medium, fontSize: FontSize.sm, color: Colors.success },
  resultErrorText: { fontFamily: FontFamily.medium, fontSize: FontSize.sm, color: Colors.danger, lineHeight: 18 },

  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Space[2] + 2,
    borderBottomWidth: 1, borderBottomColor: Colors.neutral50,
  },
  infoLabel: { fontFamily: FontFamily.semibold, fontSize: FontSize.sm, color: Colors.neutral700 },
  infoVal: { fontFamily: FontFamily.regular, fontSize: FontSize.sm, color: Colors.neutral600, flex: 0.7, textAlign: 'right' },

  tableList: { gap: Space[2], marginTop: Space[2] },
  tableRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: Space[2] + 2,
    borderBottomWidth: 1, borderBottomColor: Colors.neutral50,
  },
  tableName: { flex: 1, fontFamily: FontFamily.semibold, fontSize: FontSize.sm, color: Colors.neutral900, marginLeft: Space[2] },
});

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Image,
  Linking,
  SafeAreaView,
} from 'react-native';
import { router } from 'expo-router';
import ProtectedRoute from '~/components/ProtectedRoute';
import { supabase, adminAuth } from '~/utils/supabase';
import { Picker } from '@react-native-picker/picker';

import DateTimePicker from '@react-native-community/datetimepicker';

interface Building {
  id: string;
  name: string;
}

interface Apartment {
  id: string;
  number: string;
  building_id: string;
}

interface Activity {
  id: string;
  visitor_name: string;
  apartment_number: string;
  building_name: string;
  created_at: string;
}

interface Log {
  id: string;
  action: string;
  user_name: string;
  building_name: string;
  created_at: string;
}

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<Log[]>([]);
  const [logSearchType, setLogSearchType] = useState('all'); // 'all', 'morador', 'porteiro', 'predio', 'acao'
  const [logSearchQuery, setLogSearchQuery] = useState('');
  const [logBuildingFilter, setLogBuildingFilter] = useState('');
  const [logMovementFilter, setLogMovementFilter] = useState('all');
  const [logDateFilter, setLogDateFilter] = useState({
    start: null as Date | null,
    end: null as Date | null,
  });
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);

  const [showAvatarMenu, setShowAvatarMenu] = useState(false);

  const [communication, setCommunication] = useState({
    title: '',
    description: '',
    building_id: '',
    target_user: 'all',
  });

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    filterLogs();
  }, [
    logSearchType,
    logSearchQuery,
    logBuildingFilter,
    logMovementFilter,
    logDateFilter,
    logs,
    filterLogs,
  ]);

  const fetchData = async () => {
    try {
      // Obter o administrador atual
      const currentAdmin = await adminAuth.getCurrentAdmin();
      if (!currentAdmin) {
        console.error('Administrador não encontrado');
        return;
      }

      // Buscar apenas os prédios gerenciados pelo administrador atual
      const adminBuildings = await adminAuth.getAdminBuildings(currentAdmin.id);

      const [apartmentsData, activitiesData, logsData] = await Promise.all([
        supabase.from('apartments').select('*').order('number'),
        supabase
          .from('visitor_logs')
          .select('*, apartments(number), buildings(name)')
          .limit(10)
          .order('created_at', { ascending: false }),
        supabase
          .from('system_logs')
          .select('*, profiles(name), buildings(name)')
          .order('created_at', { ascending: false }),
      ]);
      setBuildings(adminBuildings || []);
      setApartments(apartmentsData.data || []);
      setActivities(activitiesData.data || []);
      setLogs(logsData.data || []);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    }
  };

  const filterLogs = () => {
    let filtered = logs;

    // Filtro por busca específica
    if (logSearchQuery && logSearchType !== 'all') {
      const query = logSearchQuery.toLowerCase();
      filtered = filtered.filter((log) => {
        switch (logSearchType) {
          case 'morador':
            return (
              log.user_name?.toLowerCase().includes(query) &&
              (log.action.toLowerCase().includes('morador') ||
                log.user_name?.toLowerCase().includes(query))
            );
          case 'porteiro':
            return (
              log.user_name?.toLowerCase().includes(query) &&
              (log.action.toLowerCase().includes('porteiro') ||
                log.user_name?.toLowerCase().includes(query))
            );
          case 'predio':
            return log.building_name?.toLowerCase().includes(query);
          case 'acao':
            return log.action.toLowerCase().includes(query);
          default:
            return true;
        }
      });
    } else if (logSearchQuery && logSearchType === 'all') {
      // Busca geral quando tipo é 'all'
      const query = logSearchQuery.toLowerCase();
      filtered = filtered.filter(
        (log) =>
          log.action.toLowerCase().includes(query) ||
          log.user_name?.toLowerCase().includes(query) ||
          log.building_name?.toLowerCase().includes(query)
      );
    }

    // Filtro por prédio
    if (logBuildingFilter) {
      filtered = filtered.filter((log) => log.building_name === logBuildingFilter);
    }

    // Filtro por tipo de movimentação
    if (logMovementFilter !== 'all') {
      filtered = filtered.filter((log) => {
        const action = log.action.toLowerCase();
        if (logMovementFilter === 'entrada') {
          return action.includes('entrada') || action.includes('entrou');
        } else if (logMovementFilter === 'saida') {
          return action.includes('saída') || action.includes('saiu') || action.includes('saida');
        }
        return true;
      });
    }

    // Filtro por período
    if (logDateFilter.start || logDateFilter.end) {
      filtered = filtered.filter((log) => {
        const logDate = new Date(log.created_at);
        const startDate = logDateFilter.start;
        const endDate = logDateFilter.end;

        if (startDate && logDate < startDate) return false;
        if (endDate && logDate > endDate) return false;
        return true;
      });
    }

    setFilteredLogs(filtered);
  };

  const handleEmergency = () => {
    router.push('/admin/emergency');
  };

  const handleSendCommunication = async () => {
    if (!communication.title || !communication.description) {
      Alert.alert('Erro', 'Título e descrição são obrigatórios');
      return;
    }

    try {
      const { error } = await supabase.from('communications').insert({
        title: communication.title,
        description: communication.description,
        building_id: communication.building_id || null,
        target_user: communication.target_user,
        created_by: 'admin',
      });

      if (error) throw error;
      Alert.alert('Sucesso', 'Comunicado enviado com sucesso');
      setCommunication({
        title: '',
        description: '',
        building_id: '',
        target_user: 'all',
      });
    } catch (error) {
      Alert.alert('Erro', 'Falha ao enviar comunicado');
    }
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerContent}>
        <View style={styles.avatarContainer}>
          <TouchableOpacity onPress={() => setShowAvatarMenu(!showAvatarMenu)}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>👨‍💼</Text>
            </View>
          </TouchableOpacity>
          {showAvatarMenu && (
            <View style={styles.avatarMenu}>
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setShowAvatarMenu(false);
                  router.push('/admin/profile');
                }}>
                <Text style={styles.menuItemText}>👤 Meu Perfil</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.menuItemLast}
                onPress={async () => {
                  setShowAvatarMenu(false);
                  try {
                    await supabase.auth.signOut();
                    router.replace('/admin/login');
                  } catch (error) {
                    console.error('Erro ao fazer logout:', error);
                    Alert.alert('Erro', 'Não foi possível fazer logout');
                  }
                }}>
                <Text style={styles.menuItemText}>🚪 Sair</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
        <Text style={styles.title}>Painel Admin</Text>
        <TouchableOpacity style={styles.panicButton} onPress={handleEmergency}>
          <Text style={styles.panicButtonText}>🚨</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderDashboard = () => (
    <ScrollView style={styles.content}>
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{buildings.length}</Text>
          <Text style={styles.statLabel}>Prédios gerenciados</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => router.push('/admin/buildings')}>
            <Text style={styles.addButtonText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.activitiesContainer}>
        <Text style={styles.sectionTitle}>Atividades Recentes</Text>
        {activities.map((activity, index) => (
          <View key={index} style={styles.activityItem}>
            <Text style={styles.activityText}>
              Visitante {activity.visitor_name} chegou para o apartamento{' '}
              {activity.apartment_number} em {new Date(activity.created_at).toLocaleString('pt-BR')}{' '}
              - {activity.building_name}
            </Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );

  const renderLogs = () => (
    <ScrollView style={styles.content}>
      <View style={styles.filterContainer}>
        <View style={styles.searchTypeContainer}>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={logSearchType}
              onValueChange={setLogSearchType}
              style={styles.picker}>
              <Picker.Item label="Buscar em Tudo" value="all" />
              <Picker.Item label="Buscar Morador" value="morador" />
              <Picker.Item label="Buscar Porteiro" value="porteiro" />
              <Picker.Item label="Buscar Prédio" value="predio" />
              <Picker.Item label="Buscar Ação" value="acao" />
            </Picker>
          </View>

          <TextInput
            style={[styles.filterInput, styles.searchInput]}
            placeholder={`Buscar ${logSearchType === 'all' ? 'em tudo' : logSearchType}...`}
            value={logSearchQuery}
            onChangeText={setLogSearchQuery}
          />
        </View>

        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={logBuildingFilter}
            onValueChange={setLogBuildingFilter}
            style={styles.picker}>
            <Picker.Item label="Todos os Prédios" value="" />
            {buildings.map((building) => (
              <Picker.Item key={building.id} label={building.name} value={building.name} />
            ))}
          </Picker>
        </View>

        <View style={styles.dateFilterContainer}>
          <View style={styles.datePickerGroup}>
            <TouchableOpacity
              style={styles.datePickerButton}
              onPress={() => setShowStartDatePicker(true)}>
              <Text style={styles.datePickerButtonText}>
                📅{' '}
                {logDateFilter.start
                  ? logDateFilter.start.toLocaleDateString('pt-BR')
                  : 'Data início'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.timePickerButton}
              onPress={() => setShowStartTimePicker(true)}>
              <Text style={styles.timePickerButtonText}>
                🕐{' '}
                {logDateFilter.start
                  ? logDateFilter.start.toLocaleTimeString('pt-BR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : 'Hora'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.datePickerGroup}>
            <TouchableOpacity
              style={styles.datePickerButton}
              onPress={() => setShowEndDatePicker(true)}>
              <Text style={styles.datePickerButtonText}>
                📅 {logDateFilter.end ? logDateFilter.end.toLocaleDateString('pt-BR') : 'Data fim'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.timePickerButton}
              onPress={() => setShowEndTimePicker(true)}>
              <Text style={styles.timePickerButtonText}>
                🕐{' '}
                {logDateFilter.end
                  ? logDateFilter.end.toLocaleTimeString('pt-BR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : 'Hora'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {showStartDatePicker && (
          <DateTimePicker
            value={logDateFilter.start || new Date()}
            mode="date"
            display="default"
            onChange={(event, selectedDate) => {
              setShowStartDatePicker(false);
              if (selectedDate) {
                const currentTime = logDateFilter.start || new Date();
                selectedDate.setHours(currentTime.getHours(), currentTime.getMinutes());
                setLogDateFilter((prev) => ({ ...prev, start: selectedDate }));
              }
            }}
          />
        )}

        {showStartTimePicker && (
          <DateTimePicker
            value={logDateFilter.start || new Date()}
            mode="time"
            display="default"
            onChange={(event, selectedTime) => {
              setShowStartTimePicker(false);
              if (selectedTime) {
                const currentDate = logDateFilter.start || new Date();
                currentDate.setHours(selectedTime.getHours(), selectedTime.getMinutes());
                setLogDateFilter((prev) => ({ ...prev, start: currentDate }));
              }
            }}
          />
        )}

        {showEndDatePicker && (
          <DateTimePicker
            value={logDateFilter.end || new Date()}
            mode="date"
            display="default"
            onChange={(event, selectedDate) => {
              setShowEndDatePicker(false);
              if (selectedDate) {
                const currentTime = logDateFilter.end || new Date();
                selectedDate.setHours(currentTime.getHours(), currentTime.getMinutes());
                setLogDateFilter((prev) => ({ ...prev, end: selectedDate }));
              }
            }}
          />
        )}

        {showEndTimePicker && (
          <DateTimePicker
            value={logDateFilter.end || new Date()}
            mode="time"
            display="default"
            onChange={(event, selectedTime) => {
              setShowEndTimePicker(false);
              if (selectedTime) {
                const currentDate = logDateFilter.end || new Date();
                currentDate.setHours(selectedTime.getHours(), selectedTime.getMinutes());
                setLogDateFilter((prev) => ({ ...prev, end: currentDate }));
              }
            }}
          />
        )}
      </View>

      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tabButton, logMovementFilter === 'all' && styles.tabButtonActive]}
          onPress={() => setLogMovementFilter('all')}>
          <Text
            style={[
              styles.tabButtonText,
              logMovementFilter === 'all' && styles.tabButtonTextActive,
            ]}>
            Todos
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, logMovementFilter === 'entrada' && styles.tabButtonActive]}
          onPress={() => setLogMovementFilter('entrada')}>
          <Text
            style={[
              styles.tabButtonText,
              logMovementFilter === 'entrada' && styles.tabButtonTextActive,
            ]}>
            Entrada
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, logMovementFilter === 'saida' && styles.tabButtonActive]}
          onPress={() => setLogMovementFilter('saida')}>
          <Text
            style={[
              styles.tabButtonText,
              logMovementFilter === 'saida' && styles.tabButtonTextActive,
            ]}>
            Saída
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.logsList}>
        {filteredLogs.map((log) => (
          <View key={log.id} style={styles.logItem}>
            <Text style={styles.logAction}>{log.action}</Text>
            <Text style={styles.logUser}>Usuário: {log.user_name}</Text>
            <Text style={styles.logBuilding}>Prédio: {log.building_name}</Text>
            <Text style={styles.logDate}>{new Date(log.created_at).toLocaleString('pt-BR')}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );

  const renderCommunications = () => (
    <ScrollView style={styles.content}>
      <View style={styles.communicationsHeader}>
        <TouchableOpacity
          style={styles.listCommunicationsButton}
          onPress={() => router.push('/admin/communications')}>
          <Text style={styles.listCommunicationsButtonText}>📋 Listar Todos os Comunicados</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.communicationForm}>
        <Text style={styles.formTitle}>Enviar Comunicado</Text>

        <TextInput
          style={styles.input}
          placeholder="Título do comunicado"
          value={communication.title}
          onChangeText={(text) => setCommunication((prev) => ({ ...prev, title: text }))}
        />

        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Descrição detalhada"
          value={communication.description}
          onChangeText={(text) => setCommunication((prev) => ({ ...prev, description: text }))}
          multiline
          numberOfLines={4}
        />

        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={communication.building_id}
            onValueChange={(value) =>
              setCommunication((prev) => ({ ...prev, building_id: value }))
            }>
            <Picker.Item label="Todos os prédios" value="" />
            {buildings.map((building) => (
              <Picker.Item key={building.id} label={building.name} value={building.id} />
            ))}
          </Picker>
        </View>

        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={communication.target_user}
            onValueChange={(value) =>
              setCommunication((prev) => ({ ...prev, target_user: value }))
            }>
            <Picker.Item label="Todos os moradores" value="all" />
          </Picker>
        </View>

        <TouchableOpacity style={styles.sendButton} onPress={handleSendCommunication}>
          <Text style={styles.sendButtonText}>Enviar Comunicado</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  const renderBottomNavigation = () => (
    <View style={styles.bottomNav}>
      <TouchableOpacity
        style={[styles.navItem, activeTab === 'dashboard' && styles.navItemActive]}
        onPress={() => setActiveTab('dashboard')}>
        <Text style={styles.navIcon}>📊</Text>
        <Text style={styles.navLabel}>Dashboard</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.navItem} onPress={() => router.push('/admin/users')}>
        <Text style={styles.navIcon}>👥</Text>
        <Text style={styles.navLabel}>Usuários</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.navItem, activeTab === 'logs' && styles.navItemActive]}
        onPress={() => setActiveTab('logs')}>
        <Text style={styles.navIcon}>📋</Text>
        <Text style={styles.navLabel}>Logs</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.navItem, activeTab === 'communications' && styles.navItemActive]}
        onPress={() => setActiveTab('communications')}>
        <Text style={styles.navIcon}>📢</Text>
        <Text style={styles.navLabel}>Avisos</Text>
      </TouchableOpacity>
    </View>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return renderDashboard();
      case 'logs':
        return renderLogs();
      case 'communications':
        return renderCommunications();
      default:
        return renderDashboard();
    }
  };

  return (
    <ProtectedRoute redirectTo="/admin/login" userType="admin">
      <SafeAreaView style={styles.container}>
        {renderHeader()}
        {renderContent()}
        {renderBottomNavigation()}
      </SafeAreaView>
    </ProtectedRoute>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#FF9800',
    paddingBottom: 15,
    paddingHorizontal: 20,
    zIndex: 50,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  panicButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f44336',
    alignItems: 'center',
    justifyContent: 'center',
  },
  panicButtonText: {
    fontSize: 20,
  },
  content: {
    flex: 1,
    paddingBottom: 80,
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 20,
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    elevation: 2,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 10,
  },
  addButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  activitiesContainer: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  activityItem: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    elevation: 1,
  },
  activityText: {
    fontSize: 14,
    color: '#666',
  },
  cardsContainer: {
    flexDirection: 'row',
    padding: 20,
    gap: 10,
  },
  vehicleActionsContainer: {
    padding: 20,
    gap: 12,
  },
  vehicleSearchContainer: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  vehicleSearchButton: {
    backgroundColor: '#2196F3',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 100,
  },
  vehicleSearchButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  searchCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  searchCardInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  newUserCard: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    padding: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 120,
  },
  newUserCardText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
    marginTop: 5,
    textAlign: 'center',
  },
  addForm: {
    backgroundColor: '#fff',
    margin: 20,
    padding: 20,
    borderRadius: 12,
    elevation: 3,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    backgroundColor: '#fff',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  roleSelector: {
    marginBottom: 15,
  },
  roleLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
  },
  roleButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  roleButton: {
    flex: 1,
    padding: 10,
    borderWidth: 2,
    borderColor: '#ddd',
    borderRadius: 8,
    alignItems: 'center',
  },
  roleButtonActive: {
    borderColor: '#4CAF50',
    backgroundColor: '#f0f8f0',
  },
  roleButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 15,
    backgroundColor: '#fff',
    paddingHorizontal: 12,
  },
  photoButton: {
    backgroundColor: '#f0f0f0',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 15,
  },
  photoButtonText: {
    fontSize: 16,
    color: '#666',
  },
  submitButton: {
    backgroundColor: '#2196F3',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  usersList: {
    padding: 20,
  },
  userCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    elevation: 2,
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  userRole: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  userEmail: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  filterContainer: {
    padding: 20,
  },
  filterInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#fff',
    marginBottom: 10,
  },
  dateFilterContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  datePickerGroup: {
    flex: 1,
    marginHorizontal: 5,
  },
  datePickerButton: {
    backgroundColor: '#f0f0f0',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  datePickerButtonText: {
    fontSize: 14,
    color: '#333',
    textAlign: 'center',
  },
  timePickerButton: {
    backgroundColor: '#e8f4f8',
    padding: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#b3d9e6',
  },
  timePickerButtonText: {
    fontSize: 12,
    color: '#2c5aa0',
    textAlign: 'center',
  },
  searchTypeContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    marginBottom: 0,
  },
  picker: {
    height: 50,
  },
  logsList: {
    padding: 20,
  },
  logItem: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    elevation: 1,
  },
  logAction: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  logUser: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  logBuilding: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  logDate: {
    fontSize: 12,
    color: '#999',
    marginTop: 5,
  },
  communicationsHeader: {
    padding: 20,
    paddingBottom: 0,
  },
  listCommunicationsButton: {
    backgroundColor: '#2196F3',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  listCommunicationsButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  communicationForm: {
    padding: 20,
  },
  sendButton: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 5,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    zIndex: 100,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 8,
  },
  navItemActive: {
    backgroundColor: '#e3f2fd',
  },
  navIcon: {
    fontSize: 20,
    marginBottom: 2,
  },
  navLabel: {
    fontSize: 10,
    color: '#666',
    fontWeight: '500',
  },
  avatarContainer: {
    position: 'relative',
    zIndex: 1000,
  },
  avatarMenu: {
    position: 'absolute',
    top: 50,
    left: -50,
    backgroundColor: '#fff',
    borderRadius: 12,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    minWidth: 150,
    zIndex: 10000,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  menuItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  menuItemLast: {
    padding: 15,
    borderBottomWidth: 0,
  },
  menuItemText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    margin: 20,
    marginBottom: 0,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  tabButton: {
    flex: 1,
    padding: 15,
    alignItems: 'center',
    borderRadius: 12,
  },
  tabButtonActive: {
    backgroundColor: '#4CAF50',
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  tabButtonTextActive: {
    color: '#fff',
  },
});

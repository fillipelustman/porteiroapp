import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Image,
  SafeAreaView,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import ProtectedRoute from '~/components/ProtectedRoute';
import { supabase } from '~/utils/supabase';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '~/hooks/useAuth';
import { flattenStyles } from '~/utils/styles';
import BottomNav from '~/components/BottomNav';

interface MoradorProfileData {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string;
  cpf: string;
  birth_date: string;
  apartment_number: string;
  building_id: string;
  avatar_url: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  created_at: string;
  updated_at: string;
}

export default function MoradorProfile() {
  const { user, signOut } = useAuth();
  const [, setProfile] = useState<MoradorProfileData | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    cpf: '',
    birth_date: '',
    apartment_number: '',
    avatar_url: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const fetchProfile = useCallback(async () => {
    try {
      console.log('🔍 DEBUG - User obtido:', user?.id);
      
      if (!user?.id) {
        console.log('❌ DEBUG - Usuário não autenticado');
        return;
      }

      // Log para debug - verificar todos os perfis existentes
      console.log('🔍 DEBUG - Buscando todos os perfis para debug...');
      const { data: allProfiles, error: allProfilesError } = await supabase
        .from('profiles')
        .select('user_id, full_name, email');
      
      console.log('📊 DEBUG - Todos os perfis na tabela:', allProfiles);
      console.log('📊 DEBUG - Erro ao buscar todos os perfis:', allProfilesError);

      // First get profile by user_id
      console.log('🔍 DEBUG - Executando query para buscar perfil do usuário:', user.id);
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      console.log('📊 DEBUG - Dados do perfil retornados:', profileData);
      console.log('❌ DEBUG - Erro do perfil:', profileError);

      if (profileError) {
        console.error('❌ Erro detalhado ao buscar perfil:', {
          code: profileError.code,
          message: profileError.message,
          details: profileError.details,
          hint: profileError.hint,
          user_id_buscado: user.id
        });
        Alert.alert('Erro', `Perfil não encontrado. Verifique se seu cadastro está completo. ${profileError.message}`);
        return;
      }

      // Then get apartment info using apartment_residents table
      console.log('🏠 DEBUG - Buscando informações do apartamento para profile_id:', profileData.id);
      const { data: apartmentData, error: apartmentError } = await supabase
        .from('apartment_residents')
        .select(`
          apartments!inner(
            number,
            building_id
          )
        `)
        .eq('profile_id', profileData.id)
        .single();

      console.log('🏠 DEBUG - Dados do apartamento retornados:', apartmentData);
      console.log('❌ DEBUG - Erro do apartamento:', apartmentError);

      const data = {
         ...profileData,
         apartments: apartmentData?.apartments || null
       };

       if (apartmentError) {
         console.warn('❌ Aviso ao buscar apartamento:', apartmentError);
         // Continue mesmo se não encontrar apartamento
       }

      const profileDataMapped: MoradorProfileData = {
        id: data.id,
        user_id: data.user_id,
        full_name: data.full_name || '',
        email: data.email || '',
        phone: data.phone || '',
        cpf: data.cpf || '',
        birth_date: data.birth_date || '',
        apartment_number: data.apartments?.number || '',
        building_id: data.apartments?.building_id || '',
        avatar_url: data.avatar_url || '',
        emergency_contact_name: data.emergency_contact_name || '',
        emergency_contact_phone: data.emergency_contact_phone || '',
        created_at: data.created_at,
        updated_at: data.updated_at,
      };

      console.log('✅ DEBUG - Perfil mapeado com sucesso:', profileDataMapped);
      setProfile(profileDataMapped);
      setFormData({
        full_name: profileDataMapped.full_name,
        email: profileDataMapped.email,
        phone: profileDataMapped.phone,
        cpf: profileDataMapped.cpf,
        birth_date: profileDataMapped.birth_date,
        apartment_number: profileDataMapped.apartment_number,
        avatar_url: profileDataMapped.avatar_url,
        emergency_contact_name: profileDataMapped.emergency_contact_name || '',
        emergency_contact_phone: profileDataMapped.emergency_contact_phone || '',
      });
    } catch (error) {
      console.error('❌ Erro geral ao buscar perfil:', {
        error,
        message: error.message,
        stack: error.stack
      });
      Alert.alert('Erro', `Erro interno do servidor: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Formatador de data de nascimento para padrão dd/mm/yyyy
  const formatBirthDate = (text: string) => {
    console.log('📅 LOG - Formatando data de nascimento:', { input: text });
    
    // Remove todos os caracteres não numéricos
    const numbers = text.replace(/\D/g, '');
    
    // Aplica a máscara dd/mm/yyyy
    let formatted = numbers;
    if (numbers.length >= 3) {
      formatted = `${numbers.slice(0, 2)}/${numbers.slice(2, 4)}`;
    }
    if (numbers.length >= 5) {
      formatted = `${numbers.slice(0, 2)}/${numbers.slice(2, 4)}/${numbers.slice(4, 8)}`;
    }
    
    console.log('📅 LOG - Data formatada:', { output: formatted });
    return formatted;
  };

  const validateForm = () => {
    console.log('🔍 LOG - Iniciando validação de dados de entrada');
    console.log('📊 LOG - Dados recebidos para validação:', {
      full_name: formData.full_name,
      phone: formData.phone,
      birth_date: formData.birth_date,
      emergency_contact_name: formData.emergency_contact_name,
      emergency_contact_phone: formData.emergency_contact_phone,
      avatar_url: formData.avatar_url ? 'URL presente' : 'Sem URL'
    });

    // Validação do nome completo
    console.log('✅ LOG - Validando nome completo:', formData.full_name);
    if (!formData.full_name.trim()) {
      console.log('❌ LOG - Erro de validação: Nome completo é obrigatório');
      Alert.alert('Erro de Validação', 'Nome completo é obrigatório');
      return false;
    }
    console.log('✅ LOG - Nome completo válido');

    // Validação do telefone
    if (formData.phone) {
      console.log('📞 LOG - Validando telefone:', formData.phone);
      const phoneRegex = /^\(?\d{2}\)?[\s-]?\d{4,5}[\s-]?\d{4}$/;
      const cleanPhone = formData.phone.replace(/\D/g, '');
      console.log('📞 LOG - Telefone limpo:', cleanPhone);
      
      if (!phoneRegex.test(formData.phone)) {
        console.log('❌ LOG - Erro de validação: Formato de telefone inválido');
        Alert.alert('Erro de Validação', 'Formato de telefone inválido');
        return false;
      }
      console.log('✅ LOG - Telefone válido');
    }

    // Validação da data de nascimento
    if (formData.birth_date) {
      console.log('📅 LOG - Validando data de nascimento:', formData.birth_date);
      const dateRegex = /^\d{2}\/\d{2}\/\d{4}$/;
      
      if (!dateRegex.test(formData.birth_date)) {
        console.log('❌ LOG - Erro de validação: Data de nascimento deve estar no formato DD/MM/AAAA');
        Alert.alert('Erro de Validação', 'Data de nascimento deve estar no formato DD/MM/AAAA');
        return false;
      }
      
      // Validação adicional da data
      const [day, month, year] = formData.birth_date.split('/').map(Number);
      const date = new Date(year, month - 1, day);
      const isValidDate = date.getDate() === day && date.getMonth() === month - 1 && date.getFullYear() === year;
      
      console.log('📅 LOG - Validação detalhada da data:', {
        day, month, year,
        dateObject: date,
        isValidDate
      });
      
      if (!isValidDate) {
        console.log('❌ LOG - Erro de validação: Data inválida');
        Alert.alert('Erro de Validação', 'Data de nascimento inválida');
        return false;
      }
      console.log('✅ LOG - Data de nascimento válida');
    }

    // Validação do telefone de emergência
    if (formData.emergency_contact_phone) {
      console.log('🚨 LOG - Validando telefone de emergência:', formData.emergency_contact_phone);
      const phoneRegex = /^\(?\d{2}\)?[\s-]?\d{4,5}[\s-]?\d{4}$/;
      const cleanPhone = formData.emergency_contact_phone.replace(/\D/g, '');
      console.log('🚨 LOG - Telefone de emergência limpo:', cleanPhone);
      
      if (!phoneRegex.test(formData.emergency_contact_phone)) {
        console.log('❌ LOG - Erro de validação: Formato de telefone do contato de emergência inválido');
        Alert.alert('Erro de Validação', 'Formato de telefone do contato de emergência inválido');
        return false;
      }
      console.log('✅ LOG - Telefone de emergência válido');
    }

    console.log('✅ LOG - Validação concluída com sucesso - Todos os dados são válidos');
    return true;
  };

  const handleSave = async () => {
    console.log('💾 LOG - Iniciando processo de salvamento do perfil');
    console.log('👤 LOG - Usuário autenticado:', { user_id: user?.id, email: user?.email });
    
    try {
      if (!user?.id) {
        console.log('❌ LOG - Erro: Usuário não autenticado');
        Alert.alert('Erro', 'Usuário não autenticado');
        return;
      }

      console.log('📊 LOG - Dados recebidos no submit:', {
        full_name: formData.full_name,
        phone: formData.phone,
        birth_date: formData.birth_date,
        avatar_url: formData.avatar_url ? 'URL presente' : 'Sem URL',
        emergency_contact_name: formData.emergency_contact_name,
        emergency_contact_phone: formData.emergency_contact_phone,
        timestamp: new Date().toISOString()
      });

      console.log('🔍 LOG - Iniciando validação dos dados antes do salvamento');
      if (!validateForm()) {
        console.log('❌ LOG - Validação falhou - Cancelando salvamento');
        return;
      }
      console.log('✅ LOG - Validação passou - Prosseguindo com salvamento');

      // Log do estado do banco ANTES da atualização
      console.log('🔍 LOG - Verificando estado atual do perfil no banco de dados');
      const { data: currentProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      console.log('📊 LOG - Estado do banco ANTES da atualização:', {
        profile_found: !!currentProfile,
        current_data: currentProfile,
        fetch_error: fetchError
      });

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.log('❌ LOG - Erro ao verificar estado atual do perfil:', fetchError);
      }

      // Preparar dados para atualização
      const updateData = {
        full_name: formData.full_name.trim(),
        phone: formData.phone.trim(),
        birth_date: formData.birth_date.trim(),
        avatar_url: formData.avatar_url,
        emergency_contact_name: formData.emergency_contact_name.trim(),
        emergency_contact_phone: formData.emergency_contact_phone.trim(),
        updated_at: new Date().toISOString(),
      };

      console.log('📝 LOG - Dados preparados para atualização:', updateData);
      console.log('🔄 LOG - Executando query de atualização no banco de dados');
      console.log('🎯 LOG - Condição da query: user_id =', user.id);

      const { data: updateResult, error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', user.id)
        .select();

      console.log('📊 LOG - Resultado da tentativa de atualização:', {
        success: !error,
        updated_data: updateResult,
        error_details: error,
        rows_affected: updateResult?.length || 0
      });

      if (error) {
        console.error('❌ LOG - Erro detalhado ao atualizar perfil:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
          user_id_usado: user.id,
          dados_enviados: updateData
        });
        
        if (error.code === 'PGRST116') {
          console.log('❌ LOG - Perfil não encontrado para user_id:', user.id);
          Alert.alert('Erro', 'Perfil não encontrado');
        } else if (error.code === '23505') {
          console.log('❌ LOG - Dados duplicados encontrados');
          Alert.alert('Erro', 'Dados duplicados encontrados');
        } else {
          console.log('❌ LOG - Erro genérico na atualização:', error.message);
          Alert.alert('Erro', `Não foi possível salvar as alterações: ${error.message}`);
        }
        return;
      }

      // Log do estado do banco APÓS a atualização
      console.log('🔍 LOG - Verificando estado do perfil após atualização');
      const { data: updatedProfile, error: postUpdateError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      console.log('📊 LOG - Estado do banco APÓS a atualização:', {
        profile_found: !!updatedProfile,
        updated_data: updatedProfile,
        post_update_error: postUpdateError,
        changes_persisted: !!updatedProfile
      });

      // Comparação dos dados antes e depois
      if (currentProfile && updatedProfile) {
        console.log('🔄 LOG - Comparação antes/depois:', {
          full_name: { antes: currentProfile.full_name, depois: updatedProfile.full_name },
          phone: { antes: currentProfile.phone, depois: updatedProfile.phone },
          birth_date: { antes: currentProfile.birth_date, depois: updatedProfile.birth_date },
          emergency_contact_name: { antes: currentProfile.emergency_contact_name, depois: updatedProfile.emergency_contact_name },
          emergency_contact_phone: { antes: currentProfile.emergency_contact_phone, depois: updatedProfile.emergency_contact_phone },
          updated_at: { antes: currentProfile.updated_at, depois: updatedProfile.updated_at }
        });
      }

      console.log('✅ LOG - Perfil atualizado com sucesso no banco de dados');
      console.log('📊 LOG - Mensagem de sucesso retornada pelo banco:', 'Operação concluída');
      
      Alert.alert('Sucesso', 'Perfil atualizado com sucesso!');
      setIsEditing(false);
      
      console.log('🔄 LOG - Recarregando dados do perfil após salvamento');
      fetchProfile();
      
    } catch (err) {
      console.error('❌ LOG - Erro interno capturado:', {
        error: err,
        message: err.message,
        stack: err.stack,
        name: err.name,
        user_id: user?.id,
        timestamp: new Date().toISOString()
      });
      Alert.alert('Erro', 'Erro interno do servidor');
    }
  };

  const handleImagePicker = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permissão necessária', 'Precisamos de permissão para acessar suas fotos');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaType.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setFormData({ ...formData, avatar_url: result.assets[0].uri });
      }
    } catch {
      Alert.alert('Erro', 'Não foi possível selecionar a imagem');
    }
  };

  const handleDeleteProfile = async () => {
    Alert.alert(
      'Excluir Perfil',
      'ATENÇÃO: Esta ação irá excluir permanentemente seu perfil e todos os dados associados. Esta ação não pode ser desfeita. Tem certeza que deseja continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              if (!user?.id) {
                Alert.alert('Erro', 'Usuário não autenticado');
                return;
              }

              const { error } = await supabase
                .from('profiles')
                .delete()
                .eq('id', user.id);

              if (error) {
                console.error('Erro ao excluir perfil:', error);
                Alert.alert('Erro', `Não foi possível excluir o perfil: ${error.message}`);
                return;
              }

              Alert.alert('Sucesso', 'Perfil excluído com sucesso!', [
                {
                  text: 'OK',
                  onPress: async () => {
                    await signOut();
                    router.replace('/');
                  },
                },
              ]);
            } catch (err) {
              console.error('Erro interno:', err);
              Alert.alert('Erro', 'Erro interno do servidor');
            }
          },
        },
      ]
    );
  };

  const handleLogout = async () => {
    Alert.alert('Confirmar Logout', 'Tem certeza que deseja sair?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sair',
        style: 'destructive',
        onPress: async () => {
          try {
            await signOut();
            router.replace('/');
          } catch {
            Alert.alert('Erro', 'Falha ao fazer logout');
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <ProtectedRoute redirectTo="/morador/login" userType="morador">
        <SafeAreaView style={styles.container}>
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Carregando perfil...</Text>
          </View>
        </SafeAreaView>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute redirectTo="/morador/login" userType="morador">
      <SafeAreaView style={styles.container}>
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.title}>👤 Meu Perfil</Text>
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => (isEditing ? handleSave() : setIsEditing(true))}>
              <Ionicons name={isEditing ? 'checkmark' : 'pencil'} size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content}>
            <View style={styles.photoSection}>
              <TouchableOpacity
                style={styles.photoContainer}
                onPress={isEditing ? handleImagePicker : undefined}>
                {formData.avatar_url ? (
                  <Image source={{ uri: formData.avatar_url }} style={styles.photo} />
                ) : (
                  <View style={styles.photoPlaceholder}>
                    <Ionicons name="person" size={60} color="#ccc" />
                  </View>
                )}
                {isEditing && (
                  <View style={styles.photoOverlay}>
                    <Ionicons name="camera" size={24} color="#fff" />
                  </View>
                )}
              </TouchableOpacity>
              <Text style={styles.photoLabel}>Foto do Perfil</Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>📋 Informações Pessoais</Text>

              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Nome Completo</Text>
                <TextInput
                  style={flattenStyles([styles.input, !isEditing && styles.inputDisabled])}
                  value={formData.full_name}
                  onChangeText={(text) => setFormData({ ...formData, full_name: text })}
                  editable={isEditing}
                  placeholder="Digite seu nome completo"
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Email</Text>
                <TextInput
                  style={flattenStyles([styles.input, styles.inputDisabled])}
                  value={formData.email}
                  editable={false}
                  placeholder="Email não pode ser alterado"
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Telefone</Text>
                <TextInput
                  style={flattenStyles([styles.input, !isEditing && styles.inputDisabled])}
                  value={formData.phone}
                  onChangeText={(text) => setFormData({ ...formData, phone: text })}
                  editable={isEditing}
                  placeholder="(11) 99999-9999"
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.fieldLabel}>CPF</Text>
                <TextInput
                  style={flattenStyles([styles.input, styles.inputDisabled])}
                  value={formData.cpf}
                  editable={false}
                  placeholder="CPF não pode ser alterado"
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Data de Nascimento</Text>
                <TextInput
                  style={flattenStyles([styles.input, !isEditing && styles.inputDisabled])}
                  value={formatBirthDate(formData.birth_date)}
                  onChangeText={(text) => {
                    console.log('📅 LOG - Data de nascimento digitada:', text);
                    const formattedDate = formatBirthDate(text);
                    console.log('📅 LOG - Data formatada:', formattedDate);
                    setFormData({ ...formData, birth_date: formattedDate });
                  }}
                  editable={isEditing}
                  placeholder="dd/mm/yyyy"
                  maxLength={10}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🏠 Informações do Apartamento</Text>

              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Número do Apartamento</Text>
                <TextInput
                  style={[styles.input, styles.inputDisabled]}
                  value={formData.apartment_number}
                  editable={false}
                  placeholder="Apartamento não pode ser alterado"
                />
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🚨 Contato de Emergência</Text>

              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Nome do Contato</Text>
                <TextInput
                  style={flattenStyles([styles.input, !isEditing && styles.inputDisabled])}
                  value={formData.emergency_contact_name}
                  onChangeText={(text) =>
                    setFormData({ ...formData, emergency_contact_name: text })
                  }
                  editable={isEditing}
                  placeholder="Nome do contato de emergência"
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Telefone do Contato</Text>
                <TextInput
                  style={flattenStyles([styles.input, !isEditing && styles.inputDisabled])}
                  value={formData.emergency_contact_phone}
                  onChangeText={(text) =>
                    setFormData({ ...formData, emergency_contact_phone: text })
                  }
                  editable={isEditing}
                  placeholder="(11) 99999-9999"
                  keyboardType="phone-pad"
                />
              </View>
            </View>

            <View style={styles.section}>
              <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteProfile}>
                <Ionicons name="trash" size={20} color="#fff" />
                <Text style={styles.deleteButtonText}>Excluir Perfil</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                <Ionicons name="log-out" size={20} color="#fff" />
                <Text style={styles.logoutButtonText}>Sair da Conta</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
        <BottomNav activeTab="profile" />
      </SafeAreaView>
    </ProtectedRoute>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  header: {
    backgroundColor: '#4CAF50',
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
    textAlign: 'center',
  },
  editButton: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  photoSection: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    marginBottom: 10,
  },
  photoContainer: {
    position: 'relative',
    marginBottom: 10,
  },
  photo: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  photoPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ddd',
  },
  photoOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#4CAF50',
    borderRadius: 20,
    padding: 8,
  },
  photoLabel: {
    fontSize: 14,
    color: '#666',
  },
  section: {
    backgroundColor: '#fff',
    padding: 20,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  field: {
    marginBottom: 15,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  inputDisabled: {
    backgroundColor: '#f5f5f5',
    color: '#666',
  },
  deleteButton: {
    backgroundColor: '#d32f2f',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  logoutButton: {
    backgroundColor: '#f44336',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});

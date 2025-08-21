import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  SafeAreaView,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { flattenStyles } from '../../utils/styles';

type FlowStep =
  | 'apartamento'
  | 'tipo'
  | 'empresa_prestador'
  | 'empresa_entrega'
  | 'nome'
  | 'cpf'
  | 'observacoes'
  | 'foto'
  | 'confirmacao';
type TipoVisita = 'social' | 'prestador' | 'entrega';
type EmpresaPrestador =
  | 'claro'
  | 'vivo'
  | 'encanador'
  | 'bombeiro_hidraulico'
  | 'dedetizacao'
  | 'eletricista'
  | 'pintor'
  | 'marceneiro';
type EmpresaEntrega =
  | 'rappi'
  | 'ifood'
  | 'uber_eats'
  | 'mercado_livre'
  | 'amazon'
  | 'correios'
  | 'outro';

interface RegistrarVisitanteProps {
  onClose: () => void;
  onConfirm?: (message: string) => void;
}

export default function RegistrarVisitante({ onClose, onConfirm }: RegistrarVisitanteProps) {
  const [currentStep, setCurrentStep] = useState<FlowStep>('apartamento');
  const [apartamento, setApartamento] = useState('');
  const [tipoVisita, setTipoVisita] = useState<TipoVisita | null>(null);
  const [empresaPrestador, setEmpresaPrestador] = useState<EmpresaPrestador | null>(null);
  const [empresaEntrega, setEmpresaEntrega] = useState<EmpresaEntrega | null>(null);
  const [nomeVisitante, setNomeVisitante] = useState('');
  const [cpfVisitante, setCpfVisitante] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [fotoTirada, setFotoTirada] = useState(false);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();

  const renderNumericKeypad = (
    value: string,
    setValue: (val: string) => void,
    onNext: () => void
  ) => (
    <View style={styles.keypadContainer}>
      <View style={styles.displayContainer}>
        <Text style={styles.displayLabel}>Número do Apartamento</Text>
        <Text style={styles.displayValue}>{value || '___'}</Text>
      </View>

      <View style={styles.keypad}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((num) => (
          <TouchableOpacity
            key={num}
            style={styles.keypadButton}
            onPress={() => setValue(value + num.toString())}>
            <Text style={styles.keypadButtonText}>{num}</Text>
          </TouchableOpacity>
        ))}

        <TouchableOpacity style={styles.keypadButton} onPress={() => setValue(value.slice(0, -1))}>
          <Text style={styles.keypadButtonText}>⌫</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={flattenStyles([styles.keypadButton, styles.confirmButton])}
          onPress={onNext}
          disabled={!value}>
          <Text style={styles.confirmButtonText}>✓</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderApartamentoStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>🏠 Apartamento</Text>
      <Text style={styles.stepSubtitle}>Digite o número do apartamento</Text>

      {renderNumericKeypad(apartamento, setApartamento, () => {
        if (apartamento) {
          setCurrentStep('tipo');
        }
      })}
    </View>
  );

  const renderEmpresaPrestadorStep = () => {
    const empresas = [
      { id: 'claro', nome: 'Claro', icon: '📱' },
      { id: 'vivo', nome: 'Vivo', icon: '📞' },
      { id: 'encanador', nome: 'Encanador', icon: '🔧' },
      { id: 'bombeiro_hidraulico', nome: 'Bombeiro Hidráulico', icon: '🚰' },
      { id: 'dedetizacao', nome: 'Dedetização', icon: '🐛' },
      { id: 'eletricista', nome: 'Eletricista', icon: '⚡' },
      { id: 'pintor', nome: 'Pintor', icon: '🎨' },
      { id: 'marceneiro', nome: 'Marceneiro', icon: '🪚' },
    ];

    return (
      <View style={styles.stepContainer}>
        <Text style={styles.stepTitle}>🔧 Empresa Prestadora</Text>
        <Text style={styles.stepSubtitle}>Qual empresa o prestador representa?</Text>

        <View style={styles.optionsContainer}>
          {empresas.map((empresa) => (
            <TouchableOpacity
              key={empresa.id}
              style={flattenStyles([styles.optionButton, styles.prestadorButton])}
              onPress={() => {
                setEmpresaPrestador(empresa.id as EmpresaPrestador);
                setCurrentStep('nome');
              }}>
              <Text style={styles.optionIcon}>{empresa.icon}</Text>
              <Text style={styles.optionTitle}>{empresa.nome}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  const renderEmpresaEntregaStep = () => {
    const empresas = [
      { id: 'rappi', nome: 'Rappi', icon: '🛵' },
      { id: 'ifood', nome: 'iFood', icon: '🍔' },
      { id: 'uber_eats', nome: 'Uber Eats', icon: '🚗' },
      { id: 'mercado_livre', nome: 'Mercado Livre', icon: '📦' },
      { id: 'amazon', nome: 'Amazon', icon: '📋' },
      { id: 'correios', nome: 'Correios', icon: '📮' },
      { id: 'outro', nome: 'Outro', icon: '📦' },
    ];

    return (
      <View style={styles.stepContainer}>
        <Text style={styles.stepTitle}>📦 Empresa de Entrega</Text>
        <Text style={styles.stepSubtitle}>Qual empresa de entrega?</Text>

        <View style={styles.optionsContainer}>
          {empresas.map((empresa) => (
            <TouchableOpacity
              key={empresa.id}
              style={flattenStyles([styles.optionButton, styles.entregaButton])}
              onPress={() => {
                setEmpresaEntrega(empresa.id as EmpresaEntrega);
                setCurrentStep('nome');
              }}>
              <Text style={styles.optionIcon}>{empresa.icon}</Text>
              <Text style={styles.optionTitle}>{empresa.nome}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  const renderTipoStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>👥 Tipo de Visita</Text>
      <Text style={styles.stepSubtitle}>Selecione o tipo de visita</Text>

      <View style={styles.optionsContainer}>
        <TouchableOpacity
          style={flattenStyles([styles.optionButton, styles.socialButton])}
          onPress={() => {
            setTipoVisita('social');
            setCurrentStep('nome');
          }}>
          <Text style={styles.optionIcon}>👨‍👩‍👧‍👦</Text>
          <Text style={styles.optionTitle}>Social</Text>
          <Text style={styles.optionDescription}>Visita familiar ou amigos</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={flattenStyles([styles.optionButton, styles.prestadorButton])}
          onPress={() => {
            setTipoVisita('prestador');
            setCurrentStep('empresa_prestador');
          }}>
          <Text style={styles.optionIcon}>🔧</Text>
          <Text style={styles.optionTitle}>Prestador de Serviço</Text>
          <Text style={styles.optionDescription}>Técnico, encanador, etc.</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={flattenStyles([styles.optionButton, styles.entregaButton])}
          onPress={() => {
            setTipoVisita('entrega');
            setCurrentStep('empresa_entrega');
          }}>
          <Text style={styles.optionIcon}>📦</Text>
          <Text style={styles.optionTitle}>Serviço de Entrega</Text>
          <Text style={styles.optionDescription}>Entregador de comida, etc.</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderNomeStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>✏️ Nome Completo</Text>
      <Text style={styles.stepSubtitle}>Digite o nome do visitante</Text>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.textInput}
          value={nomeVisitante}
          onChangeText={setNomeVisitante}
          placeholder="Nome completo do visitante"
          autoFocus
          autoCapitalize="words"
        />

        <TouchableOpacity
          style={flattenStyles([styles.nextButton, !nomeVisitante && styles.nextButtonDisabled])}
          onPress={() => {
            if (nomeVisitante.trim()) {
              setCurrentStep('cpf');
            }
          }}
          disabled={!nomeVisitante.trim()}>
          <Text style={styles.nextButtonText}>Continuar →</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderCpfStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>🆔 CPF</Text>
      <Text style={styles.stepSubtitle}>Digite o CPF do visitante</Text>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.textInput}
          value={cpfVisitante}
          onChangeText={setCpfVisitante}
          placeholder="000.000.000-00"
          keyboardType="numeric"
          autoFocus
          maxLength={14}
        />

        <TouchableOpacity
          style={flattenStyles([styles.nextButton, !cpfVisitante && styles.nextButtonDisabled])}
          onPress={() => {
            if (cpfVisitante.trim()) {
              setCurrentStep('observacoes');
            }
          }}
          disabled={!cpfVisitante.trim()}>
          <Text style={styles.nextButtonText}>Continuar →</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderObservacoesStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>📝 Observações</Text>
      <Text style={styles.stepSubtitle}>Adicione observações (opcional)</Text>

      <View style={styles.inputContainer}>
        <TextInput
          style={flattenStyles([styles.textInput, styles.textArea])}
          value={observacoes}
          onChangeText={setObservacoes}
          placeholder="Observações adicionais..."
          multiline
          numberOfLines={4}
          autoFocus
        />

        <TouchableOpacity style={styles.nextButton} onPress={() => setCurrentStep('foto')}>
          <Text style={styles.nextButtonText}>Continuar →</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderFotoStep = () => {
    if (!cameraPermission) {
      return <Text>Solicitando permissão da câmera...</Text>;
    }

    if (!cameraPermission.granted) {
      return (
        <View style={styles.stepContainer}>
          <Text style={styles.stepTitle}>📸 Permissão da Câmera</Text>
          <Text style={styles.stepSubtitle}>Precisamos de acesso à câmera para tirar a foto</Text>
          <TouchableOpacity style={styles.nextButton} onPress={requestCameraPermission}>
            <Text style={styles.nextButtonText}>Permitir Câmera</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.stepContainer}>
        <Text style={styles.stepTitle}>📸 Foto do Visitante</Text>
        <Text style={styles.stepSubtitle}>Tire uma foto do visitante</Text>

        {!fotoTirada ? (
          <View style={styles.cameraContainer}>
            <CameraView style={styles.camera} facing="back">
              <View style={styles.cameraOverlay}>
                <TouchableOpacity
                  style={styles.captureButton}
                  onPress={() => {
                    setFotoTirada(true);
                    setCurrentStep('confirmacao');
                  }}>
                  <Text style={styles.captureButtonText}>📸</Text>
                </TouchableOpacity>
              </View>
            </CameraView>
          </View>
        ) : (
          <View style={styles.photoTakenContainer}>
            <Text style={styles.photoTakenText}>✅ Foto capturada com sucesso!</Text>
            <TouchableOpacity
              style={styles.nextButton}
              onPress={() => setCurrentStep('confirmacao')}>
              <Text style={styles.nextButtonText}>Continuar →</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  const renderConfirmacaoStep = () => {
    const handleConfirm = () => {
      // Aqui você implementaria a lógica para salvar os dados
      console.log('Visitante registrado:', {
        apartamento,
        tipo: tipoVisita,
        empresa:
          tipoVisita === 'prestador'
            ? empresaPrestador
            : tipoVisita === 'entrega'
              ? empresaEntrega
              : null,
        nome: nomeVisitante,
        cpf: cpfVisitante,
        observacoes,
        fotoTirada,
      });

      const message = `O apartamento ${apartamento} foi notificado sobre a chegada de ${nomeVisitante}.`;

      if (onConfirm) {
        onConfirm(message);
      } else {
        Alert.alert('✅ Visitante Registrado!', message, [{ text: 'OK' }]);
        onClose();
      }
    };

    return (
      <View style={styles.stepContainer}>
        <Text style={styles.stepTitle}>✅ Confirmação</Text>
        <Text style={styles.stepSubtitle}>Revise os dados do visitante</Text>

        <View style={styles.summaryContainer}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Apartamento:</Text>
            <Text style={styles.summaryValue}>{apartamento}</Text>
          </View>

          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Tipo:</Text>
            <Text style={styles.summaryValue}>
              {tipoVisita === 'social'
                ? 'Social'
                : tipoVisita === 'prestador'
                  ? 'Prestador de Serviço'
                  : 'Serviço de Entrega'}
            </Text>
          </View>

          {(empresaPrestador || empresaEntrega) && (
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Empresa:</Text>
              <Text style={styles.summaryValue}>
                {empresaPrestador
                  ? empresaPrestador.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())
                  : empresaEntrega?.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
              </Text>
            </View>
          )}

          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Nome:</Text>
            <Text style={styles.summaryValue}>{nomeVisitante}</Text>
          </View>

          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>CPF:</Text>
            <Text style={styles.summaryValue}>{cpfVisitante}</Text>
          </View>

          {observacoes && (
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Observações:</Text>
              <Text style={styles.summaryValue}>{observacoes}</Text>
            </View>
          )}
        </View>

        <TouchableOpacity style={styles.confirmFinalButton} onPress={handleConfirm}>
          <Text style={styles.confirmFinalButtonText}>Confirmar Registro</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 'apartamento':
        return renderApartamentoStep();
      case 'tipo':
        return renderTipoStep();
      case 'empresa_prestador':
        return renderEmpresaPrestadorStep();
      case 'empresa_entrega':
        return renderEmpresaEntregaStep();
      case 'nome':
        return renderNomeStep();
      case 'cpf':
        return renderCpfStep();
      case 'observacoes':
        return renderObservacoesStep();
      case 'foto':
        return renderFotoStep();
      case 'confirmacao':
        return renderConfirmacaoStep();
      default:
        return renderApartamentoStep();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onClose}>
          <Text style={styles.backButtonText}>← Voltar</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Registrar Visitante</Text>
      </View>

      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${(Object.keys({ apartamento, tipo: tipoVisita, nome: nomeVisitante, cpf: cpfVisitante, observacoes: true, foto: fotoTirada, confirmacao: currentStep === 'confirmacao' }).filter(Boolean).length / 7) * 100}%`,
              },
            ]}
          />
        </View>
      </View>

      {renderCurrentStep()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#4CAF50',
  },
  backButton: {
    marginRight: 15,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  progressContainer: {
    padding: 20,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#e0e0e0',
    borderRadius: 2,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 2,
  },
  stepContainer: {
    flex: 1,
    padding: 20,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
  keypadContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  displayContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  displayLabel: {
    fontSize: 16,
    color: '#666',
    marginBottom: 10,
  },
  displayValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    letterSpacing: 2,
  },
  keypad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 15,
  },
  keypadButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  keypadButtonText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  confirmButton: {
    backgroundColor: '#4CAF50',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  optionsContainer: {
    gap: 20,
  },
  optionButton: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    borderLeftWidth: 4,
  },
  socialButton: {
    borderLeftColor: '#4CAF50',
  },
  prestadorButton: {
    borderLeftColor: '#FF9800',
  },
  entregaButton: {
    borderLeftColor: '#2196F3',
  },
  optionIcon: {
    fontSize: 40,
    marginBottom: 10,
  },
  optionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  optionDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  inputContainer: {
    gap: 20,
  },
  textInput: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  nextButton: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  nextButtonDisabled: {
    backgroundColor: '#ccc',
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cameraContainer: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 50,
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButtonText: {
    fontSize: 32,
  },
  photoTakenContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
  },
  photoTakenText: {
    fontSize: 18,
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  summaryContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    gap: 15,
  },
  summaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'right',
  },
  confirmFinalButton: {
    backgroundColor: '#4CAF50',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  confirmFinalButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

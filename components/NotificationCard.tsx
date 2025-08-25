import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Modal, TextInput } from 'react-native';
import { PendingNotification, NotificationResponse } from '~/hooks/usePendingNotifications';

// Legacy notification interface for backward compatibility
interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'visitor' | 'delivery' | 'communication' | 'emergency';
  created_at: string;
  read: boolean;
}

// Legacy props for backward compatibility
interface LegacyNotificationCardProps {
  notification: Notification;
  onPress?: (id: string) => void;
  onMarkAsRead?: (id: string) => void;
}

// New props for pending notifications
interface PendingNotificationCardProps {
  notification: PendingNotification;
  onRespond: (id: string, response: NotificationResponse) => Promise<{success: boolean; error?: string}>;
}

type NotificationCardProps = LegacyNotificationCardProps | PendingNotificationCardProps;

// Type guard to check if it's a pending notification
function isPendingNotification(props: NotificationCardProps): props is PendingNotificationCardProps {
  return 'onRespond' in props;
}

// Main component that routes to appropriate card type
export function NotificationCard(props: NotificationCardProps) {
  if (isPendingNotification(props)) {
    return <PendingNotificationCard {...props} />;
  } else {
    return <LegacyNotificationCard {...props} />;
  }
}

// Legacy notification card component
function LegacyNotificationCard({ notification, onPress, onMarkAsRead }: LegacyNotificationCardProps) {
  const getTypeIcon = () => {
    switch (notification.type) {
      case 'visitor':
        return '👋';
      case 'delivery':
        return '📦';
      case 'communication':
        return '📢';
      case 'emergency':
        return '🚨';
      default:
        return '🔔';
    }
  };

  const getTypeColor = () => {
    switch (notification.type) {
      case 'visitor':
        return '#4CAF50';
      case 'delivery':
        return '#9C27B0';
      case 'communication':
        return '#2196F3';
      case 'emergency':
        return '#F44336';
      default:
        return '#FF9800';
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'Agora';
    if (diffInMinutes < 60) return `${diffInMinutes}min atrás`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h atrás`;
    return date.toLocaleDateString('pt-BR');
  };

  return (
    <TouchableOpacity
      style={[
        styles.card,
        { borderLeftColor: getTypeColor() },
        !notification.read && styles.unreadCard,
      ]}
      onPress={() => onPress?.(notification.id)}>
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>{getTypeIcon()}</Text>
        </View>

        <View style={styles.content}>
          <View style={styles.titleRow}>
            <Text style={[styles.title, !notification.read && styles.unreadTitle]}>
              {notification.title}
            </Text>
            {!notification.read && <View style={styles.unreadDot} />}
          </View>

          <Text style={styles.message} numberOfLines={2}>
            {notification.message}
          </Text>

          <Text style={styles.time}>{formatTime(notification.created_at)}</Text>
        </View>
      </View>

      {!notification.read && onMarkAsRead && (
        <TouchableOpacity
          style={styles.markAsReadButton}
          onPress={(e) => {
            e.stopPropagation();
            onMarkAsRead(notification.id);
          }}>
          <Text style={styles.markAsReadText}>Marcar como lida</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

// New pending notification card component
function PendingNotificationCard({ notification, onRespond }: PendingNotificationCardProps) {
  const [responding, setResponding] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);

  const getTimeAgo = (dateString: string) => {
    const now = new Date();
    const sent = new Date(dateString);
    const diffMinutes = Math.floor((now.getTime() - sent.getTime()) / (1000 * 60));
    
    if (diffMinutes < 1) return 'agora';
    if (diffMinutes < 60) return `há ${diffMinutes} min`;
    
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `há ${diffHours}h`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `há ${diffDays} dias`;
  };

  const getNotificationTitle = () => {
    switch (notification.entry_type) {
      case 'visitor':
        return `👤 ${notification.guest_name} quer subir`;
      case 'delivery':
        return `📦 Encomenda de ${notification.delivery_sender || 'remetente desconhecido'}`;
      case 'vehicle':
        return `🚗 Veículo ${notification.license_plate} quer entrar`;
      default:
        return '📬 Nova notificação';
    }
  };

  const getNotificationDetails = () => {
    switch (notification.entry_type) {
      case 'visitor':
        return notification.purpose || 'Visita';
      case 'delivery':
        return notification.delivery_description || 'Encomenda chegou';
      case 'vehicle':
        return `${notification.vehicle_brand || ''} ${notification.vehicle_model || ''} ${notification.vehicle_color || ''}`.trim();
      default:
        return '';
    }
  };

  const handleApprove = async () => {
    if (notification.entry_type === 'delivery') {
      setShowDeliveryModal(true);
      return;
    }
    
    setResponding(true);
    const result = await onRespond(notification.id, { action: 'approve' });
    
    if (!result.success) {
      Alert.alert('Erro', 'Não foi possível aprovar a solicitação');
    }
    setResponding(false);
  };

  const handleReject = () => {
    setShowRejectModal(true);
  };

  const confirmReject = async () => {
    setResponding(true);
    const result = await onRespond(notification.id, {
      action: 'reject',
      reason: rejectReason || 'Não autorizado'
    });
    
    if (!result.success) {
      Alert.alert('Erro', 'Não foi possível recusar a solicitação');
    }
    
    setShowRejectModal(false);
    setRejectReason('');
    setResponding(false);
  };

  const handleDeliveryDestination = async (destination: 'portaria' | 'elevador' | 'apartamento') => {
    setResponding(true);
    const result = await onRespond(notification.id, {
      action: 'approve',
      delivery_destination: destination
    });
    
    if (!result.success) {
      Alert.alert('Erro', 'Não foi possível processar a encomenda');
    }
    
    setShowDeliveryModal(false);
    setResponding(false);
  };

  return (
    <View style={styles.notificationCard}>
      <View style={styles.notificationHeader}>
        <Text style={styles.notificationTitle}>{getNotificationTitle()}</Text>
        <Text style={styles.notificationTime}>
          {getTimeAgo(notification.notification_sent_at)}
        </Text>
      </View>
      
      {getNotificationDetails() && (
        <Text style={styles.notificationDetails}>{getNotificationDetails()}</Text>
      )}
      
      <View style={styles.notificationActions}>
        {notification.entry_type === 'delivery' ? (
          <>
            <TouchableOpacity 
              style={[styles.actionButton, styles.approveButton]}
              onPress={handleApprove}
              disabled={responding}
            >
              <Text style={styles.actionButtonText}>📦 Processar</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.actionButton, styles.denyButton]}
              onPress={handleReject}
              disabled={responding}
            >
              <Text style={styles.actionButtonText}>❌ Recusar</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity 
              style={[styles.actionButton, styles.approveButton]}
              onPress={handleApprove}
              disabled={responding}
            >
              <Text style={styles.actionButtonText}>✅ Aprovar</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.actionButton, styles.denyButton]}
              onPress={handleReject}
              disabled={responding}
            >
              <Text style={styles.actionButtonText}>❌ Recusar</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Modal de rejeição */}
      <Modal
        visible={showRejectModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRejectModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Motivo da recusa</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Digite o motivo (opcional)"
              value={rejectReason}
              onChangeText={setRejectReason}
              multiline
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowRejectModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={confirmReject}
                disabled={responding}
              >
                <Text style={styles.confirmButtonText}>Recusar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de destino da encomenda */}
      <Modal
        visible={showDeliveryModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDeliveryModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Onde deixar a encomenda?</Text>
            <TouchableOpacity
              style={[styles.deliveryOption, styles.porterButton]}
              onPress={() => handleDeliveryDestination('portaria')}
              disabled={responding}
            >
              <Text style={styles.deliveryOptionText}>🏢 Deixar na portaria</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.deliveryOption, styles.elevatorButton]}
              onPress={() => handleDeliveryDestination('elevador')}
              disabled={responding}
            >
              <Text style={styles.deliveryOptionText}>🛗 Colocar no elevador</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.deliveryOption, styles.apartmentButton]}
              onPress={() => handleDeliveryDestination('apartamento')}
              disabled={responding}
            >
              <Text style={styles.deliveryOptionText}>🚪 Trazer ao apartamento</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton]}
              onPress={() => setShowDeliveryModal(false)}
            >
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginVertical: 6,
    borderLeftWidth: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  unreadCard: {
    backgroundColor: '#f8f9ff',
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    fontSize: 20,
  },
  content: {
    flex: 1,
    gap: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  unreadTitle: {
    fontWeight: 'bold',
    color: '#000',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2196F3',
    marginLeft: 8,
  },
  message: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  time: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  markAsReadButton: {
    marginTop: 10,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#e3f2fd',
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  markAsReadText: {
    fontSize: 12,
    color: '#1976d2',
    fontWeight: '600',
  },
  // Pending notification styles
  notificationCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginVertical: 6,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    marginRight: 8,
  },
  notificationTime: {
    fontSize: 12,
    color: '#666',
  },
  notificationDetails: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  notificationActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  approveButton: {
    backgroundColor: '#4CAF50',
  },
  denyButton: {
    backgroundColor: '#f44336',
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
  },
  confirmButton: {
    backgroundColor: '#f44336',
  },
  cancelButtonText: {
    color: '#666',
    fontWeight: '600',
  },
  confirmButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  deliveryOption: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginBottom: 12,
    alignItems: 'center',
  },
  porterButton: {
    backgroundColor: '#e3f2fd',
  },
  elevatorButton: {
    backgroundColor: '#f3e5f5',
  },
  apartmentButton: {
    backgroundColor: '#e8f5e8',
  },
  deliveryOptionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
});

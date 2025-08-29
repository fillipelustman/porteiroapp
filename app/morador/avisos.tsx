import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  SafeAreaView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '~/hooks/useAuth';
import { supabase } from '~/utils/supabase';
import BottomNav from '~/components/BottomNav';

interface Communication {
  id: string;
  title: string;
  content: string;
  type: string;
  priority: string;
  created_at: string;
  updated_at: string;
}

interface PollOption {
  id: string;
  poll_id: string;
  option_text: string;
  votes_count: number;
}

interface Poll {
  id: string;
  title: string;
  description: string;
  building_id: string;
  created_at: string;
  expires_at: string;
  is_active: boolean;
  options: PollOption[];
  total_votes: number;
  user_voted: boolean;
  user_vote_option_id?: string;
}

interface UserApartment {
  building_id: string;
}

const AvisosTab = () => {
  const { user } = useAuth();
  const [communications, setCommunications] = useState<Communication[]>([]);
  const [polls, setPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(true);
  const [pollsLoading, setPollsLoading] = useState(true);
  const [pollsError, setPollsError] = useState<string | null>(null);
  const [userApartment, setUserApartment] = useState<UserApartment | null>(null);
  const [votingPollId, setVotingPollId] = useState<string | null>(null);

  useEffect(() => {
    fetchCommunications();
  }, [user?.building_id]);

  useEffect(() => {
    fetchUserApartment();
  }, [user?.id]);

  useEffect(() => {
    if (userApartment) {
      fetchPolls();
    }
  }, [userApartment]);

  // Buscar apartamento do usuário
  const fetchUserApartment = async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('apartment_residents')
        .select('apartment_id, apartments!inner(building_id)')
        .eq('profile_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Erro ao buscar apartamento:', error);
        setPollsError('Erro ao carregar dados do apartamento');
        return;
      }

      if (!data) {
        setPollsError('Nenhum apartamento vinculado à sua conta.');
        return;
      }

      // Acessar building_id através do objeto apartments
      const apartmentData = {
        building_id: data.apartments.building_id
      };
      setUserApartment(apartmentData);
    } catch (err) {
      console.error('Erro ao buscar apartamento:', err);
      setPollsError('Erro ao carregar dados do apartamento');
    }
  };

  const fetchCommunications = async () => {
    if (!user?.building_id) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('communications')
        .select('*')
        .eq('building_id', user.building_id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar comunicados:', error);
      } else {
        setCommunications(data || []);
      }
    } catch (error) {
      console.error('Erro ao buscar comunicados:', error);
    } finally {
      setLoading(false);
    }
  };

  // Buscar enquetes ativas
  const fetchPolls = async () => {
    if (!userApartment?.building_id || !user?.id) return;

    try {
      setPollsLoading(true);
      setPollsError(null);

      // Buscar enquetes ativas do prédio
      const { data: pollsData, error: pollsError } = await supabase
        .from('polls')
        .select(`
          id,
          title,
          description,
          building_id,
          created_at,
          expires_at,
          is_active
        `)
        .eq('building_id', userApartment.building_id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (pollsError) {
        console.error('Erro ao buscar enquetes:', pollsError);
        setPollsError('Erro ao carregar enquetes');
        return;
      }

      if (!pollsData || pollsData.length === 0) {
        setPolls([]);
        return;
      }

      // Para cada enquete, buscar opções e votos
      const pollsWithDetails = await Promise.all(
        pollsData.map(async (poll) => {
          // Buscar opções da enquete
          const { data: optionsData, error: optionsError } = await supabase
            .from('poll_options')
            .select('id, poll_id, option_text')
            .eq('poll_id', poll.id)
            .order('id');

          if (optionsError) {
            console.error('Erro ao buscar opções:', optionsError);
            return null;
          }

          // Buscar votos para cada opção
          const optionsWithVotes = await Promise.all(
            (optionsData || []).map(async (option) => {
              const { count, error: countError } = await supabase
                .from('poll_votes')
                .select('*', { count: 'exact', head: true })
                .eq('poll_option_id', option.id);

              if (countError) {
                console.error('Erro ao contar votos:', countError);
                return { ...option, votes_count: 0 };
              }

              return { ...option, votes_count: count || 0 };
            })
          );

          // Verificar se o usuário já votou nesta enquete
          const { data: userVoteData, error: userVoteError } = await supabase
            .from('poll_votes')
            .select('poll_option_id')
            .eq('user_id', user.id)
            .in('poll_option_id', optionsWithVotes.map(opt => opt.id))
            .maybeSingle();

          const userVoted = !!userVoteData;
          const totalVotes = optionsWithVotes.reduce((sum, opt) => sum + opt.votes_count, 0);

          // Verificar se a enquete ainda está ativa (não expirou)
          const isExpired = new Date(poll.expires_at) < new Date();

          return {
            ...poll,
            is_active: poll.is_active && !isExpired,
            options: optionsWithVotes,
            total_votes: totalVotes,
            user_voted: !!userVoted,
            user_vote_option_id: userVoted ? userVoteData.poll_option_id : undefined
          };
        })
      );

      const validPolls = pollsWithDetails.filter(poll => poll !== null) as Poll[];
      setPolls(validPolls);
    } catch (err) {
      console.error('Erro ao buscar enquetes:', err);
      setPollsError('Erro ao carregar enquetes');
    } finally {
      setPollsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Votar em uma opção
  const handleVote = async (pollId: string, optionId: string) => {
    if (!user?.id || votingPollId) return;

    try {
      setVotingPollId(pollId);

      // Verificar se o usuário já votou nesta enquete
      const poll = polls.find(p => p.id === pollId);
      if (!poll) return;

      if (poll.user_voted) {
        Alert.alert('Aviso', 'Você já votou nesta enquete.');
        return;
      }

      if (!poll.is_active) {
        Alert.alert('Aviso', 'Esta enquete não está mais ativa.');
        return;
      }

      // Registrar o voto
      const { error: voteError } = await supabase
        .from('poll_votes')
        .insert({
          user_id: user.id,
          poll_option_id: optionId,
          created_at: new Date().toISOString()
        });

      if (voteError) {
        console.error('Erro ao votar:', voteError);
        Alert.alert('Erro', 'Não foi possível registrar seu voto. Tente novamente.');
        return;
      }

      Alert.alert('Sucesso', 'Seu voto foi registrado com sucesso!');
      
      // Atualizar as enquetes para refletir o novo voto
      await fetchPolls();
    } catch (err) {
      console.error('Erro ao votar:', err);
      Alert.alert('Erro', 'Não foi possível registrar seu voto. Tente novamente.');
    } finally {
      setVotingPollId(null);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'maintenance':
        return '🛠️';
      case 'event':
        return '🎉';
      case 'warning':
        return '⚠️';
      case 'info':
        return 'ℹ️';
      default:
        return '📢';
    }
  };

  // Configurar subscrição em tempo real
  useEffect(() => {
    if (!userApartment?.building_id) return;

    // Subscrever a mudanças nas enquetes
    const pollsSubscription = supabase
      .channel('polls_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'polls',
          filter: `building_id=eq.${userApartment.building_id}`
        },
        () => {
          fetchPolls();
        }
      )
      .subscribe();

    // Subscrever a mudanças nos votos
    const votesSubscription = supabase
      .channel('votes_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'poll_votes'
        },
        () => {
          fetchPolls();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(pollsSubscription);
      supabase.removeChannel(votesSubscription);
    };
  }, [userApartment?.building_id]);

  // Renderizar opção de voto
  const renderPollOption = (poll: Poll, option: PollOption) => {
    const percentage = poll.total_votes > 0 ? (option.votes_count / poll.total_votes) * 100 : 0;
    const isUserVote = poll.user_vote_option_id === option.id;
    const canVote = !poll.user_voted && poll.is_active;
    const isVoting = votingPollId === poll.id;

    return (
      <TouchableOpacity
        key={option.id}
        style={[
          styles.pollOption,
          isUserVote && styles.userVoteOption,
          !canVote && styles.disabledOption
        ]}
        onPress={() => canVote && !isVoting ? handleVote(poll.id, option.id) : null}
        disabled={!canVote || isVoting}
      >
        <View style={styles.optionContent}>
          <View style={styles.optionHeader}>
            <Text style={[styles.optionText, isUserVote && styles.userVoteText]}>
              {option.option_text}
            </Text>
            {isUserVote && (
              <Ionicons name="checkmark-circle" size={20} color="#10B981" />
            )}
          </View>
          
          {poll.user_voted && (
            <View style={styles.voteResults}>
              <View style={styles.progressBar}>
                <View 
                  style={[
                    styles.progressFill, 
                    { width: `${percentage}%` },
                    isUserVote && styles.userVoteProgress
                  ]} 
                />
              </View>
              <Text style={styles.voteCount}>
                {option.votes_count} voto{option.votes_count !== 1 ? 's' : ''} ({percentage.toFixed(1)}%)
              </Text>
            </View>
          )}
        </View>
        
        {isVoting && (
          <ActivityIndicator size="small" color="#3B82F6" style={styles.votingIndicator} />
        )}
      </TouchableOpacity>
    );
  };

  // Renderizar enquete
  const renderPoll = (poll: Poll) => {
    const isExpired = new Date(poll.expires_at) < new Date();
    const expiresDate = new Date(poll.expires_at);
    
    return (
      <View key={poll.id} style={styles.pollCard}>
        <View style={styles.pollHeader}>
          <Text style={styles.pollTitle}>{poll.title}</Text>
          <View style={[
            styles.statusBadge,
            poll.is_active && !isExpired ? styles.activeBadge : styles.inactiveBadge
          ]}>
            <Text style={[
              styles.statusText,
              poll.is_active && !isExpired ? styles.activeStatusText : styles.inactiveStatusText
            ]}>
              {poll.is_active && !isExpired ? 'Ativa' : 'Encerrada'}
            </Text>
          </View>
        </View>
        
        {poll.description && (
          <Text style={styles.pollDescription}>{poll.description}</Text>
        )}
        
        <Text style={styles.pollExpiry}>
          {isExpired ? 'Encerrada em' : 'Encerra em'}: {expiresDate.toLocaleDateString('pt-BR')} às {expiresDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
        </Text>
        
        <View style={styles.pollOptions}>
          {poll.options.map(option => renderPollOption(poll, option))}
        </View>
        
        {poll.user_voted && (
          <View style={styles.voteInfo}>
            <Ionicons name="checkmark-circle" size={16} color="#10B981" />
            <Text style={styles.voteInfoText}>
              Você já votou nesta enquete. Total de votos: {poll.total_votes}
            </Text>
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.content, styles.centerContent]}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Carregando comunicados...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📢 Avisos do Condomínio</Text>

          {communications.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>📭</Text>
              <Text style={styles.emptyStateTitle}>Nenhum comunicado disponível</Text>
              <Text style={styles.emptyStateDescription}>
                Não há comunicados para o seu prédio no momento.
              </Text>
            </View>
          ) : (
            communications.map((communication) => (
              <View key={communication.id} style={styles.noticeCard}>
                <Text style={styles.noticeTitle}>
                  {getTypeIcon(communication.type)} {communication.title}
                </Text>
                <Text style={styles.noticeDescription}>
                  {communication.content}
                </Text>
                <Text style={styles.noticeTime}>
                  Publicado em {formatDate(communication.created_at)}
                </Text>
              </View>
            ))
          )}
        </View>

        {/* Seção de Enquetes */}
        <View style={styles.divider} />
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🗳️ Enquetes Ativas</Text>
          
          {pollsLoading ? (
            <View style={styles.pollsLoadingContainer}>
              <ActivityIndicator size="large" color="#3B82F6" />
              <Text style={styles.loadingText}>Carregando enquetes...</Text>
            </View>
          ) : pollsError ? (
            <View style={styles.pollsErrorContainer}>
              <Ionicons name="alert-circle" size={48} color="#EF4444" />
              <Text style={styles.errorText}>{pollsError}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={() => {
                setPollsError(null);
                fetchUserApartment();
              }}>
                <Text style={styles.retryButtonText}>Tentar Novamente</Text>
              </TouchableOpacity>
            </View>
          ) : polls.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>🗳️</Text>
              <Text style={styles.emptyStateTitle}>Nenhuma enquete ativa</Text>
              <Text style={styles.emptyStateDescription}>
                As enquetes criadas pelo administrador aparecerão aqui.
              </Text>
            </View>
          ) : (
            polls.map(renderPoll)
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  emptyStateDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  noticeCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  noticeTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  noticeDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 8,
  },
  noticeTime: {
    fontSize: 12,
    color: '#999',
  },
  // Estilos para enquetes
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 20,
    marginVertical: 10,
  },
  pollsLoadingContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  pollsErrorContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  pollCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  pollHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  pollTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    flex: 1,
    marginRight: 12,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  activeBadge: {
    backgroundColor: '#D1FAE5',
  },
  inactiveBadge: {
    backgroundColor: '#FEE2E2',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  activeStatusText: {
    color: '#065F46',
  },
  inactiveStatusText: {
    color: '#991B1B',
  },
  pollDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
    lineHeight: 20,
  },
  pollExpiry: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 16,
  },
  pollOptions: {
    gap: 8,
  },
  pollOption: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#FFFFFF',
  },
  userVoteOption: {
    borderColor: '#10B981',
    backgroundColor: '#F0FDF4',
  },
  disabledOption: {
    opacity: 0.7,
  },
  optionContent: {
    flex: 1,
  },
  optionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  optionText: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
  },
  userVoteText: {
    color: '#065F46',
    fontWeight: '500',
  },
  voteResults: {
    marginTop: 8,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    marginBottom: 4,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3B82F6',
    borderRadius: 3,
  },
  userVoteProgress: {
    backgroundColor: '#10B981',
  },
  voteCount: {
    fontSize: 12,
    color: '#6B7280',
  },
  votingIndicator: {
    marginLeft: 8,
  },
  voteInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    padding: 8,
    backgroundColor: '#F0FDF4',
    borderRadius: 6,
  },
  voteInfoText: {
    fontSize: 12,
    color: '#065F46',
    marginLeft: 6,
  },
  errorText: {
    marginTop: 12,
    fontSize: 16,
    color: '#EF4444',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    backgroundColor: '#3B82F6',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
});

export default AvisosTab;
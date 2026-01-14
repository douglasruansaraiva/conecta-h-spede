import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

export function useICalSync() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncResults, setLastSyncResults] = useState(null);
  const queryClient = useQueryClient();

  const syncAll = async (companyId) => {
    setIsSyncing(true);
    try {
      const response = await base44.functions.invoke('syncIcal', {
        company_id: companyId
      });

      if (response.data?.success) {
        setLastSyncResults(response.data.results);
        
        const totalSynced = response.data.results.reduce(
          (acc, r) => acc + (r.synced || 0),
          0
        );

        toast.success(`${totalSynced} reservas sincronizadas de ${response.data.results.length} acomodações`);

        queryClient.invalidateQueries({ queryKey: ['reservations'] });
        queryClient.invalidateQueries({ queryKey: ['blocked-dates'] });
      } else {
        throw new Error(response.data?.error || 'Erro desconhecido');
      }
    } catch (error) {
      console.error('Sync error:', error);
      toast.error(error.message || 'Não foi possível sincronizar os calendários');
    } finally {
      setIsSyncing(false);
    }
  };

  const syncAccommodation = async (accommodationId, companyId) => {
    setIsSyncing(true);
    try {
      const response = await base44.functions.invoke('syncIcal', {
        accommodation_id: accommodationId,
        company_id: companyId
      });

      if (response.data?.success) {
        setLastSyncResults(response.data.results);
        
        const result = response.data.results[0];
        const totalSynced = result?.synced || 0;

        toast.success(`${totalSynced} reservas sincronizadas para ${result?.accommodation_name || 'a acomodação'}`);

        queryClient.invalidateQueries({ queryKey: ['reservations'] });
        queryClient.invalidateQueries({ queryKey: ['blocked-dates'] });
      } else {
        throw new Error(response.data?.error || 'Erro desconhecido');
      }
    } catch (error) {
      console.error('Sync error:', error);
      toast.error(error.message || 'Não foi possível sincronizar o calendário');
    } finally {
      setIsSyncing(false);
    }
  };

  return {
    syncAll,
    syncAccommodation,
    isSyncing,
    lastSyncResults,
  };
}
import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Plus, 
  Search,
  CalendarDays,
  List
} from "lucide-react";
import ReservationCard from '@/components/reservations/ReservationCard';
import CalendarGrid from '@/components/reservations/CalendarGrid';
import ReservationForm from '@/components/forms/ReservationForm';
import PaymentForm from '@/components/forms/PaymentForm';
import CompanyGuard from '@/components/auth/CompanyGuard';

function ReservationsContent({ user, company }) {
  const [view, setView] = useState('list');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editingReservation, setEditingReservation] = useState(null);
  const [paymentReservation, setPaymentReservation] = useState(null);
  const [selectedAccommodation, setSelectedAccommodation] = useState(null);
  const [selectedDates, setSelectedDates] = useState(null);
  const queryClient = useQueryClient();

  const { data: accommodations = [] } = useQuery({
    queryKey: ['accommodations', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      return await base44.entities.Accommodation.filter({ company_id: company.id });
    },
    enabled: !!company?.id
  });

  const { data: reservations = [], isLoading } = useQuery({
    queryKey: ['reservations', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      return await base44.entities.Reservation.filter({ company_id: company.id }, '-created_date');
    },
    enabled: !!company?.id
  });

  const { data: blockedDates = [] } = useQuery({
    queryKey: ['blockedDates', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      return await base44.entities.BlockedDate.filter({ company_id: company.id });
    },
    enabled: !!company?.id
  });

  const filteredReservations = reservations.filter(r => {
    const matchesSearch = !search || 
      r.guest_name?.toLowerCase().includes(search.toLowerCase()) ||
      r.guest_email?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleEdit = (reservation) => {
    setEditingReservation(reservation);
    setFormOpen(true);
  };

  const handleStatusChange = async (reservation, newStatus) => {
    await base44.entities.Reservation.update(reservation.id, { status: newStatus });
    queryClient.invalidateQueries(['reservations']);
  };

  const handleAddPayment = (reservation) => {
    setPaymentReservation(reservation);
  };

  const handleFormClose = () => {
    setFormOpen(false);
    setEditingReservation(null);
    setSelectedAccommodation(null);
    setSelectedDates(null);
  };

  const handleFormSave = () => {
    queryClient.invalidateQueries(['reservations']);
  };

  const handleDateRangeSelect = (range) => {
    setSelectedDates(range);
    setFormOpen(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Reservas</h1>
            <p className="text-slate-500">Gerencie todas as reservas</p>
          </div>
          <Button 
            onClick={() => setFormOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nova Reserva
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Buscar por hóspede..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Tabs value={statusFilter} onValueChange={setStatusFilter}>
            <TabsList>
              <TabsTrigger value="all">Todas</TabsTrigger>
              <TabsTrigger value="pending">Pendentes</TabsTrigger>
              <TabsTrigger value="confirmed">Confirmadas</TabsTrigger>
              <TabsTrigger value="checked_in">Hospedados</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex border rounded-lg overflow-hidden">
            <Button
              variant={view === 'list' ? 'default' : 'ghost'}
              size="icon"
              onClick={() => setView('list')}
              className={view === 'list' ? 'bg-emerald-600' : ''}
            >
              <List className="w-4 h-4" />
            </Button>
            <Button
              variant={view === 'calendar' ? 'default' : 'ghost'}
              size="icon"
              onClick={() => setView('calendar')}
              className={view === 'calendar' ? 'bg-emerald-600' : ''}
            >
              <CalendarDays className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        {view === 'calendar' ? (
          <CalendarGrid
            reservations={reservations}
            blockedDates={blockedDates}
            onDateRangeSelect={handleDateRangeSelect}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredReservations.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <CalendarDays className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">Nenhuma reserva encontrada</p>
              </div>
            ) : (
              filteredReservations.map(reservation => (
                <ReservationCard
                  key={reservation.id}
                  reservation={reservation}
                  accommodation={accommodations.find(a => a.id === reservation.accommodation_id)}
                  onEdit={() => handleEdit(reservation)}
                  onStatusChange={(status) => handleStatusChange(reservation, status)}
                  onAddPayment={() => handleAddPayment(reservation)}
                />
              ))
            )}
          </div>
        )}
      </div>

      {/* Forms */}
      <ReservationForm
        open={formOpen}
        onClose={handleFormClose}
        reservation={editingReservation}
        companyId={company?.id}
        accommodations={accommodations}
        preselectedAccommodation={selectedAccommodation}
        preselectedDates={selectedDates}
        onSave={handleFormSave}
      />

      <PaymentForm
        open={!!paymentReservation}
        onClose={() => setPaymentReservation(null)}
        reservation={paymentReservation}
        companyId={company?.id}
        onSave={() => {
          queryClient.invalidateQueries(['reservations']);
          queryClient.invalidateQueries(['transactions']);
        }}
      />
    </div>
  );
}

export default function Reservations() {
  return (
    <CompanyGuard>
      {({ user, company }) => <ReservationsContent user={user} company={company} />}
    </CompanyGuard>
  );
}
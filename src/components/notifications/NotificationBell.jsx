import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Bell, Check, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale/pt-BR';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function NotificationBell({ userEmail, companyId }) {
  const queryClient = useQueryClient();

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications', userEmail, companyId],
    queryFn: async () => {
      if (!userEmail || !companyId) return [];
      return await base44.entities.Notification.filter({ 
        user_email: userEmail,
        company_id: companyId
      });
    },
    enabled: !!userEmail && !!companyId,
    refetchInterval: 30000 // Recarrega a cada 30 segundos
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = async (notificationId) => {
    await base44.entities.Notification.update(notificationId, { read: true });
    queryClient.invalidateQueries(['notifications']);
  };

  const markAllAsRead = async () => {
    const unreadNotifications = notifications.filter(n => !n.read);
    for (const notification of unreadNotifications) {
      await base44.entities.Notification.update(notification.id, { read: true });
    }
    queryClient.invalidateQueries(['notifications']);
  };

  const deleteNotification = async (notificationId) => {
    await base44.entities.Notification.delete(notificationId);
    queryClient.invalidateQueries(['notifications']);
  };

  const getNotificationIcon = (type) => {
    const icons = {
      new_reservation: '🎉',
      check_in_today: '✅',
      check_out_today: '👋',
      cancellation: '❌',
      payment_received: '💰'
    };
    return icons[type] || '📢';
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <Badge 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-red-500 text-white text-xs"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold text-slate-800">Notificações</h3>
          {unreadCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={markAllAsRead}
              className="text-xs"
            >
              Marcar todas como lidas
            </Button>
          )}
        </div>
        
        <div className="max-h-96 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              <Bell className="w-12 h-12 mx-auto mb-2 text-slate-300" />
              <p className="text-sm">Nenhuma notificação</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications
                .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
                .map(notification => (
                  <div 
                    key={notification.id}
                    className={`p-4 hover:bg-slate-50 transition-colors ${!notification.read ? 'bg-blue-50' : ''}`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">{getNotificationIcon(notification.type)}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-medium text-sm text-slate-800">{notification.title}</h4>
                          <div className="flex gap-1">
                            {!notification.read && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => markAsRead(notification.id)}
                              >
                                <Check className="w-3 h-3" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-red-500"
                              onClick={() => deleteNotification(notification.id)}
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                        <p className="text-xs text-slate-600 mt-1">{notification.message}</p>
                        <p className="text-xs text-slate-400 mt-1">
                          {format(new Date(notification.created_date), "dd 'de' MMM 'às' HH:mm", { locale: ptBR })}
                        </p>
                        {notification.link && (
                          <Link 
                            to={notification.link}
                            className="text-xs text-emerald-600 hover:text-emerald-700 mt-1 inline-block"
                          >
                            Ver detalhes →
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
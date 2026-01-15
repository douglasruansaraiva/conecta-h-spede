import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Home, Plus, Loader2 } from "lucide-react";

export default function CompanyGuard({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
      } catch (error) {
        console.error('Error loading user:', error);
      } finally {
        setLoading(false);
      }
    };
    loadUser();
  }, []);

  const { data: companies = [], isLoading: loadingCompanies, error } = useQuery({
    queryKey: ['companies', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      return await base44.entities.Company.filter({ owner_email: user.email });
    },
    enabled: !!user?.email,
    retry: 1
  });

  if (loading || (loadingCompanies && !error)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#2C5F5D] animate-spin" />
      </div>
    );
  }

  // Se houve erro ao carregar empresas, ainda assim continua
  if (error) {
    console.error('Erro ao carregar empresas:', error);
  }

  // Se não tem empresas e não está carregando, mostra tela de setup
  if (!loadingCompanies && companies.length === 0 && user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-[#2C5F5D]/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Home className="w-8 h-8 text-[#2C5F5D]" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Bem-vindo!</h2>
            <p className="text-slate-600 mb-6">
              Para começar, configure sua empresa (hotel, pousada ou chalé).
            </p>
            <Link to={createPageUrl('Settings')}>
              <Button className="bg-gradient-to-r from-[#2C5F5D] to-[#3A7A77] hover:from-[#234B49] hover:to-[#2C5F5D] text-white shadow-md">
                <Plus className="w-4 h-4 mr-2" />
                Configurar Minha Empresa
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const company = companies[0];
  
  // Support both function and element children
  if (typeof children === 'function') {
    return children({ user, company });
  }
  
  return children;
}
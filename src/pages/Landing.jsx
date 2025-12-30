import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Home, 
  Calendar, 
  DollarSign, 
  Users, 
  BarChart3, 
  CheckCircle,
  Zap,
  Shield,
  Clock,
  ArrowRight
} from "lucide-react";
import { base44 } from '@/api/base44Client';

export default function Landing() {
  const handleLogin = () => {
    base44.auth.redirectToLogin();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-lg sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img 
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6953171ec03673207b7f83ca/f92c42ff8_conedePerfilCONECTAHSPEDE.png" 
              alt="Conecta Hóspede" 
              className="w-10 h-10 object-contain"
            />
            <div className="flex flex-col leading-none">
              <span className="font-bold text-[#2C5F5D] text-sm">CONECTA</span>
              <span className="font-bold text-[#2C5F5D] text-sm">HÓSPEDE</span>
            </div>
          </div>
          <Button 
            onClick={handleLogin}
            className="bg-gradient-to-r from-[#2C5F5D] to-[#3A7A77] hover:from-[#234B49] hover:to-[#2C5F5D] text-white shadow-md"
          >
            Entrar
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-800 mb-6 leading-tight">
            Gerencie suas Hospedagens
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#2C5F5D] to-[#3A7A77]">
              de Forma Simples
            </span>
          </h1>
          <p className="text-xl text-slate-600 mb-8 max-w-2xl mx-auto">
            Sistema completo para gestão de pousadas, hotéis e chalés. 
            Controle reservas, hóspedes e finanças em um só lugar.
          </p>
          <Button 
            onClick={handleLogin}
            size="lg"
            className="bg-gradient-to-r from-[#2C5F5D] to-[#3A7A77] hover:from-[#234B49] hover:to-[#2C5F5D] text-white shadow-xl text-lg px-8 py-6 h-auto"
          >
            Começar Gratuitamente
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
          <p className="text-sm text-slate-500 mt-4">Comece agora com sua conta Google</p>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-4 sm:px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-slate-800 text-center mb-12">
            Tudo que você precisa para gerenciar suas hospedagens
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="bg-slate-50 border-slate-200 hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#2C5F5D] to-[#3A7A77] flex items-center justify-center mb-4">
                  <Home className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-slate-800 mb-2">Gestão de Acomodações</h3>
                <p className="text-slate-600">
                  Cadastre e gerencie todos os seus quartos, suítes e chalés com fotos e detalhes completos.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-slate-50 border-slate-200 hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#2C5F5D] to-[#3A7A77] flex items-center justify-center mb-4">
                  <Calendar className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-slate-800 mb-2">Calendário Inteligente</h3>
                <p className="text-slate-600">
                  Visualize e gerencie reservas com calendário interativo. Integração com Airbnb, Booking e VRBO.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-slate-50 border-slate-200 hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#2C5F5D] to-[#3A7A77] flex items-center justify-center mb-4">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-slate-800 mb-2">Cadastro de Hóspedes</h3>
                <p className="text-slate-600">
                  Mantenha histórico completo dos seus hóspedes e suas preferências.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-slate-50 border-slate-200 hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#2C5F5D] to-[#3A7A77] flex items-center justify-center mb-4">
                  <DollarSign className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-slate-800 mb-2">Controle Financeiro</h3>
                <p className="text-slate-600">
                  Acompanhe receitas, despesas e lucros com relatórios completos e gráficos detalhados.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-slate-50 border-slate-200 hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#2C5F5D] to-[#3A7A77] flex items-center justify-center mb-4">
                  <BarChart3 className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-slate-800 mb-2">Relatórios e Análises</h3>
                <p className="text-slate-600">
                  Tome decisões baseadas em dados com relatórios de desempenho e ocupação.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-slate-50 border-slate-200 hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#2C5F5D] to-[#3A7A77] flex items-center justify-center mb-4">
                  <Zap className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-slate-800 mb-2">Reservas Online</h3>
                <p className="text-slate-600">
                  Link personalizado para seus hóspedes fazerem reservas diretamente online.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-20 px-4 sm:px-6 bg-slate-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-slate-800 text-center mb-12">
            Por que escolher o Conecta Hóspede?
          </h2>
          <div className="space-y-6">
            {[
              { icon: CheckCircle, text: "Interface intuitiva e fácil de usar" },
              { icon: Clock, text: "Economize tempo com automações" },
              { icon: Shield, text: "Seus dados seguros na nuvem" },
              { icon: Zap, text: "Acesse de qualquer lugar, a qualquer hora" },
              { icon: BarChart3, text: "Decisões baseadas em dados reais" },
              { icon: DollarSign, text: "Aumente sua receita e controle seus gastos" }
            ].map((item, index) => (
              <div key={index} className="flex items-center gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#2C5F5D] to-[#3A7A77] flex items-center justify-center flex-shrink-0">
                  <item.icon className="w-6 h-6 text-white" />
                </div>
                <p className="text-lg text-slate-700">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 bg-gradient-to-r from-[#2C5F5D] to-[#3A7A77]">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
            Pronto para começar?
          </h2>
          <p className="text-xl text-white/90 mb-8">
            Comece a gerenciar suas hospedagens de forma profissional hoje mesmo.
          </p>
          <Button 
            onClick={handleLogin}
            size="lg"
            className="bg-white text-[#2C5F5D] hover:bg-slate-100 shadow-xl text-lg px-8 py-6 h-auto font-semibold"
          >
            Entrar com Google
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-8 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-slate-500">
            © 2025 Conecta Hóspede. Sistema de gestão para hospedagens.
          </p>
        </div>
      </footer>
    </div>
  );
}
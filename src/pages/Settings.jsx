import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Building2, 
  Save, 
  Loader2,
  Upload,
  Link as LinkIcon,
  Clock,
  FileText,
  ExternalLink,
  Copy,
  Check,
  Calendar,
  Megaphone,
  CreditCard
} from "lucide-react";
import { createPageUrl } from '@/utils';
import { toast } from "sonner";
import SeasonalPricing from '@/components/settings/SeasonalPricing';
import MarketingSettings from '@/components/settings/MarketingSettings';

export default function Settings() {
  const [user, setUser] = useState(null);
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    logo_url: '',
    cover_image_url: '',
    address: '',
    city: '',
    state: '',
    phone: '',
    email: '',
    website: '',
    check_in_time: '14:00',
    check_out_time: '12:00',
    cancellation_policy: '',
    payment_instructions: '',
    stripe_publishable_key: '',
    stripe_secret_key: ''
  });
  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      const userData = await base44.auth.me();
      setUser(userData);
    };
    loadUser();
  }, []);

  const { data: companies = [] } = useQuery({
    queryKey: ['companies', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      return await base44.entities.Company.filter({ owner_email: user.email });
    },
    enabled: !!user?.email
  });

  const { data: accommodations = [] } = useQuery({
    queryKey: ['accommodations', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      return await base44.entities.Accommodation.filter({ company_id: company.id });
    },
    enabled: !!company?.id
  });

  useEffect(() => {
    if (companies.length > 0) {
      const comp = companies[0];
      setCompany(comp);
      setFormData({
        name: comp.name || '',
        slug: comp.slug || '',
        description: comp.description || '',
        logo_url: comp.logo_url || '',
        cover_image_url: comp.cover_image_url || '',
        address: comp.address || '',
        city: comp.city || '',
        state: comp.state || '',
        phone: comp.phone || '',
        email: comp.email || '',
        website: comp.website || '',
        check_in_time: comp.check_in_time || '14:00',
        check_out_time: comp.check_out_time || '12:00',
        cancellation_policy: comp.cancellation_policy || '',
        payment_instructions: comp.payment_instructions || '',
        stripe_publishable_key: comp.stripe_publishable_key || '',
        stripe_secret_key: comp.stripe_secret_key || ''
      });
    }
  }, [companies]);

  const handleImageUpload = async (e, field) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData(prev => ({ ...prev, [field]: file_url }));
      toast.success('Imagem enviada com sucesso!');
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      toast.error('Erro ao enviar imagem. Tente novamente.');
    } finally {
      setUploading(false);
    }
  };

  const generateSlug = (name) => {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  const handleNameChange = (name) => {
    setFormData(prev => ({
      ...prev,
      name,
      slug: prev.slug || generateSlug(name)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const data = {
      ...formData,
      slug: generateSlug(formData.slug), // Garantir que o slug seja válido antes de salvar
      owner_email: user?.email
    };

    if (company) {
      await base44.entities.Company.update(company.id, data);
    } else {
      await base44.entities.Company.create(data);
    }

    queryClient.invalidateQueries(['companies']);
    setLoading(false);
    toast.success('Configurações salvas com sucesso!');
  };

  const bookingUrl = formData.slug ? `${window.location.origin}${createPageUrl('Reservas')}?c=${formData.slug}` : '';

  const copyBookingUrl = () => {
    navigator.clipboard.writeText(bookingUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-4xl mx-auto p-4 sm:p-6">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">Configurações</h1>
          <p className="text-slate-500">Configure sua empresa e preferências</p>
        </div>

        <form onSubmit={handleSubmit}>
          <Tabs defaultValue="company" className="space-y-6">
            <TabsList className="bg-white border flex-wrap h-auto gap-1 p-1">
              <TabsTrigger value="company" className="text-xs sm:text-sm">
                <Building2 className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Empresa</span>
                <span className="sm:hidden">Info</span>
              </TabsTrigger>
              <TabsTrigger value="booking" className="text-xs sm:text-sm">
                <LinkIcon className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Reservas Online</span>
                <span className="sm:hidden">Reservas</span>
              </TabsTrigger>
              <TabsTrigger value="payments" className="text-xs sm:text-sm">
                <CreditCard className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                Pagamentos
              </TabsTrigger>
              <TabsTrigger value="seasonal" className="text-xs sm:text-sm">
                <Calendar className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Temporadas</span>
                <span className="sm:hidden">Preços</span>
              </TabsTrigger>
              <TabsTrigger value="policies" className="text-xs sm:text-sm">
                <FileText className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                Políticas
              </TabsTrigger>
              <TabsTrigger value="marketing" className="text-xs sm:text-sm">
                <Megaphone className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                Marketing
              </TabsTrigger>
            </TabsList>

            {/* Company Tab */}
            <TabsContent value="company">
              <Card>
                <CardHeader>
                  <CardTitle>Informações da Empresa</CardTitle>
                  <CardDescription>Dados básicos do seu estabelecimento</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Logo and Cover */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <Label className="mb-2 block">Logo</Label>
                      <div className="flex items-center gap-4">
                        {formData.logo_url ? (
                          <img 
                            src={formData.logo_url} 
                            alt="Logo" 
                            className="w-20 h-20 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="w-20 h-20 rounded-lg bg-slate-100 flex items-center justify-center">
                            <Building2 className="w-8 h-8 text-slate-400" />
                          </div>
                        )}
                        <label className="cursor-pointer">
                          <Button type="button" variant="outline" size="sm" asChild>
                            <span>
                              {uploading ? (
                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                              ) : (
                                <Upload className="w-4 h-4 mr-2" />
                              )}
                              Upload
                            </span>
                          </Button>
                          <input 
                            type="file" 
                            accept="image/*" 
                            className="hidden" 
                            onChange={(e) => handleImageUpload(e, 'logo_url')}
                          />
                        </label>
                      </div>
                    </div>
                    <div>
                      <Label className="mb-2 block">Imagem de Capa</Label>
                      <div className="flex items-center gap-4">
                        {formData.cover_image_url ? (
                          <img 
                            src={formData.cover_image_url} 
                            alt="Cover" 
                            className="w-32 h-20 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="w-32 h-20 rounded-lg bg-slate-100 flex items-center justify-center">
                            <Upload className="w-6 h-6 text-slate-400" />
                          </div>
                        )}
                        <label className="cursor-pointer">
                          <Button type="button" variant="outline" size="sm" asChild>
                            <span>
                              <Upload className="w-4 h-4 mr-2" />
                              Upload
                            </span>
                          </Button>
                          <input 
                            type="file" 
                            accept="image/*" 
                            className="hidden" 
                            onChange={(e) => handleImageUpload(e, 'cover_image_url')}
                          />
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label>Nome da Empresa *</Label>
                      <Input
                        value={formData.name}
                        onChange={(e) => handleNameChange(e.target.value)}
                        placeholder="Pousada Exemplo"
                        required
                      />
                    </div>
                    <div>
                      <Label>URL (slug) *</Label>
                      <Input
                        value={formData.slug}
                        onChange={(e) => setFormData({ ...formData, slug: generateSlug(e.target.value) })}
                        placeholder="pousada-exemplo"
                        required
                      />
                      <p className="text-xs text-slate-500 mt-1">Apenas letras, números e hífens (sem espaços)</p>
                    </div>
                  </div>

                  <div>
                    <Label>Descrição</Label>
                    <Textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Descreva seu estabelecimento..."
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="sm:col-span-2">
                      <Label>Endereço</Label>
                      <Input
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        placeholder="Rua, número..."
                      />
                    </div>
                    <div>
                      <Label>Cidade</Label>
                      <Input
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <Label>Estado</Label>
                      <Input
                        value={formData.state}
                        onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Telefone</Label>
                      <Input
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="(00) 00000-0000"
                      />
                    </div>
                    <div>
                      <Label>Email</Label>
                      <Input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Payments Tab */}
            <TabsContent value="payments">
              <Card>
                <CardHeader>
                  <CardTitle>Pagamentos Online (Stripe)</CardTitle>
                  <CardDescription>Configure o Stripe para aceitar pagamentos com cartão</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <strong>Como obter suas chaves do Stripe:</strong>
                    </p>
                    <ol className="text-sm text-blue-700 mt-2 ml-4 list-decimal space-y-1">
                      <li>Acesse <a href="https://dashboard.stripe.com/register" target="_blank" rel="noopener noreferrer" className="underline">dashboard.stripe.com</a></li>
                      <li>Faça login ou crie uma conta</li>
                      <li>Vá em "Desenvolvedores" → "Chaves de API"</li>
                      <li>Copie suas chaves e cole abaixo</li>
                    </ol>
                  </div>

                  <div>
                    <Label>Chave Publicável (Publishable Key)</Label>
                    <Input
                      type="text"
                      value={formData.stripe_publishable_key}
                      onChange={(e) => setFormData({ ...formData, stripe_publishable_key: e.target.value })}
                      placeholder="pk_test_..."
                      className="font-mono text-sm"
                    />
                    <p className="text-xs text-slate-500 mt-1">Começa com pk_test_ ou pk_live_</p>
                  </div>

                  <div>
                    <Label>Chave Secreta (Secret Key)</Label>
                    <Input
                      type="password"
                      value={formData.stripe_secret_key}
                      onChange={(e) => setFormData({ ...formData, stripe_secret_key: e.target.value })}
                      placeholder="sk_test_..."
                      className="font-mono text-sm"
                    />
                    <p className="text-xs text-slate-500 mt-1">Começa com sk_test_ ou sk_live_</p>
                  </div>

                  {formData.stripe_publishable_key && formData.stripe_secret_key && (
                    <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                      <p className="text-sm text-emerald-800 flex items-center gap-2">
                        <Check className="w-4 h-4" />
                        Pagamentos online configurados! Seus clientes poderão pagar com cartão.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Booking Tab */}
            <TabsContent value="booking">
              <Card>
                <CardHeader>
                  <CardTitle>Reservas Online</CardTitle>
                  <CardDescription>Configurações para reservas diretas</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Booking URL */}
                  {bookingUrl && (
                   <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                     <Label className="text-emerald-800 mb-2 block">Link para Reservas</Label>
                     <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                       <Input value={bookingUrl} readOnly className="bg-white flex-1" />
                       <div className="flex gap-2">
                       <Button type="button" variant="outline" size="icon" onClick={copyBookingUrl} className="flex-shrink-0">
                          {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                        </Button>
                        <a href={bookingUrl} target="_blank" rel="noopener noreferrer">
                          <Button type="button" variant="outline" size="icon" className="flex-shrink-0">
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                        </a>
                        </div>
                      </div>
                      <p className="text-sm text-emerald-600 mt-2">
                        Envie este link para seus clientes fazerem reservas diretas
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        Horário de Check-in
                      </Label>
                      <Input
                        type="time"
                        value={formData.check_in_time}
                        onChange={(e) => setFormData({ ...formData, check_in_time: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        Horário de Check-out
                      </Label>
                      <Input
                        type="time"
                        value={formData.check_out_time}
                        onChange={(e) => setFormData({ ...formData, check_out_time: e.target.value })}
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Instruções de Pagamento</Label>
                    <Textarea
                      value={formData.payment_instructions}
                      onChange={(e) => setFormData({ ...formData, payment_instructions: e.target.value })}
                      placeholder="Informe como o cliente deve realizar o pagamento..."
                      rows={4}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Seasonal Pricing Tab */}
            <TabsContent value="seasonal">
              <SeasonalPricing companyId={company?.id} accommodations={accommodations} />
            </TabsContent>

            {/* Policies Tab */}
            <TabsContent value="policies">
              <Card>
                <CardHeader>
                  <CardTitle>Políticas</CardTitle>
                  <CardDescription>Política de cancelamento e termos</CardDescription>
                </CardHeader>
                <CardContent>
                  <div>
                    <Label>Política de Cancelamento</Label>
                    <Textarea
                      value={formData.cancellation_policy}
                      onChange={(e) => setFormData({ ...formData, cancellation_policy: e.target.value })}
                      placeholder="Descreva sua política de cancelamento..."
                      rows={6}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Marketing Tab */}
            <TabsContent value="marketing">
              <MarketingSettings companyId={company?.id} />
            </TabsContent>
          </Tabs>

          <div className="mt-6 flex justify-end">
            <Button type="submit" disabled={loading} className="bg-gradient-to-r from-[#2C5F5D] to-[#3A7A77] hover:from-[#234B49] hover:to-[#2C5F5D] text-white w-full sm:w-auto shadow-md">
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              Salvar Configurações
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
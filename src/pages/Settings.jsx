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
  Star,
  Plus,
  Trash2,
  MessageSquare
} from "lucide-react";
import { createPageUrl } from '@/utils';
import { toast } from "sonner";
import SeasonalPricing from '@/components/settings/SeasonalPricing';

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
    testimonials: [],
    benefits: [],
    faqs: [],
    facebook_pixel_id: ''
  });
  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
      } catch (error) {
        console.error('Erro ao carregar usuário:', error);
      }
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
        testimonials: comp.testimonials || [],
        benefits: comp.benefits || [],
        faqs: comp.faqs || [],
        facebook_pixel_id: comp.facebook_pixel_id || ''
      });
    }
  }, [companies]);

  const handleImageUpload = async (e, field) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setFormData(prev => ({ ...prev, [field]: file_url }));
    setUploading(false);
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

  const bookingUrl = formData.slug ? `${window.location.origin}${createPageUrl('PublicBooking')}?c=${formData.slug}` : '';

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
            <TabsList className="bg-white border">
              <TabsTrigger value="company">
                <Building2 className="w-4 h-4 mr-2" />
                Empresa
              </TabsTrigger>
              <TabsTrigger value="booking">
                <LinkIcon className="w-4 h-4 mr-2" />
                Reservas Online
              </TabsTrigger>
              <TabsTrigger value="seasonal">
                <Calendar className="w-4 h-4 mr-2" />
                Temporadas
              </TabsTrigger>
              <TabsTrigger value="policies">
                <FileText className="w-4 h-4 mr-2" />
                Políticas
              </TabsTrigger>
              <TabsTrigger value="marketing">
                <MessageSquare className="w-4 h-4 mr-2" />
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
                        onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                        placeholder="pousada-exemplo"
                        required
                      />
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
            <TabsContent value="marketing" className="space-y-6">
              {/* Facebook Pixel */}
              <Card>
                <CardHeader>
                  <CardTitle>Pixel do Facebook</CardTitle>
                  <CardDescription>Rastreie conversões e visualizações de página</CardDescription>
                </CardHeader>
                <CardContent>
                  <div>
                    <Label>ID do Pixel do Facebook</Label>
                    <Input
                      value={formData.facebook_pixel_id}
                      onChange={(e) => setFormData({ ...formData, facebook_pixel_id: e.target.value })}
                      placeholder="123456789012345"
                    />
                    <p className="text-xs text-slate-500 mt-2">
                      O Pixel rastreará automaticamente visualizações de página e leads (reservas concluídas)
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Testimonials */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Star className="w-5 h-5" />
                    Depoimentos de Hóspedes
                  </CardTitle>
                  <CardDescription>Adicione avaliações para aumentar a confiança</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {formData.testimonials?.map((testimonial, index) => (
                    <div key={index} className="p-4 border rounded-lg space-y-3">
                      <div className="flex justify-between items-start">
                        <span className="text-sm font-medium text-slate-700">Depoimento {index + 1}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            const newTestimonials = formData.testimonials.filter((_, i) => i !== index);
                            setFormData({ ...formData, testimonials: newTestimonials });
                          }}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                      <div className="grid gap-3">
                        <div>
                          <Label className="text-xs">Nome</Label>
                          <Input
                            value={testimonial.name}
                            onChange={(e) => {
                              const newTestimonials = [...formData.testimonials];
                              newTestimonials[index].name = e.target.value;
                              setFormData({ ...formData, testimonials: newTestimonials });
                            }}
                            placeholder="Nome do hóspede"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Depoimento</Label>
                          <Textarea
                            value={testimonial.text}
                            onChange={(e) => {
                              const newTestimonials = [...formData.testimonials];
                              newTestimonials[index].text = e.target.value;
                              setFormData({ ...formData, testimonials: newTestimonials });
                            }}
                            placeholder="O que o hóspede disse..."
                            rows={2}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-xs">Data</Label>
                            <Input
                              value={testimonial.date}
                              onChange={(e) => {
                                const newTestimonials = [...formData.testimonials];
                                newTestimonials[index].date = e.target.value;
                                setFormData({ ...formData, testimonials: newTestimonials });
                              }}
                              placeholder="Janeiro 2025"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Avaliação (1-5)</Label>
                            <Input
                              type="number"
                              min="1"
                              max="5"
                              value={testimonial.rating}
                              onChange={(e) => {
                                const newTestimonials = [...formData.testimonials];
                                newTestimonials[index].rating = parseInt(e.target.value);
                                setFormData({ ...formData, testimonials: newTestimonials });
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setFormData({
                        ...formData,
                        testimonials: [...(formData.testimonials || []), { name: '', text: '', date: '', rating: 5 }]
                      });
                    }}
                    className="w-full"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar Depoimento
                  </Button>
                </CardContent>
              </Card>

              {/* Benefits */}
              <Card>
                <CardHeader>
                  <CardTitle>Benefícios de Reservar Direto</CardTitle>
                  <CardDescription>Destaque as vantagens de reservar pelo seu site</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {formData.benefits?.map((benefit, index) => (
                    <div key={index} className="p-4 border rounded-lg space-y-3">
                      <div className="flex justify-between items-start">
                        <span className="text-sm font-medium text-slate-700">Benefício {index + 1}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            const newBenefits = formData.benefits.filter((_, i) => i !== index);
                            setFormData({ ...formData, benefits: newBenefits });
                          }}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                      <div className="grid gap-3">
                        <div>
                          <Label className="text-xs">Título</Label>
                          <Input
                            value={benefit.title}
                            onChange={(e) => {
                              const newBenefits = [...formData.benefits];
                              newBenefits[index].title = e.target.value;
                              setFormData({ ...formData, benefits: newBenefits });
                            }}
                            placeholder="Ex: Melhor Preço"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Descrição</Label>
                          <Textarea
                            value={benefit.description}
                            onChange={(e) => {
                              const newBenefits = [...formData.benefits];
                              newBenefits[index].description = e.target.value;
                              setFormData({ ...formData, benefits: newBenefits });
                            }}
                            placeholder="Descreva o benefício..."
                            rows={2}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Ícone</Label>
                          <select
                            value={benefit.icon}
                            onChange={(e) => {
                              const newBenefits = [...formData.benefits];
                              newBenefits[index].icon = e.target.value;
                              setFormData({ ...formData, benefits: newBenefits });
                            }}
                            className="w-full p-2 border rounded-md"
                          >
                            <option value="DollarSign">Dólar (Preço)</option>
                            <option value="Gift">Presente (Benefícios)</option>
                            <option value="Shield">Escudo (Segurança/Flexibilidade)</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setFormData({
                        ...formData,
                        benefits: [...(formData.benefits || []), { title: '', description: '', icon: 'DollarSign' }]
                      });
                    }}
                    className="w-full"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar Benefício
                  </Button>
                </CardContent>
              </Card>

              {/* FAQs */}
              <Card>
                <CardHeader>
                  <CardTitle>Perguntas Frequentes</CardTitle>
                  <CardDescription>Responda às dúvidas mais comuns dos hóspedes</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {formData.faqs?.map((faq, index) => (
                    <div key={index} className="p-4 border rounded-lg space-y-3">
                      <div className="flex justify-between items-start">
                        <span className="text-sm font-medium text-slate-700">FAQ {index + 1}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            const newFaqs = formData.faqs.filter((_, i) => i !== index);
                            setFormData({ ...formData, faqs: newFaqs });
                          }}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                      <div className="grid gap-3">
                        <div>
                          <Label className="text-xs">Pergunta</Label>
                          <Input
                            value={faq.question}
                            onChange={(e) => {
                              const newFaqs = [...formData.faqs];
                              newFaqs[index].question = e.target.value;
                              setFormData({ ...formData, faqs: newFaqs });
                            }}
                            placeholder="Como funciona o processo de reserva?"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Resposta</Label>
                          <Textarea
                            value={faq.answer}
                            onChange={(e) => {
                              const newFaqs = [...formData.faqs];
                              newFaqs[index].answer = e.target.value;
                              setFormData({ ...formData, faqs: newFaqs });
                            }}
                            placeholder="Responda a pergunta..."
                            rows={3}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setFormData({
                        ...formData,
                        faqs: [...(formData.faqs || []), { question: '', answer: '' }]
                      });
                    }}
                    className="w-full"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar Pergunta
                  </Button>
                </CardContent>
              </Card>
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
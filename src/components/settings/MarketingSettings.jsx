import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  Edit, 
  Trash2, 
  Loader2,
  Star,
  MessageSquare,
  HelpCircle
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";

export default function MarketingSettings({ companyId }) {
  const [testimonialDialog, setTestimonialDialog] = useState(false);
  const [faqDialog, setFaqDialog] = useState(false);
  const [editingTestimonial, setEditingTestimonial] = useState(null);
  const [editingFaq, setEditingFaq] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [loading, setLoading] = useState(false);
  
  const [testimonialForm, setTestimonialForm] = useState({
    guest_name: '',
    rating: 5,
    comment: '',
    active: true
  });

  const [faqForm, setFaqForm] = useState({
    question: '',
    answer: '',
    order: 0,
    active: true
  });

  const queryClient = useQueryClient();

  // Fetch testimonials
  const { data: testimonials = [] } = useQuery({
    queryKey: ['testimonials', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      return await base44.entities.Testimonial.filter({ company_id: companyId });
    },
    enabled: !!companyId
  });

  // Fetch FAQs
  const { data: faqs = [] } = useQuery({
    queryKey: ['faqs', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      return await base44.entities.FAQ.filter({ company_id: companyId });
    },
    enabled: !!companyId
  });

  // Handle testimonial submit
  const handleTestimonialSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const data = {
      ...testimonialForm,
      company_id: companyId,
      rating: parseInt(testimonialForm.rating)
    };

    if (editingTestimonial) {
      await base44.entities.Testimonial.update(editingTestimonial.id, data);
    } else {
      await base44.entities.Testimonial.create(data);
    }

    queryClient.invalidateQueries(['testimonials']);
    setLoading(false);
    setTestimonialDialog(false);
    resetTestimonialForm();
  };

  // Handle FAQ submit
  const handleFaqSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const data = {
      ...faqForm,
      company_id: companyId,
      order: parseInt(faqForm.order)
    };

    if (editingFaq) {
      await base44.entities.FAQ.update(editingFaq.id, data);
    } else {
      await base44.entities.FAQ.create(data);
    }

    queryClient.invalidateQueries(['faqs']);
    setLoading(false);
    setFaqDialog(false);
    resetFaqForm();
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    
    if (deleteConfirm.type === 'testimonial') {
      await base44.entities.Testimonial.delete(deleteConfirm.id);
      queryClient.invalidateQueries(['testimonials']);
    } else if (deleteConfirm.type === 'faq') {
      await base44.entities.FAQ.delete(deleteConfirm.id);
      queryClient.invalidateQueries(['faqs']);
    }
    
    setDeleteConfirm(null);
  };

  const resetTestimonialForm = () => {
    setTestimonialForm({ guest_name: '', rating: 5, comment: '', active: true });
    setEditingTestimonial(null);
  };

  const resetFaqForm = () => {
    setFaqForm({ question: '', answer: '', order: 0, active: true });
    setEditingFaq(null);
  };

  const editTestimonial = (item) => {
    setEditingTestimonial(item);
    setTestimonialForm({
      guest_name: item.guest_name,
      rating: item.rating,
      comment: item.comment,
      active: item.active
    });
    setTestimonialDialog(true);
  };

  const editFaq = (item) => {
    setEditingFaq(item);
    setFaqForm({
      question: item.question,
      answer: item.answer,
      order: item.order || 0,
      active: item.active
    });
    setFaqDialog(true);
  };

  return (
    <div className="space-y-6">
      {/* Testimonials Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Star className="w-5 h-5 text-yellow-500" />
                Depoimentos
              </CardTitle>
              <CardDescription>Gerencie avaliações de hóspedes para sua página de reservas</CardDescription>
            </div>
            <Button 
              onClick={() => {
                resetTestimonialForm();
                setTestimonialDialog(true);
              }}
              size="sm"
              className="bg-gradient-to-r from-[#2C5F5D] to-[#3A7A77]"
            >
              <Plus className="w-4 h-4 mr-2" />
              Adicionar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {testimonials.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <MessageSquare className="w-12 h-12 mx-auto mb-2 text-slate-300" />
              <p className="text-sm">Nenhum depoimento cadastrado</p>
            </div>
          ) : (
            <div className="space-y-3">
              {testimonials.map(item => (
                <div key={item.id} className="flex items-start justify-between p-4 bg-slate-50 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <p className="font-semibold text-slate-800">{item.guest_name}</p>
                      <div className="flex gap-0.5">
                        {[...Array(5)].map((_, i) => (
                          <Star 
                            key={i} 
                            className={`w-3 h-3 ${i < item.rating ? 'fill-yellow-400 text-yellow-400' : 'text-slate-300'}`} 
                          />
                        ))}
                      </div>
                      {!item.active && <Badge variant="outline">Inativo</Badge>}
                    </div>
                    <p className="text-sm text-slate-600">{item.comment}</p>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <Button variant="ghost" size="icon" onClick={() => editTestimonial(item)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => setDeleteConfirm({ type: 'testimonial', id: item.id })}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* FAQ Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-blue-500" />
                Perguntas Frequentes (FAQ)
              </CardTitle>
              <CardDescription>Adicione perguntas e respostas para sua página de reservas</CardDescription>
            </div>
            <Button 
              onClick={() => {
                resetFaqForm();
                setFaqDialog(true);
              }}
              size="sm"
              className="bg-gradient-to-r from-[#2C5F5D] to-[#3A7A77]"
            >
              <Plus className="w-4 h-4 mr-2" />
              Adicionar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {faqs.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <HelpCircle className="w-12 h-12 mx-auto mb-2 text-slate-300" />
              <p className="text-sm">Nenhuma pergunta cadastrada</p>
            </div>
          ) : (
            <div className="space-y-3">
              {faqs.sort((a, b) => (a.order || 0) - (b.order || 0)).map(item => (
                <div key={item.id} className="flex items-start justify-between p-4 bg-slate-50 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <p className="font-semibold text-slate-800">{item.question}</p>
                      {!item.active && <Badge variant="outline">Inativo</Badge>}
                    </div>
                    <p className="text-sm text-slate-600">{item.answer}</p>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <Button variant="ghost" size="icon" onClick={() => editFaq(item)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => setDeleteConfirm({ type: 'faq', id: item.id })}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Testimonial Dialog */}
      <Dialog open={testimonialDialog} onOpenChange={setTestimonialDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTestimonial ? 'Editar Depoimento' : 'Novo Depoimento'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleTestimonialSubmit} className="space-y-4">
            <div>
              <Label>Nome do Hóspede *</Label>
              <Input
                value={testimonialForm.guest_name}
                onChange={(e) => setTestimonialForm({ ...testimonialForm, guest_name: e.target.value })}
                required
                placeholder="Maria Silva"
              />
            </div>
            <div>
              <Label>Avaliação *</Label>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map(rating => (
                  <button
                    key={rating}
                    type="button"
                    onClick={() => setTestimonialForm({ ...testimonialForm, rating })}
                    className="focus:outline-none"
                  >
                    <Star 
                      className={`w-6 h-6 ${rating <= testimonialForm.rating ? 'fill-yellow-400 text-yellow-400' : 'text-slate-300'}`} 
                    />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label>Comentário *</Label>
              <Textarea
                value={testimonialForm.comment}
                onChange={(e) => setTestimonialForm({ ...testimonialForm, comment: e.target.value })}
                required
                rows={4}
                placeholder="Experiência incrível! Tudo muito limpo e organizado..."
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={testimonialForm.active}
                onCheckedChange={(checked) => setTestimonialForm({ ...testimonialForm, active: checked })}
              />
              <Label>Ativo (visível na página de reservas)</Label>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setTestimonialDialog(false)}>
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={loading}
                className="bg-gradient-to-r from-[#2C5F5D] to-[#3A7A77]"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* FAQ Dialog */}
      <Dialog open={faqDialog} onOpenChange={setFaqDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingFaq ? 'Editar FAQ' : 'Nova Pergunta'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleFaqSubmit} className="space-y-4">
            <div>
              <Label>Pergunta *</Label>
              <Input
                value={faqForm.question}
                onChange={(e) => setFaqForm({ ...faqForm, question: e.target.value })}
                required
                placeholder="Qual o horário de check-in?"
              />
            </div>
            <div>
              <Label>Resposta *</Label>
              <Textarea
                value={faqForm.answer}
                onChange={(e) => setFaqForm({ ...faqForm, answer: e.target.value })}
                required
                rows={4}
                placeholder="O check-in é a partir das 14h..."
              />
            </div>
            <div>
              <Label>Ordem</Label>
              <Input
                type="number"
                value={faqForm.order}
                onChange={(e) => setFaqForm({ ...faqForm, order: e.target.value })}
                placeholder="0"
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={faqForm.active}
                onCheckedChange={(checked) => setFaqForm({ ...faqForm, active: checked })}
              />
              <Label>Ativo (visível na página de reservas)</Label>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setFaqDialog(false)}>
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={loading}
                className="bg-gradient-to-r from-[#2C5F5D] to-[#3A7A77]"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este item?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
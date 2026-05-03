'use client'

import AppLayout from '@/components/layout/AppLayout'
import MasonryGrid from '@/components/vault/MasonryGrid'
import type { Milestone } from '@/lib/supabase'

// Mock data — replace with: const { data } = await supabase.from('milestones').select('*, client:clients(name)')
const MOCK_MILESTONES: Milestone[] = [
  {
    id: '1',
    user_id: 'demo',
    image_url: 'https://placehold.co/600x400/1e1b4b/a78bfa?text=Client+Feedback',
    category: 'client_feedback',
    title: '5-Star Review from E-Commerce Client',
    description: 'Client praised the prompt sequence that doubled their conversion rate in 2 weeks.',
    date: '2026-04-28',
    is_featured: true,
  },
  {
    id: '2',
    user_id: 'demo',
    image_url: 'https://placehold.co/600x500/052e16/34d399?text=Revenue+%241%2C200',
    category: 'revenue_proof',
    title: 'Stripe Payout — April Week 2',
    description: 'Single project payment for AI assistant buildout.',
    amount: 1200,
    date: '2026-04-20',
    is_featured: true,
  },
  {
    id: '3',
    user_id: 'demo',
    image_url: 'https://placehold.co/600x350/1e1b4b/818cf8?text=Prompt+Result',
    category: 'prompt_result',
    title: 'GPT-4 System Prompt — SaaS Onboarding',
    description: 'Zero-shot prompt that reduced onboarding support tickets by 40%.',
    date: '2026-04-15',
    is_featured: false,
  },
  {
    id: '4',
    user_id: 'demo',
    image_url: 'https://placehold.co/600x450/451a03/fbbf24?text=Case+Study',
    category: 'case_study',
    title: 'Real Estate Lead Gen Case Study',
    description: 'Full prompt engineering workflow that generated 38 qualified leads in 7 days.',
    date: '2026-04-10',
    is_featured: false,
  },
  {
    id: '5',
    user_id: 'demo',
    image_url: 'https://placehold.co/600x400/1e1b4b/a78bfa?text=Testimonial',
    category: 'client_feedback',
    title: 'LinkedIn Recommendation — SaaS Founder',
    date: '2026-04-05',
    is_featured: false,
  },
  {
    id: '6',
    user_id: 'demo',
    image_url: 'https://placehold.co/600x380/052e16/34d399?text=Revenue+%24850',
    category: 'revenue_proof',
    title: 'Upwork Milestone Payment',
    amount: 850,
    date: '2026-03-30',
    is_featured: false,
  },
]

export default function VaultPage() {
  return (
    <AppLayout
      title="Milestone Vault"
      description="Your portfolio of wins — client feedback, revenue proofs, and prompt results."
    >
      <MasonryGrid
        milestones={MOCK_MILESTONES}
        onUpload={() => alert('Upload modal — connect to Supabase Storage')}
        onSelect={(m) => console.log('Selected:', m.title)}
      />
    </AppLayout>
  )
}

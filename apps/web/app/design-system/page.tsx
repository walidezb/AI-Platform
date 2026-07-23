'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  Award,
  BookOpen,
  Settings,
  Layers,
  Inbox,
  HelpCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatsCard } from '@/components/ui/StatsCard';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { EmptyState } from '@/components/ui/EmptyState';
import { StatusBadge, StatusType } from '@/components/ui/StatusBadge';
import {
  SkeletonCard,
  SkeletonTable,
  SkeletonStats,
  SkeletonAvatar
} from '@/components/ui/LoadingSkeleton';
import { Logo } from '@/components/ui/Logo';
import { notify } from '@/lib/toast';
import { TopBar } from '@/components/layout/TopBar';

export default function DesignSystemPage() {
  const [activeSection, setActiveSection] = useState('typography');
  const [statsLoading, setStatsLoading] = useState(false);
  const [progressVal, setProgressVal] = useState(65);

  const sections = [
    { id: 'logo', name: 'Logo Branding' },
    { id: 'typography', name: 'Typography' },
    { id: 'colors', name: 'Color Swatches' },
    { id: 'buttons', name: 'Buttons' },
    { id: 'badges', name: 'Badges & Statuses' },
    { id: 'cards', name: 'Card Styles' },
    { id: 'stats', name: 'Stats Cards' },
    { id: 'progress', name: 'Progress Indicators' },
    { id: 'emptystate', name: 'Empty States' },
    { id: 'skeletons', name: 'Loading Skeletons' },
    { id: 'toasts', name: 'Toasts & Alerts' },
    { id: 'sidebar', name: 'Sidebar & TopBar' },
  ];

  const handlePromiseToast = () => {
    const actionPromise = new Promise((resolve, reject) => {
      setTimeout(() => {
        if (Math.random() > 0.3) {
          resolve('Data synced!');
        } else {
          reject(new Error('Failed to sync.'));
        }
      }, 2000);
    });

    notify.promise(actionPromise, {
      loading: 'Syncing assessment with engine...',
      success: 'Skills profile synced successfully!',
      error: 'Failed to sync skills profile.',
    });
  };

  const navItems = [
    { label: 'Overview', href: '#', icon: Layers },
    { label: 'Assessments', href: '#', icon: Award, badge: 'New' },
    { label: 'Learning Paths', href: '#', icon: BookOpen },
    { label: 'Analytics', href: '#', icon: Users, badge: 3 },
    { label: 'Settings', href: '#', icon: Settings },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-slate-950 text-slate-100">
      {/* Sidebar - Simulated inside container */}
      <aside className="w-64 border-r border-border bg-slate-950 flex flex-col shrink-0">
        <div className="flex h-16 items-center px-6 border-b border-border/60">
          <Logo size="md" />
        </div>
        <nav className="flex-1 space-y-1 px-4 py-6 overflow-y-auto">
          <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-3 mb-2">
            Design Tokens
          </div>
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`w-full text-left px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                activeSection === section.id
                  ? 'bg-primary/10 text-white shadow-glow-sm border-l-2 border-primary font-semibold'
                  : 'text-muted-foreground hover:text-white hover:bg-slate-900/60'
              }`}
            >
              {section.name}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-border/60 bg-slate-950/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs">
              DS
            </div>
            <div>
              <div className="text-xs font-semibold text-white">System Admin</div>
              <div className="text-[10px] text-muted-foreground">Version 1.0.0</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Panel Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 w-full border-b border-border bg-slate-950/80 backdrop-blur-md flex items-center justify-between px-8">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>LearnPath AI</span>
            <span>/</span>
            <span className="text-white font-semibold capitalize">{activeSection.replace('-', ' ')}</span>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" onClick={() => window.location.href = '/'}>
              Exit Demo
            </Button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-8 lg:p-12">
          <div className="max-w-4xl mx-auto space-y-12">
            
            {/* LOGO SECTION */}
            {activeSection === 'logo' && (
              <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                <PageHeader 
                  title="Logo Branding" 
                  subtitle="SVG vector identity elements supporting multiple layout dimensions" 
                  badge="Core Brand"
                />
                <Card className="bg-card border-border">
                  <CardHeader>
                    <CardTitle>Scalable branding logo configurations</CardTitle>
                    <CardDescription>Visual previews of logo variations in small, medium, and large footprints.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-8">
                    <div className="flex flex-col gap-6">
                      <div className="flex items-center gap-12 p-6 rounded-lg bg-slate-900/40 border border-slate-900">
                        <div className="space-y-2">
                          <span className="text-xs text-muted-foreground uppercase font-bold tracking-widest block mb-2">Large Size</span>
                          <Logo size="lg" />
                        </div>
                      </div>

                      <div className="flex items-center gap-12 p-6 rounded-lg bg-slate-900/40 border border-slate-900">
                        <div className="space-y-2">
                          <span className="text-xs text-muted-foreground uppercase font-bold tracking-widest block mb-2">Medium Size</span>
                          <Logo size="md" />
                        </div>
                      </div>

                      <div className="flex items-center gap-12 p-6 rounded-lg bg-slate-900/40 border border-slate-900">
                        <div className="space-y-2">
                          <span className="text-xs text-muted-foreground uppercase font-bold tracking-widest block mb-2">Small Size</span>
                          <Logo size="sm" />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.section>
            )}

            {/* TYPOGRAPHY SECTION */}
            {activeSection === 'typography' && (
              <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                <PageHeader 
                  title="Typography System" 
                  subtitle="A clean type ramp crafted using Plus Jakarta Sans for headings and Inter for structured bodies." 
                  badge="Typography"
                />
                <Card className="bg-card border-border">
                  <CardContent className="p-6 space-y-6">
                    <div>
                      <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest block mb-1">Heading 1 - Plus Jakarta Sans Bold</span>
                      <h1 className="text-white">LearnPath AI Platform</h1>
                    </div>
                    <hr className="border-border/60" />
                    <div>
                      <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest block mb-1">Heading 2</span>
                      <h2 className="text-white">Upskill Your Workforce</h2>
                    </div>
                    <hr className="border-border/60" />
                    <div>
                      <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest block mb-1">Heading 3</span>
                      <h3 className="text-white">Generative Learning Pathways</h3>
                    </div>
                    <hr className="border-border/60" />
                    <div>
                      <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest block mb-1">Heading 4</span>
                      <h4 className="text-white">Interactive Assessment Questions</h4>
                    </div>
                    <hr className="border-border/60" />
                    <div>
                      <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest block mb-1">Body Text - Inter Sans Regular</span>
                      <p className="text-muted-foreground leading-relaxed text-sm md:text-base">
                        The learning paths generated by our deep learning models analyze individual skills constraints and recommend highly personalized material. Curated internet content provides cost-efficient scaling across high-performing enterprise teams.
                      </p>
                    </div>
                    <hr className="border-border/60" />
                    <div>
                      <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest block mb-1">Gradient Accent Text</span>
                      <h2 className="bg-gradient-primary bg-clip-text text-transparent font-bold">
                        Supercharged by Generative Agents.
                      </h2>
                    </div>
                  </CardContent>
                </Card>
              </motion.section>
            )}

            {/* COLORS SECTION */}
            {activeSection === 'colors' && (
              <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                <PageHeader 
                  title="Color Swatches" 
                  subtitle="Semantic color palettes for background containment, accents, alerts, and content hierarchies." 
                  badge="Colors"
                />
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {[
                    { name: 'Background', value: '#0a0a14', desc: 'Deep navy main containment bg' },
                    { name: 'Card Base', value: '#0f1220', desc: 'Elevated layout panels' },
                    { name: 'Primary Accent', value: '#6d72f5', desc: 'Vibrant indigo brand highlight' },
                    { name: 'Secondary Base', value: '#171e30', desc: 'Inner grids and inactive buttons' },
                    { name: 'Border Tone', value: '#171e30', desc: 'Subtle separation panels' },
                    { name: 'Success Accent', value: '#10b981', desc: 'Green indicators for passing' },
                    { name: 'Warning Tone', value: '#f59e0b', desc: 'Orange tags for intermediate alerts' },
                    { name: 'Destructive Accent', value: '#ef4444', desc: 'Red colors for errors and failures' },
                    { name: 'Info Accent', value: '#0ea5e9', desc: 'Sky blue notifications and info tips' },
                  ].map((color, index) => (
                    <Card key={index} className="bg-card border-border hover:border-slate-800 transition-colors">
                      <CardContent className="p-4 flex flex-col gap-3">
                        <div 
                          className="h-16 w-full rounded-md shadow-inner border border-white/5" 
                          style={{ backgroundColor: color.value }}
                        />
                        <div>
                          <div className="font-semibold text-white text-sm">{color.name}</div>
                          <div className="text-xs text-muted-foreground font-mono mt-0.5">{color.value}</div>
                          <p className="text-[11px] text-muted-foreground mt-1.5 leading-tight">{color.desc}</p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </motion.section>
            )}

            {/* BUTTONS SECTION */}
            {activeSection === 'buttons' && (
              <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                <PageHeader 
                  title="Interactive Buttons" 
                  subtitle="Buttons configured with micro-translations and hover states." 
                  badge="Buttons"
                />
                <Card className="bg-card border-border">
                  <CardHeader>
                    <CardTitle>Standard Button Configurations</CardTitle>
                    <CardDescription>Radix slot-compatible wrappers for standard, secondary, and ghost contexts.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-8">
                    <div className="flex flex-wrap gap-4">
                      <Button variant="default">Default Accent</Button>
                      <Button variant="outline">Outline Border</Button>
                      <Button variant="secondary">Secondary Dark</Button>
                      <Button variant="ghost">Ghost Button</Button>
                      <Button variant="destructive">Destructive Action</Button>
                      <Button className="bg-gradient-primary hover:opacity-90 text-white border-0 shadow-glow-sm transition-opacity">
                        Gradient Brand
                      </Button>
                    </div>

                    <div className="space-y-3">
                      <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest block">Available Sizes</span>
                      <div className="flex items-center gap-4 flex-wrap">
                        <Button size="lg">Large Size</Button>
                        <Button size="default">Default Size</Button>
                        <Button size="sm">Small Size</Button>
                        <Button size="xs">Extra Small</Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.section>
            )}

            {/* BADGES SECTION */}
            {activeSection === 'badges' && (
              <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                <PageHeader 
                  title="Badges & Statuses" 
                  subtitle="Colored labels and live status indicators supporting pulse visual alerts." 
                  badge="Badges"
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Badges */}
                  <Card className="bg-card border-border">
                    <CardHeader>
                      <CardTitle>Static Badges</CardTitle>
                      <CardDescription>Default categorical filters and highlights.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-wrap gap-3">
                      <Badge variant="default">Default</Badge>
                      <Badge variant="secondary">Secondary</Badge>
                      <Badge variant="outline">Outline</Badge>
                      <Badge variant="destructive">Destructive</Badge>
                    </CardContent>
                  </Card>

                  {/* Status badges */}
                  <Card className="bg-card border-border">
                    <CardHeader>
                      <CardTitle>StatusBadges</CardTitle>
                      <CardDescription>Operational indicators with status colors and icons.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 gap-3">
                      {(['active', 'completed', 'locked', 'in-progress', 'not-started', 'failed', 'pending', 'stalled'] as StatusType[]).map((status) => (
                        <div key={status} className="flex justify-start">
                          <StatusBadge status={status} />
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </div>
              </motion.section>
            )}

            {/* CARDS SECTION */}
            {activeSection === 'cards' && (
              <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                <PageHeader 
                  title="Card Containers" 
                  subtitle="Vercel/Linear style panels constructed with border shines, glass effects, and depth gradients." 
                  badge="Cards"
                />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Default card */}
                  <Card className="bg-card border-border card-hover">
                    <CardHeader>
                      <CardTitle className="text-white text-base">Elevated Card</CardTitle>
                      <CardDescription>Deep navy elevation container</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Default border with subtle hover highlight translation. Matches primary platform dashboard views.
                      </p>
                    </CardContent>
                  </Card>

                  {/* Glass card */}
                  <div className="glass rounded-xl p-6 flex flex-col justify-between min-h-[160px] border border-white/5 shadow-card">
                    <div>
                      <h4 className="text-white font-bold text-base mb-1">Glass Card</h4>
                      <p className="text-[11px] text-muted-foreground">Blur backdrop containment</p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-4 leading-relaxed">
                      Uses backdrop filters to allow glow spheres to flow behind panels. Ideal for overlays and sidebar layouts.
                    </p>
                  </div>

                  {/* Gradient border card */}
                  <div className="gradient-border p-6 rounded-xl flex flex-col justify-between min-h-[160px] shadow-card">
                    <div>
                      <h4 className="text-white font-bold text-base mb-1">Gradient Border</h4>
                      <p className="text-[11px] text-muted-foreground">Outer ring primary glow</p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-4 leading-relaxed">
                      Utilizes a nested border pseudo-element to render fine 1px gradient bounds. Excellent for highlighting important content.
                    </p>
                  </div>
                </div>
              </motion.section>
            )}

            {/* STATS CARDS SECTION */}
            {activeSection === 'stats' && (
              <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                <PageHeader 
                  title="Stats Cards" 
                  subtitle="Enterprise reporting blocks displaying data counts, trends, and layout icons." 
                  badge="Stats"
                  action={
                    <Button variant="outline" size="sm" onClick={() => setStatsLoading(!statsLoading)}>
                      Toggle Loading State
                    </Button>
                  }
                />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <StatsCard 
                    label="Onboarded Employees" 
                    value="1,248" 
                    icon={Users} 
                    trend={{ value: 12, label: 'vs last month' }}
                    isLoading={statsLoading}
                  />
                  <StatsCard 
                    label="Assigned Learning Paths" 
                    value="382" 
                    icon={BookOpen} 
                    trend={{ value: 4.8, label: 'vs last week' }}
                    variant="info"
                    isLoading={statsLoading}
                  />
                  <StatsCard 
                    label="Certificates Issued" 
                    value="94%" 
                    icon={Award} 
                    trend={{ value: 8.2, label: 'vs last quarter' }}
                    variant="success"
                    isLoading={statsLoading}
                  />
                  <StatsCard 
                    label="Active Issues" 
                    value="3" 
                    icon={HelpCircle} 
                    trend={{ value: -15, label: 'vs yesterday' }}
                    variant="warning"
                    isLoading={statsLoading}
                  />
                </div>
              </motion.section>
            )}

            {/* PROGRESS SECTION */}
            {activeSection === 'progress' && (
              <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                <PageHeader 
                  title="Progress Indicators" 
                  subtitle="Visual indicators displaying completion levels." 
                  badge="Progress"
                  action={
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => setProgressVal(Math.max(0, progressVal - 15))}>
                        Decrease
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setProgressVal(Math.min(100, progressVal + 15))}>
                        Increase
                      </Button>
                    </div>
                  }
                />
                <Card className="bg-card border-border">
                  <CardHeader>
                    <CardTitle>Linear Level Bar</CardTitle>
                    <CardDescription>Glow-capped bar displaying user pathways completion metrics.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-8">
                    <ProgressBar 
                      value={progressVal} 
                      label="Learning Path Progress" 
                      showPercentage 
                      size="md"
                    />

                    <div className="space-y-4">
                      <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest block">Different Sizes</span>
                      <div className="space-y-3">
                        <ProgressBar value={40} size="sm" label="Small Size" showPercentage />
                        <ProgressBar value={60} size="md" label="Medium Size" showPercentage />
                        <ProgressBar value={85} size="lg" label="Large Size" showPercentage />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest block">Different Color Variants</span>
                      <div className="space-y-3">
                        <ProgressBar value={50} variant="default" label="Default Variant" showPercentage />
                        <ProgressBar value={75} variant="success" label="Success Variant" showPercentage />
                        <ProgressBar value={30} variant="warning" label="Warning Variant" showPercentage />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.section>
            )}

            {/* EMPTY STATE SECTION */}
            {activeSection === 'emptystate' && (
              <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                <PageHeader 
                  title="Empty States" 
                  subtitle="Empty lists or search results fallback illustrations." 
                  badge="Empty"
                />
                <EmptyState 
                  icon={Inbox}
                  title="No learning resources curated"
                  description="Start by executing the AI assessment agent. The system will automatically construct modules and scrape internet guidelines."
                  action={{
                    label: 'Launch Assessment Engine',
                    onClick: () => notify.success('Assessment Engine initialized!'),
                  }}
                />
              </motion.section>
            )}

            {/* SKELETONS SECTION */}
            {activeSection === 'skeletons' && (
              <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                <PageHeader 
                  title="Loading Skeletons" 
                  subtitle="Shimmer panels rendered during data request operations." 
                  badge="Skeletons"
                />
                <div className="space-y-8">
                  <div>
                    <span className="text-xs text-muted-foreground font-bold tracking-wider mb-2 block">Card Loading Skeleton</span>
                    <div className="max-w-md">
                      <SkeletonCard />
                    </div>
                  </div>

                  <div>
                    <span className="text-xs text-muted-foreground font-bold tracking-wider mb-2 block">Stats Row Skeleton</span>
                    <SkeletonStats />
                  </div>

                  <div>
                    <span className="text-xs text-muted-foreground font-bold tracking-wider mb-2 block">Data Grid Table Loading Skeleton</span>
                    <SkeletonTable />
                  </div>

                  <div>
                    <span className="text-xs text-muted-foreground font-bold tracking-wider mb-2 block">Avatar Shimmer</span>
                    <div className="flex gap-4">
                      <SkeletonAvatar className="h-8 w-8" />
                      <SkeletonAvatar className="h-12 w-12" />
                      <SkeletonAvatar className="h-16 w-16" />
                    </div>
                  </div>
                </div>
              </motion.section>
            )}

            {/* TOASTS SECTION */}
            {activeSection === 'toasts' && (
              <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                <PageHeader 
                  title="Toast Notifications (Sonner)" 
                  subtitle="Micro-notifications triggerable by standard CRUD promises or actions." 
                  badge="Toasts"
                />
                <Card className="bg-card border-border">
                  <CardHeader>
                    <CardTitle>Sonner Notification Dispatcher</CardTitle>
                    <CardDescription>Trigger custom modal logs and check their rendering placements.</CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-wrap gap-3">
                    <Button variant="default" onClick={() => notify.success('Changes saved successfully!')}>
                      Success Toast
                    </Button>
                    <Button variant="destructive" onClick={() => notify.error('Something went wrong. Please try again.')}>
                      Error Toast
                    </Button>
                    <Button variant="outline" onClick={() => notify.warning("You've used 80% of your AI budget.")}>
                      Warning Toast
                    </Button>
                    <Button variant="outline" onClick={() => notify.info('Your path is being generated...')}>
                      Info Toast
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        const id = notify.loading('Generating your learning path...');
                        setTimeout(() => {
                          notify.dismiss(id);
                          notify.success('Path ready! 🎉');
                        }, 2000);
                      }}
                    >
                      Loading → Success
                    </Button>
                    <Button variant="secondary" onClick={handlePromiseToast}>
                      Promise Toast
                    </Button>
                  </CardContent>
                </Card>

                {/* New in Phase 7 Section */}
                <Card className="bg-card border-border">
                  <CardHeader>
                    <CardTitle className="text-base font-bold text-amber-400">✨ New in Phase 7</CardTitle>
                    <CardDescription>Major architectural enhancements across the platform.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 text-xs text-muted-foreground">
                    <div className="flex items-center justify-between p-2.5 rounded-lg bg-secondary/30 border border-border">
                      <span className="font-semibold text-foreground">RTL Support</span>
                      <a href="/ar" className="text-primary underline">Try Arabic Layout (/ar)</a>
                    </div>
                    <div className="flex items-center justify-between p-2.5 rounded-lg bg-secondary/30 border border-border">
                      <span className="font-semibold text-foreground">Sonner Toast System</span>
                      <span>Replaced legacy toast with Sonner</span>
                    </div>
                    <div className="flex items-center justify-between p-2.5 rounded-lg bg-secondary/30 border border-border">
                      <span className="font-semibold text-foreground">Error Boundary Sentry Integration</span>
                      <span>Proper Sentry.withScope capture</span>
                    </div>
                    <div className="flex items-center justify-between p-2.5 rounded-lg bg-secondary/30 border border-border">
                      <span className="font-semibold text-foreground">Mobile Breakpoint Layouts</span>
                      <span>Verified from 375px to 1440px</span>
                    </div>
                  </CardContent>
                </Card>
              </motion.section>
            )}

            {/* SIDEBAR & TOPBAR SECTION */}
            {activeSection === 'sidebar' && (
              <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                <PageHeader 
                  title="Sidebar & Layout Components" 
                  subtitle="Platform navigation drawers and headers supporting unread counts." 
                  badge="Layouts"
                />
                
                <div className="space-y-8">
                  <div>
                    <span className="text-xs text-muted-foreground font-bold tracking-wider mb-3 block">TopBar Preview</span>
                    <div className="border border-border rounded-xl overflow-hidden bg-slate-950">
                      <TopBar title="Dashboard Overview" breadcrumb={['LearnPath AI', 'Manage', 'Dashboard']} />
                    </div>
                  </div>

                  <div>
                    <span className="text-xs text-muted-foreground font-bold tracking-wider mb-3 block">Sidebar Preview (Static container)</span>
                    <div className="border border-border rounded-xl overflow-hidden bg-slate-950 flex h-[350px] relative">
                      <div className="w-56 border-r border-border flex flex-col h-full bg-slate-950">
                        <div className="flex h-12 items-center px-4 border-b border-border/60">
                          <Logo size="sm" />
                        </div>
                        <div className="flex-1 space-y-1 p-2 overflow-y-auto">
                          {navItems.map((item) => {
                            const Icon = item.icon;
                            const isOverview = item.label === 'Overview';
                            return (
                              <div
                                key={item.label}
                                className={`flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-medium ${
                                  isOverview 
                                    ? 'bg-primary/10 text-white border-l-2 border-primary' 
                                    : 'text-muted-foreground font-semibold'
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <Icon className="h-3.5 w-3.5" />
                                  <span>{item.label}</span>
                                </div>
                                {item.badge && (
                                  <Badge className="text-[9px] px-1 py-0">{item.badge}</Badge>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      <div className="flex-1 p-6 bg-slate-900/10 flex items-center justify-center text-xs text-muted-foreground">
                        Main Page Canvas Area
                      </div>
                    </div>
                  </div>
                </div>
              </motion.section>
            )}

          </div>
        </main>
      </div>
    </div>
  );
}

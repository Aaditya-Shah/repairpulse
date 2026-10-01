'use client'
import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from './base'
import { Avatar } from './base'
import { Badge } from './base'

const navigation = {
  customer: [
    { name: 'Home', href: '/customer', icon: 'Home' },
    { name: 'My Repairs', href: '/customer/repairs', icon: 'Box' },
    { name: 'New Repair', href: '/customer/new', icon: 'Plus' },
    { name: 'Pickup', href: '/customer/pickup', icon: 'Truck' },
    { name: 'Payments', href: '/customer/payments', icon: 'CreditCard' },
    { name: 'Support', href: '/customer/support', icon: 'MessageCircle' },
    { name: 'Profile', href: '/customer/profile', icon: 'User' },
  ],
  vendor: [
    { name: 'Overview', href: '/vendor', icon: 'LayoutDashboard' },
    { name: 'Repairs', href: '/vendor/repairs', icon: 'Box' },
    { name: 'Calendar', href: '/vendor/calendar', icon: 'Calendar' },
    { name: 'Customers', href: '/vendor/customers', icon: 'Users' },
    { name: 'Devices', href: '/vendor/devices', icon: 'Cpu' },
    { name: 'Quotes', href: '/vendor/quotes', icon: 'FileText' },
    { name: 'Parts', href: '/vendor/parts', icon: 'Package' },
    { name: 'Technicians', href: '/vendor/technicians', icon: 'UserCheck' },
    { name: 'Pickup', href: '/vendor/pickup', icon: 'Truck' },
    { name: 'AI Assistant', href: '/vendor/ai', icon: 'Bot' },
    { name: 'Model Health', href: '/vendor/model-health', icon: 'Activity' },
    { name: 'Analytics', href: '/vendor/analytics', icon: 'BarChart' },
    { name: 'Settings', href: '/vendor/settings', icon: 'Settings' },
  ],
  partner: [
    { name: 'Available Jobs', href: '/partner', icon: 'ListChecks' },
    { name: 'My Jobs', href: '/partner/jobs', icon: 'Briefcase' },
    { name: 'Earnings', href: '/partner/earnings', icon: 'DollarSign' },
    { name: 'History', href: '/partner/history', icon: 'History' },
    { name: 'Profile', href: '/partner/profile', icon: 'User' },
  ],
  admin: [
    { name: 'Overview', href: '/admin', icon: 'LayoutDashboard' },
    { name: 'Tenants', href: '/admin/tenants', icon: 'Building2' },
    { name: 'Customers', href: '/admin/customers', icon: 'Users' },
    { name: 'Vendors', href: '/admin/vendors', icon: 'UserCheck' },
    { name: 'Partners', href: '/admin/partners', icon: 'Truck' },
    { name: 'Repairs', href: '/admin/repairs', icon: 'Box' },
    { name: 'Payments', href: '/admin/payments', icon: 'CreditCard' },
    { name: 'AI Providers', href: '/admin/ai-providers', icon: 'Bot' },
    { name: 'MCP', href: '/admin/mcp', icon: 'Network' },
    { name: 'MLOps', href: '/admin/mlops', icon: 'Activity' },
    { name: 'Security', href: '/admin/security', icon: 'Shield' },
    { name: 'Audit Logs', href: '/admin/audit', icon: 'FileText' },
    { name: 'Feature Flags', href: '/admin/flags', icon: 'Flag' },
    { name: 'System Health', href: '/admin/health', icon: 'HeartPulse' },
  ],
}

const roleLabels: Record<string, string> = {
  customer: 'Customer',
  vendor: 'Repairist',
  partner: 'Partner',
  admin: 'Admin',
}

interface SidebarProps {
  role: string
  user: { displayName: string; email: string; avatarUrl?: string }
  onLogout: () => void
}

export function Sidebar({ role, user, onLogout }: SidebarProps) {
  const pathname = usePathname()
  const navItems = navigation[role as keyof typeof navigation] || []
  
  const [collapsed, setCollapsed] = React.useState(false)
  
  return (
    <aside className={cn(
      'fixed left-0 top-0 h-full bg-rp-card border-r border-rp-border transition-all duration-300 z-40',
      collapsed ? 'w-16' : 'w-64'
    )}>
      <div className="flex h-full flex-col">
        <div className={cn('flex items-center gap-3 p-4 border-b border-rp-border', collapsed && 'justify-center')}>
          <Link href={`/${role}`} className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-rp-primary flex items-center justify-center">
              <span className="text-white font-bold text-sm">RP</span>
            </div>
            {!collapsed && (
              <span className="font-heading font-bold text-rp-text text-lg">RepairPulse</span>
            )}
          </Link>
          {!collapsed && (
            <Badge variant="info" className="ml-auto text-xs">{roleLabels[role]}</Badge>
          )}
        </div>
        
        <nav className="flex-1 overflow-y-auto p-3 space-y-1" aria-label="Main navigation">
          {navItems.map(item => {
            const isActive = pathname === item.href || (item.href !== `/${role}` && pathname.startsWith(item.href))
            const Icon = getIcon(item.icon)
            
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors',
                  'text-rp-muted hover:text-rp-text hover:bg-rp-bg-soft',
                  isActive && 'bg-rp-primary/10 text-rp-primary font-medium'
                )}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
                {!collapsed && <span>{item.name}</span>}
              </Link>
            )
          })}
        </nav>
        
        <div className={cn('p-4 border-t border-rp-border', collapsed && 'flex justify-center')}>
          {!collapsed ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3 px-3 py-2">
                <Avatar name={user.displayName} size="sm" src={user.avatarUrl} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-rp-text truncate">{user.displayName}</p>
                  <p className="text-xs text-rp-muted truncate">{user.email}</p>
                </div>
              </div>
              <Button variant="ghost" className="w-full justify-start gap-2" onClick={onLogout}>
                <LogOut className="w-5 h-5" />
                <span>Sign out</span>
              </Button>
            </div>
          ) : (
            <Button variant="ghost" size="sm" onClick={onLogout} aria-label="Sign out">
              <LogOut className="w-5 h-5" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className={cn('ml-auto', collapsed ? 'mx-auto' : '')}
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
          </Button>
        </div>
      </div>
    </aside>
  )
}

function getIcon(name: string) {
  const icons: Record<string, React.ComponentType<{ className?: string }>> = {
    Home: () => <Home className="w-5 h-5" />,
    Box: () => <Box className="w-5 h-5" />,
    Plus: () => <Plus className="w-5 h-5" />,
    Truck: () => <Truck className="w-5 h-5" />,
    CreditCard: () => <CreditCard className="w-5 h-5" />,
    MessageCircle: () => <MessageCircle className="w-5 h-5" />,
    User: () => <User className="w-5 h-5" />,
    LayoutDashboard: () => <LayoutDashboard className="w-5 h-5" />,
    Calendar: () => <Calendar className="w-5 h-5" />,
    Users: () => <Users className="w-5 h-5" />,
    Cpu: () => <Cpu className="w-5 h-5" />,
    FileText: () => <FileText className="w-5 h-5" />,
    Package: () => <Package className="w-5 h-5" />,
    UserCheck: () => <UserCheck className="w-5 h-5" />,
    Bot: () => <Bot className="w-5 h-5" />,
    Activity: () => <Activity className="w-5 h-5" />,
    BarChart: () => <BarChart className="w-5 h-5" />,
    Settings: () => <Settings className="w-5 h-5" />,
    ListChecks: () => <ListChecks className="w-5 h-5" />,
    Briefcase: () => <Briefcase className="w-5 h-5" />,
    DollarSign: () => <DollarSign className="w-5 h-5" />,
    History: () => <History className="w-5 h-5" />,
    Building2: () => <Building2 className="w-5 h-5" />,
    Shield: () => <Shield className="w-5 h-5" />,
    Network: () => <Network className="w-5 h-5" />,
    Flag: () => <Flag className="w-5 h-5" />,
    HeartPulse: () => <HeartPulse className="w-5 h-5" />,
    LogOut: () => <LogOut className="w-5 h-5" />,
    ChevronLeft: () => <ChevronLeft className="w-5 h-5" />,
    ChevronRight: () => <ChevronRight className="w-5 h-5" />,
  }
  return icons[name] || (() => <Box className="w-5 h-5" />)
}

import {
  Home, Box, Plus, Truck, CreditCard, MessageCircle, User,
  LayoutDashboard, Calendar, Users, Cpu, FileText, Package, UserCheck,
  Bot, Activity, BarChart, Settings, ListChecks, Briefcase, DollarSign,
  History, Building2, Shield, Network, Flag, HeartPulse, LogOut,
  ChevronLeft, ChevronRight
} from 'lucide-react'

interface HeaderProps {
  role: string
  title: string
  subtitle?: string
  actions?: React.ReactNode
}

export function Header({ role, title, subtitle, actions }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-sm border-b border-rp-border">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-rp-text">{title}</h1>
          {subtitle && <p className="text-rp-muted text-sm mt-0.5">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-4">
          {actions}
        </div>
      </div>
    </header>
  )
}

interface LayoutProps {
  children: React.ReactNode
  role: string
  user: { displayName: string; email: string; avatarUrl?: string }
  onLogout: () => void
}

export function RoleLayout({ children, role, user, onLogout }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = React.useState(false)
  
  return (
    <div className="min-h-screen bg-rp-bg-soft">
      <Sidebar role={role} user={user} onLogout={onLogout} />
      <div className={cn('transition-all duration-300', 'lg:ml-64')}>
        <div className="lg:ml-0">
          {children}
        </div>
      </div>
      <style jsx>{`
        @media (max-width: 1023px) {
          .sidebar { transform: translateX(-100%); }
          .sidebar.open { transform: translateX(0); }
        }
      `}</style>
    </div>
  )
}

export function PageContainer({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <main className={cn('p-6 lg:p-8', className)}>
      {children}
    </main>
  )
}

export function Section({ title, description, children, action }: { 
  title: string
  description?: string
  children: React.ReactNode
  action?: React.ReactNode
}) {
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading text-xl font-semibold text-rp-text">{title}</h2>
          {description && <p className="text-rp-muted text-sm mt-0.5">{description}</p>}
        </div>
        {action && <div>{action}</div>}
      </div>
      {children}
    </section>
  )
}

export function DataCard({ 
  title, 
  value, 
  subtitle, 
  trend, 
  icon, 
  variant = 'default',
  className 
}: { 
  title: string
  value: string | number
  subtitle?: string
  trend?: { value: number; label: string }
  icon?: React.ReactNode
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info'
  className?: string
}) {
  const variants = {
    default: 'border-l-4 border-rp-primary',
    success: 'border-l-4 border-rp-success',
    warning: 'border-l-4 border-rp-warning',
    danger: 'border-l-4 border-rp-danger',
    info: 'border-l-4 border-blue-500',
  }
  
  return (
    <Card variant="outlined" className={cn(variants[variant], className)}>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-rp-muted text-sm font-medium">{title}</p>
            <p className="font-heading text-3xl font-bold text-rp-text mt-1 truncate">{value}</p>
            {subtitle && <p className="text-rp-muted text-sm mt-1">{subtitle}</p>}
            {trend && (
              <div className="flex items-center gap-2 mt-2">
                <span className={cn(
                  'text-sm font-medium',
                  trend.value >= 0 ? 'text-rp-success' : 'text-rp-danger'
                )}>
                  {trend.value >= 0 ? '+' : ''}{trend.value.toFixed(1)}%
                </span>
                <span className="text-rp-muted text-xs">{trend.label}</span>
              </div>
            )}
          </div>
          {icon && <div className="text-rp-muted/50">{icon}</div>}
        </div>
      </CardContent>
    </Card>
  )
}

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const statusConfig: Record<string, { label: string; variant: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'neutral' }> = {
    REQUESTED: { label: 'Requested', variant: 'neutral' },
    AI_TRIAGED: { label: 'AI Triaged', variant: 'info' },
    VENDOR_REVIEW: { label: 'Vendor Review', variant: 'warning' },
    CONFIRMED: { label: 'Confirmed', variant: 'success' },
    REJECTED: { label: 'Rejected', variant: 'danger' },
    MANUAL_INSPECTION: { label: 'Inspection Required', variant: 'warning' },
    PICKUP_PENDING: { label: 'Pickup Pending', variant: 'info' },
    RECEIVED: { label: 'Received', variant: 'info' },
    DIAGNOSIS: { label: 'Diagnosis', variant: 'default' },
    PARTS_PENDING: { label: 'Parts Pending', variant: 'warning' },
    REPAIR: { label: 'In Repair', variant: 'default' },
    TESTING: { label: 'Testing', variant: 'info' },
    READY: { label: 'Ready', variant: 'success' },
    DELIVERY: { label: 'Delivery', variant: 'info' },
    COMPLETED: { label: 'Completed', variant: 'success' },
    CANCELLED: { label: 'Cancelled', variant: 'neutral' },
    AVAILABLE: { label: 'Available', variant: 'success' },
    ACCEPTED: { label: 'Accepted', variant: 'info' },
    ARRIVED: { label: 'Arrived', variant: 'warning' },
    OTP_VERIFIED: { label: 'OTP Verified', variant: 'info' },
    PICKED_UP: { label: 'Picked Up', variant: 'default' },
    IN_TRANSIT: { label: 'In Transit', variant: 'info' },
    DELIVERED: { label: 'Delivered', variant: 'success' },
  }
  
  const config = statusConfig[status] || { label: status, variant: 'neutral' }
  
  return <Badge variant={config.variant} className={className}>{config.label}</Badge>
}

export function RepairTimeline({ 
  currentStatus, 
  statusHistory = [],
  className 
}: { 
  currentStatus: string
  statusHistory?: Array<{ status: string; timestamp: string; note?: string }>
  className?: string
}) {
  const statusOrder = [
    'REQUESTED', 'AI_TRIAGED', 'VENDOR_REVIEW', 'MANUAL_INSPECTION', 'CONFIRMED',
    'PICKUP_PENDING', 'RECEIVED', 'DIAGNOSIS', 'PARTS_PENDING', 'REPAIR',
    'TESTING', 'READY', 'DELIVERY', 'COMPLETED'
  ]
  
  const currentIndex = statusOrder.indexOf(currentStatus)
  
  return (
    <div className={cn('space-y-4', className)}>
      {statusOrder.slice(0, currentIndex + 1).map((status, index) => {
        const isCurrent = index === currentIndex
        const isCompleted = index < currentIndex
        const historyItem = statusHistory.find(h => h.status === status)
        
        return (
          <div key={status} className="flex items-start gap-4">
            <div className="flex flex-col items-center flex-shrink-0">
              <div className={cn(
                'w-3 h-3 rounded-full border-2 transition-all',
                isCurrent ? 'bg-rp-primary border-rp-primary' : 
                isCompleted ? 'bg-rp-success border-rp-success' : 
                'bg-white border-rp-border'
              )} />
              {index < statusOrder.length - 1 && (
                <div className={cn(
                  'w-0.5 h-8 mt-1',
                  isCompleted ? 'bg-rp-success' : 'bg-rp-border'
                )} />
              )}
            </div>
            <div className="flex-1 pt-1">
              <div className={cn(
                'flex items-center gap-2',
                isCurrent ? 'font-medium text-rp-text' : 'text-rp-muted'
              )}>
                <StatusBadge status={status} />
                {isCurrent && <span className="text-xs text-rp-primary font-medium">Current</span>}
              </div>
              {historyItem?.note && (
                <p className="text-xs text-rp-muted mt-1 ml-6">{historyItem.note}</p>
              )}
              {historyItem?.timestamp && (
                <p className="text-xs text-rp-muted mt-1 ml-6">
                  {new Date(historyItem.timestamp).toLocaleString()}
                </p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
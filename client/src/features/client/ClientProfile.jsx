import { useQuery } from '@tanstack/react-query'
import { FiBriefcase, FiMail, FiPhone, FiMapPin, FiShield, FiCreditCard } from 'react-icons/fi'
import { useAuth } from '@/hooks/useAuth'
import { clientService } from './clientService'
import { PageHeader, Card, CardHeader, Badge, Loader, EmptyState } from '@/components/ui'
import { ChangePasswordCard } from '@/features/profile/ChangePasswordCard'
import { AvatarUploader } from '@/features/profile/AvatarUploader'

function Row({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3 py-2.5">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-black/5 text-muted dark:bg-white/10"><Icon className="h-4 w-4" /></span>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted">{label}</p>
        <p className="truncate text-sm font-medium">{value || '—'}</p>
      </div>
    </div>
  )
}

export default function ClientProfile() {
  const { user } = useAuth()
  const { data: profile, isLoading } = useQuery({ queryKey: ['client-profile'], queryFn: () => clientService.getProfile(user) })

  if (isLoading) return <Loader label="Loading profile…" />
  if (!profile) return <EmptyState title="Profile unavailable" />

  return (
    <div>
      <PageHeader title="My Profile" subtitle="Your organization's account details." />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <div className="flex flex-col items-center text-center">
            <AvatarUploader name={profile.contactPerson} size={80} />
            <p className="mt-3 text-lg font-bold">{profile.contactPerson}</p>
            <p className="text-sm text-muted">{profile.designation}</p>
            <Badge tone={profile.status === 'Active' ? 'success' : 'warning'} className="mt-2">{profile.status}</Badge>
          </div>
          <div className="mt-4 border-t border-app pt-2">
            <Row icon={FiBriefcase} label="Company" value={profile.company} />
            <Row icon={FiShield} label="Current Plan" value={profile.plan} />
            <Row icon={FiCreditCard} label="GST Number" value={profile.gst} />
          </div>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader title="Company Details" />
          <Row icon={FiMail} label="Business Email" value={profile.email} />
          <Row icon={FiPhone} label="Phone Number" value={profile.phone} />
          <Row icon={FiMapPin} label="Address" value={profile.address} />
          <Row icon={FiBriefcase} label="Industry" value={profile.industry} />
          <Row icon={FiCreditCard} label="Website" value={profile.website} />
          <Row icon={FiShield} label="Account Status" value={profile.status} />
        </Card>

        <div className="lg:col-span-1">
          <ChangePasswordCard />
        </div>
      </div>

      <p className="mt-3 text-xs text-muted">Need to update your company details? Send a message to your project team from the Messages page.</p>
    </div>
  )
}

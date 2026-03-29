'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  DollarSign, Plus, X, Pencil, Trash2, Gift, Tag, Search,
  CheckCircle, XCircle, Percent, Calendar, Copy, Eye, EyeOff,
  Package, Sparkles, Clock, Users, TrendingUp, AlertCircle
} from 'lucide-react'

interface PriceRule {
  id: string
  name: string
  type: 'discount' | 'markup' | 'fixed'
  value: number
  applies_to: 'all' | 'category' | 'service'
  target_id?: string
  target_name?: string
  start_date?: string
  end_date?: string
  is_active: boolean
  created_at: string
}

interface Voucher {
  id: string
  code: string
  name: string
  type: 'percentage' | 'fixed'
  value: number
  min_purchase?: number
  max_uses?: number
  uses_count: number
  valid_from: string
  valid_until: string
  is_active: boolean
  services?: string[]
  created_at: string
}

interface PackageItem {
  service_id: string
  service_name: string
  original_price: number
}

interface ServicePackage {
  id: string
  name: string
  description: string
  items: PackageItem[]
  total_value: number
  package_price: number
  savings_percent: number
  duration: number
  is_featured: boolean
  is_active: boolean
  booking_count: number
  created_at: string
}

const mockPriceRules: PriceRule[] = [
  {
    id: 'pr1',
    name: 'Weekend Special',
    type: 'discount',
    value: 10,
    applies_to: 'all',
    is_active: true,
    start_date: '2026-01-01',
    end_date: '2026-12-31',
    created_at: '2026-01-15T10:00:00Z',
  },
  {
    id: 'pr2',
    name: 'Facial Category Discount',
    type: 'discount',
    value: 15,
    applies_to: 'category',
    target_id: 'facial',
    target_name: 'Facials',
    is_active: false,
    created_at: '2026-02-01T14:00:00Z',
  },
]

const mockVouchers: Voucher[] = [
  {
    id: 'v1',
    code: 'WELCOME10',
    name: 'Welcome Discount',
    type: 'percentage',
    value: 10,
    max_uses: 1000,
    uses_count: 234,
    valid_from: '2026-01-01',
    valid_until: '2026-12-31',
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'v2',
    code: 'GLOW20',
    name: 'Glow Season',
    type: 'percentage',
    value: 20,
    min_purchase: 50000,
    max_uses: 500,
    uses_count: 89,
    valid_from: '2026-03-01',
    valid_until: '2026-03-31',
    is_active: true,
    created_at: '2026-02-15T00:00:00Z',
  },
  {
    id: 'v3',
    code: 'VIP25',
    name: 'VIP Members Only',
    type: 'percentage',
    value: 25,
    max_uses: 100,
    uses_count: 45,
    valid_from: '2026-01-01',
    valid_until: '2026-06-30',
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'v4',
    code: 'FLAT5K',
    name: 'Flat 5,000 Off',
    type: 'fixed',
    value: 5000,
    min_purchase: 30000,
    max_uses: 200,
    uses_count: 200,
    valid_from: '2026-01-01',
    valid_until: '2026-02-28',
    is_active: false,
    created_at: '2026-01-10T00:00:00Z',
  },
]

const mockPackages: ServicePackage[] = [
  {
    id: 'pkg1',
    name: 'Glow Package',
    description: 'Complete facial treatment with LED therapy and relaxing massage',
    items: [
      { service_id: 's1', service_name: 'Classic Facial', original_price: 25000 },
      { service_id: 's3', service_name: 'LED Light Therapy', original_price: 35000 },
      { service_id: 's7', service_name: 'Swedish Massage (30min)', original_price: 15000 },
    ],
    total_value: 75000,
    package_price: 65000,
    savings_percent: 13,
    duration: 150,
    is_featured: true,
    is_active: true,
    booking_count: 89,
    created_at: '2026-01-15T10:00:00Z',
  },
  {
    id: 'pkg2',
    name: 'Bridal Glow',
    description: 'Complete bridal prep package for your special day',
    items: [
      { service_id: 's2', service_name: 'Hydra Facial', original_price: 45000 },
      { service_id: 's4', service_name: 'Chemical Peel', original_price: 55000 },
      { service_id: 's6', service_name: 'Body Scrub & Wrap', original_price: 50000 },
      { service_id: 's8', service_name: 'Deep Tissue Massage', original_price: 40000 },
    ],
    total_value: 190000,
    package_price: 150000,
    savings_percent: 21,
    duration: 285,
    is_featured: true,
    is_active: true,
    booking_count: 34,
    created_at: '2026-02-01T14:00:00Z',
  },
  {
    id: 'pkg3',
    name: 'Acne Clear Package',
    description: 'Targeted acne treatment package for clear skin',
    items: [
      { service_id: 's3', service_name: 'Deep Cleansing Facial', original_price: 25000 },
      { service_id: 's3', service_name: 'LED Light Therapy', original_price: 35000 },
    ],
    total_value: 60000,
    package_price: 50000,
    savings_percent: 17,
    duration: 105,
    is_featured: false,
    is_active: true,
    booking_count: 56,
    created_at: '2026-02-10T09:00:00Z',
  },
]

const availableServices = [
  { id: 's1', name: 'Classic Facial', price: 25000, duration: 60 },
  { id: 's2', name: 'Hydra Facial', price: 45000, duration: 75 },
  { id: 's3', name: 'LED Light Therapy', price: 35000, duration: 45 },
  { id: 's4', name: 'Chemical Peel', price: 55000, duration: 60 },
  { id: 's5', name: 'Laser Hair Removal', price: 40000, duration: 45 },
  { id: 's6', name: 'Body Scrub & Wrap', price: 50000, duration: 90 },
  { id: 's7', name: 'Swedish Massage', price: 30000, duration: 60 },
  { id: 's8', name: 'Deep Tissue Massage', price: 40000, duration: 75 },
]

export default function PricingPage() {
  const [activeTab, setActiveTab] = useState<'vouchers' | 'packages' | 'rules'>('vouchers')
  const [vouchers, setVouchers] = useState<Voucher[]>(mockVouchers)
  const [packages, setPackages] = useState<ServicePackage[]>(mockPackages)
  const [priceRules, setPriceRules] = useState<PriceRule[]>(mockPriceRules)
  const [search, setSearch] = useState('')
  
  // Modal states
  const [showVoucherModal, setShowVoucherModal] = useState(false)
  const [showPackageModal, setShowPackageModal] = useState(false)
  const [editingVoucher, setEditingVoucher] = useState<Voucher | null>(null)
  const [editingPackage, setEditingPackage] = useState<ServicePackage | null>(null)

  // Voucher form states
  const [voucherCode, setVoucherCode] = useState('')
  const [voucherName, setVoucherName] = useState('')
  const [voucherType, setVoucherType] = useState<'percentage' | 'fixed'>('percentage')
  const [voucherValue, setVoucherValue] = useState('')
  const [voucherMinPurchase, setVoucherMinPurchase] = useState('')
  const [voucherMaxUses, setVoucherMaxUses] = useState('')
  const [voucherValidFrom, setVoucherValidFrom] = useState('')
  const [voucherValidUntil, setVoucherValidUntil] = useState('')
  const [voucherActive, setVoucherActive] = useState(true)

  // Package form states
  const [packageName, setPackageName] = useState('')
  const [packageDescription, setPackageDescription] = useState('')
  const [packageItems, setPackageItems] = useState<PackageItem[]>([])
  const [packagePrice, setPackagePrice] = useState('')
  const [packageFeatured, setPackageFeatured] = useState(false)
  const [packageActive, setPackageActive] = useState(true)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(amount)
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  const generateVoucherCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let code = ''
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    setVoucherCode(code)
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  // Voucher functions
  const openVoucherModal = (voucher?: Voucher) => {
    if (voucher) {
      setEditingVoucher(voucher)
      setVoucherCode(voucher.code)
      setVoucherName(voucher.name)
      setVoucherType(voucher.type)
      setVoucherValue(voucher.value.toString())
      setVoucherMinPurchase(voucher.min_purchase?.toString() || '')
      setVoucherMaxUses(voucher.max_uses?.toString() || '')
      setVoucherValidFrom(voucher.valid_from)
      setVoucherValidUntil(voucher.valid_until)
      setVoucherActive(voucher.is_active)
    } else {
      setEditingVoucher(null)
      setVoucherCode('')
      setVoucherName('')
      setVoucherType('percentage')
      setVoucherValue('')
      setVoucherMinPurchase('')
      setVoucherMaxUses('')
      setVoucherValidFrom('')
      setVoucherValidUntil('')
      setVoucherActive(true)
    }
    setShowVoucherModal(true)
  }

  const saveVoucher = () => {
    const voucherData: Voucher = {
      id: editingVoucher?.id || `v${Date.now()}`,
      code: voucherCode.toUpperCase(),
      name: voucherName,
      type: voucherType,
      value: parseFloat(voucherValue) || 0,
      min_purchase: voucherMinPurchase ? parseFloat(voucherMinPurchase) : undefined,
      max_uses: voucherMaxUses ? parseInt(voucherMaxUses) : undefined,
      uses_count: editingVoucher?.uses_count || 0,
      valid_from: voucherValidFrom,
      valid_until: voucherValidUntil,
      is_active: voucherActive,
      created_at: editingVoucher?.created_at || new Date().toISOString(),
    }

    if (editingVoucher) {
      setVouchers(prev => prev.map(v => v.id === editingVoucher.id ? voucherData : v))
    } else {
      setVouchers(prev => [...prev, voucherData])
    }
    setShowVoucherModal(false)
  }

  const toggleVoucherStatus = (voucherId: string) => {
    setVouchers(prev => prev.map(v => 
      v.id === voucherId ? { ...v, is_active: !v.is_active } : v
    ))
  }

  const deleteVoucher = (voucherId: string) => {
    if (confirm('Are you sure you want to delete this voucher?')) {
      setVouchers(prev => prev.filter(v => v.id !== voucherId))
    }
  }

  // Package functions
  const openPackageModal = (pkg?: ServicePackage) => {
    if (pkg) {
      setEditingPackage(pkg)
      setPackageName(pkg.name)
      setPackageDescription(pkg.description)
      setPackageItems([...pkg.items])
      setPackagePrice(pkg.package_price.toString())
      setPackageFeatured(pkg.is_featured)
      setPackageActive(pkg.is_active)
    } else {
      setEditingPackage(null)
      setPackageName('')
      setPackageDescription('')
      setPackageItems([])
      setPackagePrice('')
      setPackageFeatured(false)
      setPackageActive(true)
    }
    setShowPackageModal(true)
  }

  const addServiceToPackage = (serviceId: string) => {
    const service = availableServices.find(s => s.id === serviceId)
    if (service) {
      setPackageItems(prev => [...prev, {
        service_id: service.id,
        service_name: service.name,
        original_price: service.price,
      }])
    }
  }

  const removeServiceFromPackage = (index: number) => {
    setPackageItems(prev => prev.filter((_, i) => i !== index))
  }

  const calculatePackageTotals = () => {
    const totalValue = packageItems.reduce((sum, item) => sum + item.original_price, 0)
    const price = parseFloat(packagePrice) || 0
    const savings = totalValue > 0 ? Math.round(((totalValue - price) / totalValue) * 100) : 0
    const duration = packageItems.reduce((sum, item) => {
      const service = availableServices.find(s => s.id === item.service_id)
      return sum + (service?.duration || 0)
    }, 0)
    return { totalValue, savings, duration }
  }

  const savePackage = () => {
    const { totalValue, savings, duration } = calculatePackageTotals()
    
    const packageData: ServicePackage = {
      id: editingPackage?.id || `pkg${Date.now()}`,
      name: packageName,
      description: packageDescription,
      items: packageItems,
      total_value: totalValue,
      package_price: parseFloat(packagePrice) || 0,
      savings_percent: savings,
      duration,
      is_featured: packageFeatured,
      is_active: packageActive,
      booking_count: editingPackage?.booking_count || 0,
      created_at: editingPackage?.created_at || new Date().toISOString(),
    }

    if (editingPackage) {
      setPackages(prev => prev.map(p => p.id === editingPackage.id ? packageData : p))
    } else {
      setPackages(prev => [...prev, packageData])
    }
    setShowPackageModal(false)
  }

  const togglePackageStatus = (packageId: string) => {
    setPackages(prev => prev.map(p => 
      p.id === packageId ? { ...p, is_active: !p.is_active } : p
    ))
  }

  const deletePackage = (packageId: string) => {
    if (confirm('Are you sure you want to delete this package?')) {
      setPackages(prev => prev.filter(p => p.id !== packageId))
    }
  }

  // Stats
  const getActiveVouchers = () => vouchers.filter(v => v.is_active).length
  const getTotalVoucherUses = () => vouchers.reduce((sum, v) => sum + v.uses_count, 0)
  const getActivePackages = () => packages.filter(p => p.is_active).length
  const getTotalPackageBookings = () => packages.reduce((sum, p) => sum + p.booking_count, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pricing & Promotions</h1>
          <p className="text-sm text-gray-500 mt-1">Manage vouchers, packages, and pricing rules</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-green-100">
                <Gift className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{getActiveVouchers()}</p>
                <p className="text-sm text-gray-500">Active Vouchers</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-blue-100">
                <TrendingUp className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{getTotalVoucherUses()}</p>
                <p className="text-sm text-gray-500">Voucher Uses</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-purple-100">
                <Package className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{getActivePackages()}</p>
                <p className="text-sm text-gray-500">Active Packages</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-yellow-100">
                <Users className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{getTotalPackageBookings()}</p>
                <p className="text-sm text-gray-500">Package Bookings</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200 pb-0">
        <button
          onClick={() => setActiveTab('vouchers')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-[1px] transition-colors ${
            activeTab === 'vouchers'
              ? 'border-[#7B2D8E] text-[#7B2D8E]'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Gift className="w-4 h-4 inline mr-2" />
          Vouchers
        </button>
        <button
          onClick={() => setActiveTab('packages')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-[1px] transition-colors ${
            activeTab === 'packages'
              ? 'border-[#7B2D8E] text-[#7B2D8E]'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Package className="w-4 h-4 inline mr-2" />
          Packages
        </button>
        <button
          onClick={() => setActiveTab('rules')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-[1px] transition-colors ${
            activeTab === 'rules'
              ? 'border-[#7B2D8E] text-[#7B2D8E]'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <DollarSign className="w-4 h-4 inline mr-2" />
          Price Rules
        </button>
      </div>

      {/* Vouchers Tab */}
      {activeTab === 'vouchers' && (
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle className="text-base">Voucher Codes</CardTitle>
                <CardDescription>Create and manage discount vouchers</CardDescription>
              </div>
              <button
                onClick={() => openVoucherModal()}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#7B2D8E] text-white font-medium rounded-lg hover:bg-[#5A1D6A] transition-colors"
              >
                <Plus className="w-4 h-4" />
                Create Voucher
              </button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search vouchers..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/20 focus:border-[#7B2D8E]"
              />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Code</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Name</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Discount</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Usage</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Valid Until</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Status</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {vouchers.filter(v => 
                    v.code.toLowerCase().includes(search.toLowerCase()) ||
                    v.name.toLowerCase().includes(search.toLowerCase())
                  ).map((voucher) => (
                    <tr key={voucher.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <code className="px-2 py-1 bg-gray-100 rounded font-mono text-sm font-semibold text-[#7B2D8E]">
                            {voucher.code}
                          </code>
                          <button
                            onClick={() => copyToClipboard(voucher.code)}
                            className="p-1 hover:bg-gray-100 rounded transition-colors"
                            title="Copy code"
                          >
                            <Copy className="w-3.5 h-3.5 text-gray-400" />
                          </button>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-900">{voucher.name}</td>
                      <td className="py-3 px-4">
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          {voucher.type === 'percentage' ? `${voucher.value}% OFF` : formatCurrency(voucher.value)}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {voucher.uses_count}{voucher.max_uses ? ` / ${voucher.max_uses}` : ''}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">{formatDate(voucher.valid_until)}</td>
                      <td className="py-3 px-4">
                        <Badge 
                          variant="outline" 
                          className={voucher.is_active 
                            ? 'bg-green-50 text-green-700 border-green-200' 
                            : 'bg-gray-100 text-gray-500 border-gray-200'
                          }
                        >
                          {voucher.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openVoucherModal(voucher)}
                            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                          >
                            <Pencil className="w-4 h-4 text-gray-500" />
                          </button>
                          <button
                            onClick={() => toggleVoucherStatus(voucher.id)}
                            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                          >
                            {voucher.is_active ? (
                              <Eye className="w-4 h-4 text-green-500" />
                            ) : (
                              <EyeOff className="w-4 h-4 text-gray-400" />
                            )}
                          </button>
                          <button
                            onClick={() => deleteVoucher(voucher.id)}
                            className="p-1.5 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Packages Tab */}
      {activeTab === 'packages' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search packages..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/20 focus:border-[#7B2D8E]"
              />
            </div>
            <button
              onClick={() => openPackageModal()}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#7B2D8E] text-white font-medium rounded-lg hover:bg-[#5A1D6A] transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create Package
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {packages.filter(p => 
              p.name.toLowerCase().includes(search.toLowerCase())
            ).map((pkg) => (
              <Card key={pkg.id} className={`overflow-hidden ${!pkg.is_active ? 'opacity-60' : ''}`}>
                <div className="h-24 bg-gradient-to-br from-[#7B2D8E] to-[#9B4DB0] flex items-center justify-center relative">
                  <Package className="w-10 h-10 text-white/40" />
                  {pkg.is_featured && (
                    <div className="absolute top-3 left-3">
                      <Badge className="bg-yellow-500 text-white border-0">
                        <Sparkles className="w-3 h-3 mr-1" />
                        Featured
                      </Badge>
                    </div>
                  )}
                  <div className="absolute top-3 right-3">
                    <Badge className="bg-white/20 text-white border-0">
                      Save {pkg.savings_percent}%
                    </Badge>
                  </div>
                </div>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold text-gray-900">{pkg.name}</h3>
                      <p className="text-sm text-gray-500 line-clamp-2">{pkg.description}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-1 my-3">
                    {pkg.items.slice(0, 3).map((item, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm text-gray-600">
                        <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                        <span className="truncate">{item.service_name}</span>
                      </div>
                    ))}
                    {pkg.items.length > 3 && (
                      <p className="text-xs text-gray-400">+{pkg.items.length - 3} more services</p>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <div>
                      <p className="text-xs text-gray-400 line-through">{formatCurrency(pkg.total_value)}</p>
                      <p className="font-bold text-lg text-[#7B2D8E]">{formatCurrency(pkg.package_price)}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openPackageModal(pkg)}
                        className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <Pencil className="w-4 h-4 text-gray-500" />
                      </button>
                      <button
                        onClick={() => togglePackageStatus(pkg.id)}
                        className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        {pkg.is_active ? (
                          <Eye className="w-4 h-4 text-green-500" />
                        ) : (
                          <EyeOff className="w-4 h-4 text-gray-400" />
                        )}
                      </button>
                      <button
                        onClick={() => deletePackage(pkg.id)}
                        className="p-1.5 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {pkg.duration} min
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {pkg.booking_count} bookings
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Price Rules Tab */}
      {activeTab === 'rules' && (
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle className="text-base">Price Rules</CardTitle>
                <CardDescription>Set automatic pricing adjustments</CardDescription>
              </div>
              <button
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#7B2D8E] text-white font-medium rounded-lg hover:bg-[#5A1D6A] transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Rule
              </button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                <DollarSign className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Price Rules Coming Soon</h3>
              <p className="text-sm text-gray-500 max-w-md mx-auto">
                Configure automatic price adjustments based on time, date, or customer segments. 
                This feature is under development.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Voucher Modal */}
      {showVoucherModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">
                {editingVoucher ? 'Edit Voucher' : 'Create New Voucher'}
              </h3>
              <button onClick={() => setShowVoucherModal(false)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Voucher Code</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={voucherCode}
                    onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                    placeholder="e.g. SUMMER25"
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/20 focus:border-[#7B2D8E]"
                  />
                  <button
                    type="button"
                    onClick={generateVoucherCode}
                    className="px-3 py-2 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Generate
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Voucher Name</label>
                <input
                  type="text"
                  value={voucherName}
                  onChange={(e) => setVoucherName(e.target.value)}
                  placeholder="e.g. Summer Sale Discount"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/20 focus:border-[#7B2D8E]"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Discount Type</label>
                  <select
                    value={voucherType}
                    onChange={(e) => setVoucherType(e.target.value as 'percentage' | 'fixed')}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/20 focus:border-[#7B2D8E]"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Amount (NGN)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {voucherType === 'percentage' ? 'Percentage Off' : 'Amount Off (NGN)'}
                  </label>
                  <input
                    type="number"
                    value={voucherValue}
                    onChange={(e) => setVoucherValue(e.target.value)}
                    placeholder={voucherType === 'percentage' ? '10' : '5000'}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/20 focus:border-[#7B2D8E]"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Min Purchase (Optional)</label>
                  <input
                    type="number"
                    value={voucherMinPurchase}
                    onChange={(e) => setVoucherMinPurchase(e.target.value)}
                    placeholder="e.g. 30000"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/20 focus:border-[#7B2D8E]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max Uses (Optional)</label>
                  <input
                    type="number"
                    value={voucherMaxUses}
                    onChange={(e) => setVoucherMaxUses(e.target.value)}
                    placeholder="Unlimited"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/20 focus:border-[#7B2D8E]"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Valid From</label>
                  <input
                    type="date"
                    value={voucherValidFrom}
                    onChange={(e) => setVoucherValidFrom(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/20 focus:border-[#7B2D8E]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Valid Until</label>
                  <input
                    type="date"
                    value={voucherValidUntil}
                    onChange={(e) => setVoucherValidUntil(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/20 focus:border-[#7B2D8E]"
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={voucherActive}
                  onChange={(e) => setVoucherActive(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-[#7B2D8E] focus:ring-[#7B2D8E]"
                />
                <span className="text-sm text-gray-700">Active</span>
              </label>
            </div>
            <div className="border-t border-gray-200 p-4 flex gap-3">
              <button
                onClick={() => setShowVoucherModal(false)}
                className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveVoucher}
                disabled={!voucherCode || !voucherName || !voucherValue}
                className="flex-1 px-4 py-2 bg-[#7B2D8E] text-white rounded-lg hover:bg-[#5A1D6A] transition-colors disabled:opacity-50"
              >
                {editingVoucher ? 'Save Changes' : 'Create Voucher'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Package Modal */}
      {showPackageModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">
                {editingPackage ? 'Edit Package' : 'Create New Package'}
              </h3>
              <button onClick={() => setShowPackageModal(false)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Package Name</label>
                <input
                  type="text"
                  value={packageName}
                  onChange={(e) => setPackageName(e.target.value)}
                  placeholder="e.g. Glow Package"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/20 focus:border-[#7B2D8E]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={packageDescription}
                  onChange={(e) => setPackageDescription(e.target.value)}
                  placeholder="Describe the package..."
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/20 focus:border-[#7B2D8E]"
                />
              </div>

              {/* Services Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Add Services</label>
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      addServiceToPackage(e.target.value)
                      e.target.value = ''
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/20 focus:border-[#7B2D8E]"
                >
                  <option value="">Select a service to add...</option>
                  {availableServices.map(service => (
                    <option key={service.id} value={service.id}>
                      {service.name} - {formatCurrency(service.price)} ({service.duration} min)
                    </option>
                  ))}
                </select>
              </div>

              {/* Selected Services */}
              {packageItems.length > 0 && (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Included Services</label>
                  {packageItems.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-[#7B2D8E]/10 flex items-center justify-center">
                          <Sparkles className="w-4 h-4 text-[#7B2D8E]" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{item.service_name}</p>
                          <p className="text-xs text-gray-500">{formatCurrency(item.original_price)}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => removeServiceFromPackage(index)}
                        className="p-1 hover:bg-gray-200 rounded transition-colors"
                      >
                        <X className="w-4 h-4 text-gray-400" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Pricing */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Total Value</label>
                  <div className="px-3 py-2 bg-gray-100 border border-gray-200 rounded-lg text-sm text-gray-600">
                    {formatCurrency(calculatePackageTotals().totalValue)}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Package Price (NGN)</label>
                  <input
                    type="number"
                    value={packagePrice}
                    onChange={(e) => setPackagePrice(e.target.value)}
                    placeholder="e.g. 65000"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/20 focus:border-[#7B2D8E]"
                  />
                </div>
              </div>

              {packagePrice && calculatePackageTotals().totalValue > 0 && (
                <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-green-700">
                    Customers save {calculatePackageTotals().savings}% ({formatCurrency(calculatePackageTotals().totalValue - (parseFloat(packagePrice) || 0))})
                  </span>
                </div>
              )}

              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={packageFeatured}
                    onChange={(e) => setPackageFeatured(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-[#7B2D8E] focus:ring-[#7B2D8E]"
                  />
                  <span className="text-sm text-gray-700">Featured Package</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={packageActive}
                    onChange={(e) => setPackageActive(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-[#7B2D8E] focus:ring-[#7B2D8E]"
                  />
                  <span className="text-sm text-gray-700">Active</span>
                </label>
              </div>
            </div>
            <div className="border-t border-gray-200 p-4 flex gap-3">
              <button
                onClick={() => setShowPackageModal(false)}
                className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={savePackage}
                disabled={!packageName || packageItems.length === 0 || !packagePrice}
                className="flex-1 px-4 py-2 bg-[#7B2D8E] text-white rounded-lg hover:bg-[#5A1D6A] transition-colors disabled:opacity-50"
              >
                {editingPackage ? 'Save Changes' : 'Create Package'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

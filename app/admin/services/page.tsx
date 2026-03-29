'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Sparkles, Plus, X, Pencil, Trash2, Clock, DollarSign, Search,
  CheckCircle, XCircle, Eye, EyeOff, GripVertical, ChevronDown,
  ChevronUp, Image as ImageIcon, Tag, Users, Calendar, Star
} from 'lucide-react'

interface Service {
  id: string
  name: string
  description: string
  category: string
  price: number
  duration: number
  is_active: boolean
  is_featured: boolean
  booking_count: number
  image_url: string | null
  created_at: string
}

interface Category {
  id: string
  name: string
  description: string
  service_count: number
  is_active: boolean
}

const mockCategories: Category[] = [
  { id: 'c1', name: 'Basic Care', description: 'Essential skincare treatments', service_count: 4, is_active: true },
  { id: 'c2', name: 'Advanced Treatments', description: 'Professional-grade procedures', service_count: 6, is_active: true },
  { id: 'c3', name: 'Consultation', description: 'Expert skin consultations', service_count: 2, is_active: true },
  { id: 'c4', name: 'Packages', description: 'Bundled treatment packages', service_count: 3, is_active: false },
]

const mockServices: Service[] = [
  {
    id: 's1',
    name: 'Basic Facial',
    description: 'A refreshing facial treatment that cleanses, exfoliates, and hydrates your skin.',
    category: 'Basic Care',
    price: 15000,
    duration: 45,
    is_active: true,
    is_featured: true,
    booking_count: 128,
    image_url: null,
    created_at: '2025-01-15T10:00:00Z',
  },
  {
    id: 's2',
    name: 'Deep Cleansing Facial',
    description: 'Intensive cleansing treatment for congested and oily skin types.',
    category: 'Basic Care',
    price: 25000,
    duration: 60,
    is_active: true,
    is_featured: false,
    booking_count: 89,
    image_url: null,
    created_at: '2025-01-20T14:00:00Z',
  },
  {
    id: 's3',
    name: 'Chemical Peel',
    description: 'Professional chemical exfoliation to reveal smoother, brighter skin.',
    category: 'Advanced Treatments',
    price: 50000,
    duration: 90,
    is_active: true,
    is_featured: true,
    booking_count: 67,
    image_url: null,
    created_at: '2025-02-01T09:00:00Z',
  },
  {
    id: 's4',
    name: 'Acne Treatment',
    description: 'Targeted treatment for acne-prone skin with professional extractions.',
    category: 'Advanced Treatments',
    price: 35000,
    duration: 75,
    is_active: true,
    is_featured: false,
    booking_count: 145,
    image_url: null,
    created_at: '2025-02-10T11:00:00Z',
  },
  {
    id: 's5',
    name: 'Skin Consultation',
    description: 'One-on-one consultation with our expert dermatologist.',
    category: 'Consultation',
    price: 10000,
    duration: 30,
    is_active: true,
    is_featured: false,
    booking_count: 234,
    image_url: null,
    created_at: '2025-01-10T08:00:00Z',
  },
  {
    id: 's6',
    name: 'Laser Treatment',
    description: 'Advanced laser therapy for skin rejuvenation and pigmentation.',
    category: 'Advanced Treatments',
    price: 75000,
    duration: 120,
    is_active: false,
    is_featured: false,
    booking_count: 23,
    image_url: null,
    created_at: '2025-03-01T10:00:00Z',
  },
]

export default function ServicesPage() {
  const [categories, setCategories] = useState<Category[]>(mockCategories)
  const [services, setServices] = useState<Service[]>(mockServices)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [showServiceModal, setShowServiceModal] = useState(false)
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [editingService, setEditingService] = useState<Service | null>(null)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null)

  // Form states
  const [serviceName, setServiceName] = useState('')
  const [serviceDescription, setServiceDescription] = useState('')
  const [serviceCategory, setServiceCategory] = useState('')
  const [servicePrice, setServicePrice] = useState('')
  const [serviceDuration, setServiceDuration] = useState('')
  const [serviceActive, setServiceActive] = useState(true)
  const [serviceFeatured, setServiceFeatured] = useState(false)

  const [categoryName, setCategoryName] = useState('')
  const [categoryDescription, setCategoryDescription] = useState('')
  const [categoryActive, setCategoryActive] = useState(true)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount)
  }

  const filteredServices = services.filter(service => {
    const matchesSearch = !search || 
      service.name.toLowerCase().includes(search.toLowerCase()) ||
      service.description.toLowerCase().includes(search.toLowerCase())
    const matchesCategory = !categoryFilter || service.category === categoryFilter
    const matchesActive = activeFilter === 'all' || 
      (activeFilter === 'active' && service.is_active) ||
      (activeFilter === 'inactive' && !service.is_active)
    return matchesSearch && matchesCategory && matchesActive
  })

  const openServiceModal = (service?: Service) => {
    if (service) {
      setEditingService(service)
      setServiceName(service.name)
      setServiceDescription(service.description)
      setServiceCategory(service.category)
      setServicePrice(service.price.toString())
      setServiceDuration(service.duration.toString())
      setServiceActive(service.is_active)
      setServiceFeatured(service.is_featured)
    } else {
      setEditingService(null)
      setServiceName('')
      setServiceDescription('')
      setServiceCategory(categories[0]?.name || '')
      setServicePrice('')
      setServiceDuration('')
      setServiceActive(true)
      setServiceFeatured(false)
    }
    setShowServiceModal(true)
  }

  const openCategoryModal = (category?: Category) => {
    if (category) {
      setEditingCategory(category)
      setCategoryName(category.name)
      setCategoryDescription(category.description)
      setCategoryActive(category.is_active)
    } else {
      setEditingCategory(null)
      setCategoryName('')
      setCategoryDescription('')
      setCategoryActive(true)
    }
    setShowCategoryModal(true)
  }

  const saveService = () => {
    const serviceData: Service = {
      id: editingService?.id || `s${Date.now()}`,
      name: serviceName,
      description: serviceDescription,
      category: serviceCategory,
      price: parseFloat(servicePrice) || 0,
      duration: parseInt(serviceDuration) || 0,
      is_active: serviceActive,
      is_featured: serviceFeatured,
      booking_count: editingService?.booking_count || 0,
      image_url: editingService?.image_url || null,
      created_at: editingService?.created_at || new Date().toISOString(),
    }

    if (editingService) {
      setServices(prev => prev.map(s => s.id === editingService.id ? serviceData : s))
    } else {
      setServices(prev => [...prev, serviceData])
    }
    setShowServiceModal(false)
  }

  const saveCategory = () => {
    const categoryData: Category = {
      id: editingCategory?.id || `c${Date.now()}`,
      name: categoryName,
      description: categoryDescription,
      service_count: editingCategory?.service_count || 0,
      is_active: categoryActive,
    }

    if (editingCategory) {
      setCategories(prev => prev.map(c => c.id === editingCategory.id ? categoryData : c))
    } else {
      setCategories(prev => [...prev, categoryData])
    }
    setShowCategoryModal(false)
  }

  const toggleServiceStatus = (serviceId: string) => {
    setServices(prev => prev.map(s => 
      s.id === serviceId ? { ...s, is_active: !s.is_active } : s
    ))
  }

  const deleteService = (serviceId: string) => {
    if (confirm('Are you sure you want to delete this service?')) {
      setServices(prev => prev.filter(s => s.id !== serviceId))
    }
  }

  const getServicesByCategory = (categoryName: string) => {
    return services.filter(s => s.category === categoryName)
  }

  const getTotalBookings = () => services.reduce((sum, s) => sum + s.booking_count, 0)
  const getActiveServices = () => services.filter(s => s.is_active).length
  const getFeaturedServices = () => services.filter(s => s.is_featured).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Services & Categories</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your service catalog and pricing</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => openCategoryModal()}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Category
          </button>
          <button
            onClick={() => openServiceModal()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#7B2D8E] text-white font-medium rounded-lg hover:bg-[#5A1D6A] transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Service
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-purple-100">
                <Sparkles className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{services.length}</p>
                <p className="text-sm text-gray-500">Total Services</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-green-100">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{getActiveServices()}</p>
                <p className="text-sm text-gray-500">Active Services</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-yellow-100">
                <Star className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{getFeaturedServices()}</p>
                <p className="text-sm text-gray-500">Featured</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-blue-100">
                <Calendar className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{getTotalBookings()}</p>
                <p className="text-sm text-gray-500">Total Bookings</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Categories */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Categories</CardTitle>
          <CardDescription>Organize your services into categories</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {categories.map(category => (
              <div
                key={category.id}
                className={`p-4 rounded-lg border transition-all ${
                  category.is_active 
                    ? 'border-gray-200 hover:border-[#7B2D8E]' 
                    : 'border-gray-100 bg-gray-50 opacity-60'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4 text-[#7B2D8E]" />
                    <h3 className="font-medium text-gray-900">{category.name}</h3>
                  </div>
                  <button
                    onClick={() => openCategoryModal(category)}
                    className="p-1 hover:bg-gray-100 rounded transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5 text-gray-400" />
                  </button>
                </div>
                <p className="text-sm text-gray-500 mb-3">{category.description}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">
                    {getServicesByCategory(category.name).length} services
                  </span>
                  <Badge 
                    variant="outline" 
                    className={category.is_active 
                      ? 'bg-green-50 text-green-700 border-green-200' 
                      : 'bg-gray-100 text-gray-500 border-gray-200'
                    }
                  >
                    {category.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Services Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search services..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/20 focus:border-[#7B2D8E]"
              />
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/20 focus:border-[#7B2D8E]"
            >
              <option value="">All Categories</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.name}>{cat.name}</option>
              ))}
            </select>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveFilter('all')}
                className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                  activeFilter === 'all' ? 'bg-[#7B2D8E] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setActiveFilter('active')}
                className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                  activeFilter === 'active' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Active
              </button>
              <button
                onClick={() => setActiveFilter('inactive')}
                className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                  activeFilter === 'inactive' ? 'bg-gray-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Inactive
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Services List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredServices.map(service => (
          <Card key={service.id} className={`overflow-hidden ${!service.is_active ? 'opacity-60' : ''}`}>
            <div className="h-32 bg-gradient-to-br from-[#7B2D8E]/20 to-[#9B4DB0]/10 flex items-center justify-center">
              {service.image_url ? (
                <img src={service.image_url} alt={service.name} className="w-full h-full object-cover" />
              ) : (
                <Sparkles className="w-12 h-12 text-[#7B2D8E]/40" />
              )}
              {service.is_featured && (
                <div className="absolute top-3 left-3">
                  <Badge className="bg-yellow-500 text-white border-0">
                    <Star className="w-3 h-3 mr-1" />
                    Featured
                  </Badge>
                </div>
              )}
            </div>
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-semibold text-gray-900">{service.name}</h3>
                  <Badge variant="outline" className="mt-1 text-xs">{service.category}</Badge>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openServiceModal(service)}
                    className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <Pencil className="w-4 h-4 text-gray-500" />
                  </button>
                  <button
                    onClick={() => toggleServiceStatus(service.id)}
                    className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                    title={service.is_active ? 'Deactivate' : 'Activate'}
                  >
                    {service.is_active ? (
                      <Eye className="w-4 h-4 text-green-500" />
                    ) : (
                      <EyeOff className="w-4 h-4 text-gray-400" />
                    )}
                  </button>
                  <button
                    onClick={() => deleteService(service.id)}
                    className="p-1.5 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </button>
                </div>
              </div>
              <p className="text-sm text-gray-500 mb-4 line-clamp-2">{service.description}</p>
              <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                <div className="flex items-center gap-3 text-sm text-gray-500">
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {service.duration}min
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    {service.booking_count}
                  </span>
                </div>
                <span className="font-bold text-[#7B2D8E]">{formatCurrency(service.price)}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredServices.length === 0 && (
        <div className="text-center py-12">
          <Sparkles className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No services found</p>
        </div>
      )}

      {/* Service Modal */}
      {showServiceModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">
                {editingService ? 'Edit Service' : 'Add New Service'}
              </h3>
              <button onClick={() => setShowServiceModal(false)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Service Name</label>
                <input
                  type="text"
                  value={serviceName}
                  onChange={(e) => setServiceName(e.target.value)}
                  placeholder="e.g. Deep Facial Treatment"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/20 focus:border-[#7B2D8E]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={serviceDescription}
                  onChange={(e) => setServiceDescription(e.target.value)}
                  placeholder="Describe the service..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/20 focus:border-[#7B2D8E]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  value={serviceCategory}
                  onChange={(e) => setServiceCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/20 focus:border-[#7B2D8E]"
                >
                  {categories.filter(c => c.is_active).map(cat => (
                    <option key={cat.id} value={cat.name}>{cat.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Price (NGN)</label>
                  <input
                    type="number"
                    value={servicePrice}
                    onChange={(e) => setServicePrice(e.target.value)}
                    placeholder="25000"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/20 focus:border-[#7B2D8E]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Duration (mins)</label>
                  <input
                    type="number"
                    value={serviceDuration}
                    onChange={(e) => setServiceDuration(e.target.value)}
                    placeholder="60"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/20 focus:border-[#7B2D8E]"
                  />
                </div>
              </div>
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={serviceActive}
                    onChange={(e) => setServiceActive(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-[#7B2D8E] focus:ring-[#7B2D8E]"
                  />
                  <span className="text-sm text-gray-700">Active</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={serviceFeatured}
                    onChange={(e) => setServiceFeatured(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-[#7B2D8E] focus:ring-[#7B2D8E]"
                  />
                  <span className="text-sm text-gray-700">Featured</span>
                </label>
              </div>
            </div>
            <div className="border-t border-gray-200 p-4 flex gap-3">
              <button
                onClick={() => setShowServiceModal(false)}
                className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveService}
                disabled={!serviceName || !servicePrice}
                className="flex-1 px-4 py-2 bg-[#7B2D8E] text-white rounded-lg hover:bg-[#5A1D6A] transition-colors disabled:opacity-50"
              >
                {editingService ? 'Save Changes' : 'Add Service'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full shadow-xl">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">
                {editingCategory ? 'Edit Category' : 'Add New Category'}
              </h3>
              <button onClick={() => setShowCategoryModal(false)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category Name</label>
                <input
                  type="text"
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  placeholder="e.g. Advanced Treatments"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/20 focus:border-[#7B2D8E]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={categoryDescription}
                  onChange={(e) => setCategoryDescription(e.target.value)}
                  placeholder="Describe the category..."
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/20 focus:border-[#7B2D8E]"
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={categoryActive}
                  onChange={(e) => setCategoryActive(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-[#7B2D8E] focus:ring-[#7B2D8E]"
                />
                <span className="text-sm text-gray-700">Active</span>
              </label>
            </div>
            <div className="border-t border-gray-200 p-4 flex gap-3">
              <button
                onClick={() => setShowCategoryModal(false)}
                className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveCategory}
                disabled={!categoryName}
                className="flex-1 px-4 py-2 bg-[#7B2D8E] text-white rounded-lg hover:bg-[#5A1D6A] transition-colors disabled:opacity-50"
              >
                {editingCategory ? 'Save Changes' : 'Add Category'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

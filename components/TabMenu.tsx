'use client'

import { useState } from 'react'

export interface TabMenuProps {
  contactInfo: {
    phone: string
    email: string
    location: string
    socials?: Array<{ name: string; url: string }>
  }
  historyContent: string
  onRequestInfo: () => void
  onTabChange?: (tab: 'contact' | 'history' | 'request') => void
}

export default function TabMenu({
  contactInfo,
  historyContent,
  onRequestInfo,
  onTabChange,
}: TabMenuProps) {
  const [activeTab, setActiveTab] = useState<'contact' | 'history' | 'request'>('contact')

  const handleTabClick = (tab: 'contact' | 'history' | 'request') => {
    setActiveTab(tab)
    onTabChange?.(tab)
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Tab Headers */}
      <div className="flex border-b">
        <button
          onClick={() => handleTabClick('contact')}
          className={`tab-button flex-1 text-center py-4 ${
            activeTab === 'contact' ? 'active' : ''
          }`}
        >
          Contact
        </button>
        <button
          onClick={() => handleTabClick('history')}
          className={`tab-button flex-1 text-center py-4 ${
            activeTab === 'history' ? 'active' : ''
          }`}
        >
          History
        </button>
        <button
          onClick={() => handleTabClick('request')}
          className={`tab-button flex-1 text-center py-4 ${
            activeTab === 'request' ? 'active' : ''
          }`}
        >
          Request Info
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === 'contact' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--hunter)' }}>Get in Touch</h3>

              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Phone</p>
                  <a
                    href={`tel:${contactInfo.phone}`}
                    className="text-lg font-medium hover:underline"
                    style={{ color: 'var(--hunter)' }}
                  >
                    {contactInfo.phone}
                  </a>
                </div>

                <div>
                  <p className="text-sm text-gray-600 mb-1">Email</p>
                  <a
                    href={`mailto:${contactInfo.email}`}
                    className="text-lg font-medium hover:underline"
                    style={{ color: 'var(--hunter)' }}
                  >
                    {contactInfo.email}
                  </a>
                </div>

                <div>
                  <p className="text-sm text-gray-600 mb-1">Location</p>
                  <p className="text-base font-medium">{contactInfo.location}</p>
                </div>
              </div>

              {contactInfo.socials && contactInfo.socials.length > 0 && (
                <div className="mt-6">
                  <p className="text-sm text-gray-600 mb-3">Follow</p>
                  <div className="flex gap-4">
                    {contactInfo.socials.map((social) => (
                      <a
                        key={social.name}
                        href={social.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-sm hover:underline"
                        style={{ color: 'var(--hunter)' }}
                      >
                        {social.name}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div>
            <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--hunter)' }}>Our Story</h3>
            <div className="prose prose-sm max-w-none text-gray-700 space-y-3">
              {historyContent.split('\n').map((paragraph, idx) => (
                paragraph.trim() && <p key={idx}>{paragraph}</p>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'request' && (
          <div>
            <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--hunter)' }}>Request Information</h3>
            <RequestForm onSubmit={onRequestInfo} />
          </div>
        )}
      </div>
    </div>
  )
}

interface RequestFormProps {
  onSubmit: () => void
}

function RequestForm({ onSubmit }: RequestFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    message: '',
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log('Form submitted:', formData)
    onSubmit()
    setFormData({ name: '', email: '', phone: '', message: '' })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Name
        </label>
        <input
          type="text"
          required
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-transparent outline-none"
          style={{ '--tw-ring-color': 'var(--hunter)' } as any}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Email
        </label>
        <input
          type="email"
          required
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-transparent outline-none"
          style={{ '--tw-ring-color': 'var(--hunter)' } as any}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Phone
        </label>
        <input
          type="tel"
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-transparent outline-none"
          style={{ '--tw-ring-color': 'var(--hunter)' } as any}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Message
        </label>
        <textarea
          value={formData.message}
          onChange={(e) => setFormData({ ...formData, message: e.target.value })}
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-grass focus:border-transparent outline-none resize-none"
        />
      </div>

      <button
        type="submit"
        className="w-full text-white font-medium py-2 rounded-lg transition"
        style={{ backgroundColor: 'var(--hunter)' }}
        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--hunter-dark)'}
        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--hunter)'}
      >
        Send Request
      </button>
    </form>
  )
}

import { useState } from "react"
import { Mail, Phone, MapPin, Send, MessageCircle, Clock, CheckCircle } from "lucide-react"
import SoftBackdrop from "../components/SoftBackdrop"
import toast from "react-hot-toast"

const ContactUs = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name || !formData.email || !formData.message) {
      toast.error('Please fill in all required fields')
      return
    }

    setIsSubmitting(true)

    // Simulate network delay
    setTimeout(() => {
      setIsSubmitted(true)
      toast.success('Message sent successfully! We\'ll get back to you soon.')

      // Reset form after success
      setTimeout(() => {
        setFormData({ name: '', email: '', subject: '', message: '' })
        setIsSubmitted(false)
      }, 3000)

      setIsSubmitting(false)
    }, 1500)
  }

  return (
    <>
      <SoftBackdrop />

      <div className="mt-32 min-h-screen px-6 md:px-16 lg:px-24 xl:px-32">
        {/* HEADER */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-zinc-200 mb-4">
            Get in Touch
          </h1>
          <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
            Have questions about Thumblify? Need help with your thumbnails? We're here to help you create amazing content.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-16 max-w-6xl mx-auto">
          {/* CONTACT INFO */}
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-semibold text-zinc-200 mb-6">
                Let's Start a Conversation
              </h2>
              <p className="text-zinc-400 mb-8">
                Whether you're facing technical issues, have feature requests, or just want to share feedback,
                we'd love to hear from you. Our team is dedicated to making Thumblify the best thumbnail
                generation tool for creators.
              </p>
            </div>

            {/* CONTACT METHODS */}
            <div className="space-y-6">
              <div className="flex items-start gap-4 p-4 rounded-xl bg-white/5 border border-white/10">
                <div className="p-2 bg-pink-500/20 rounded-lg">
                  <Mail className="size-5 text-pink-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-zinc-200">Email Us</h3>
                  <p className="text-zinc-400 text-sm">support@thumblify.com</p>
                  <p className="text-zinc-500 text-xs mt-1">We typically respond within 24 hours</p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 rounded-xl bg-white/5 border border-white/10">
                <div className="p-2 bg-violet-500/20 rounded-lg">
                  <MessageCircle className="size-5 text-violet-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-zinc-200">Live Chat</h3>
                  <p className="text-zinc-400 text-sm">Available on our website</p>
                  <p className="text-zinc-500 text-xs mt-1">Monday - Friday, 9 AM - 6 PM EST</p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 rounded-xl bg-white/5 border border-white/10">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <Clock className="size-5 text-blue-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-zinc-200">Response Time</h3>
                  <p className="text-zinc-400 text-sm">Usually within 2-4 hours</p>
                  <p className="text-zinc-500 text-xs mt-1">Faster response during business hours</p>
                </div>
              </div>
            </div>

            {/* FAQ SECTION */}
            <div className="mt-12">
              <h3 className="text-xl font-semibold text-zinc-200 mb-4">
                Frequently Asked Questions
              </h3>
              <div className="space-y-3">
                <details className="group">
                  <summary className="flex items-center justify-between p-3 bg-white/5 rounded-lg cursor-pointer hover:bg-white/10 transition-colors">
                    <span className="text-zinc-300">How do I generate my first thumbnail?</span>
                    <span className="text-zinc-400 group-open:rotate-180 transition-transform">▼</span>
                  </summary>
                  <div className="p-3 text-sm text-zinc-400">
                    Simply go to the Generate page, enter your video title, choose a style and color scheme, then click generate!
                  </div>
                </details>

                <details className="group">
                  <summary className="flex items-center justify-between p-3 bg-white/5 rounded-lg cursor-pointer hover:bg-white/10 transition-colors">
                    <span className="text-zinc-300">Can I download my thumbnails?</span>
                    <span className="text-zinc-400 group-open:rotate-180 transition-transform">▼</span>
                  </summary>
                  <div className="p-3 text-sm text-zinc-400">
                    Yes! You can download all your generated thumbnails from the "My Generations" page.
                  </div>
                </details>

                <details className="group">
                  <summary className="flex items-center justify-between p-3 bg-white/5 rounded-lg cursor-pointer hover:bg-white/10 transition-colors">
                    <span className="text-zinc-300">What image formats are supported?</span>
                    <span className="text-zinc-400 group-open:rotate-180 transition-transform">▼</span>
                  </summary>
                  <div className="p-3 text-sm text-zinc-400">
                    We generate high-quality JPG images optimized for YouTube thumbnails.
                  </div>
                </details>
              </div>
            </div>
          </div>

          {/* CONTACT FORM */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
            {isSubmitted ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 bg-green-500/20 rounded-full flex items-center justify-center">
                  <CheckCircle className="size-8 text-green-400" />
                </div>
                <h3 className="text-xl font-semibold text-zinc-200 mb-2">
                  Message Sent Successfully!
                </h3>
                <p className="text-zinc-400">
                  Thank you for reaching out. We'll get back to you within 24 hours.
                </p>
              </div>
            ) : (
              <>
                <h2 className="text-2xl font-semibold text-zinc-200 mb-6">
                  Send us a Message
                </h2>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-zinc-300 mb-2">
                        Name *
                      </label>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent text-zinc-200 placeholder-zinc-500"
                        placeholder="Your full name"
                      />
                    </div>

                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-zinc-300 mb-2">
                        Email *
                      </label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent text-zinc-200 placeholder-zinc-500"
                        placeholder="your@email.com"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="subject" className="block text-sm font-medium text-zinc-300 mb-2">
                      Subject
                    </label>
                    <select
                      id="subject"
                      name="subject"
                      value={formData.subject}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent text-zinc-200"
                    >
                      <option value="">Select a topic</option>
                      <option value="technical-support">Technical Support</option>
                      <option value="feature-request">Feature Request</option>
                      <option value="billing">Billing Question</option>
                      <option value="feedback">General Feedback</option>
                      <option value="partnership">Partnership Inquiry</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="message" className="block text-sm font-medium text-zinc-300 mb-2">
                      Message *
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      value={formData.message}
                      onChange={handleInputChange}
                      required
                      rows={6}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent text-zinc-200 placeholder-zinc-500 resize-none"
                      placeholder="Tell us how we can help you..."
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-pink-500 to-violet-500 rounded-lg font-medium text-white hover:from-pink-600 hover:to-violet-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="size-4" />
                        Send Message
                      </>
                    )}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>

        {/* ADDITIONAL INFO */}
        <div className="mt-16 text-center">
          <div className="max-w-3xl mx-auto p-8 bg-gradient-to-r from-pink-500/10 to-violet-500/10 border border-white/10 rounded-2xl">
            <h3 className="text-xl font-semibold text-zinc-200 mb-3">
              Join Our Community
            </h3>
            <p className="text-zinc-400 mb-6">
              Connect with other creators, share your thumbnails, and get tips on creating engaging content.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <a
                href="#"
                className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
              >
                <MessageCircle className="size-4" />
                Discord
              </a>
              <a
                href="#"
                className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
              >
                <Mail className="size-4" />
                Newsletter
              </a>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default ContactUs
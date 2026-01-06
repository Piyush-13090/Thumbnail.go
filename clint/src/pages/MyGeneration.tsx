import SoftBackdrop from "../components/SoftBackdrop"
import { type IThumbnail } from "../assets/assets"
import { useEffect, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Download, ArrowUpRight, Trash, RefreshCw } from "lucide-react"
import api from "../configs/api"
import toast from "react-hot-toast"


const MyGeneration = () => {
  const navigate = useNavigate()

  const aspectRatioClassMap: Record<string, string> = {
    "16:9": "aspect-video",
    "1:1": "aspect-square",
    "9:16": "aspect-[9/16]",
  }

  const [thumbnails, setThumbnails] = useState<IThumbnail[]>([])
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  const fetchThumbnails = async () => {
    setLoading(true)
    try {
      const response = await api.get('/api/thumbnail/my-generations')
      setThumbnails(response.data.thumbnails || [])
    } catch (error: any) {
      console.error('Failed to fetch thumbnails:', error)
      
      // If it's a 404 or connection error, show a more helpful message
      if (error.response?.status === 404) {
        toast.error('API endpoint not found. Please check if the server is running.')
      } else if (error.code === 'ECONNREFUSED' || error.message.includes('Network Error')) {
        toast.error('Cannot connect to server. Please make sure the server is running on port 3000.')
      } else {
        toast.error('Failed to load your generations')
      }
      
      // Fallback to empty array if API fails
      setThumbnails([])
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = async (image_url: string, title: string) => {
    try {
      const response = await fetch(image_url)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_thumbnail.jpg`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      toast.success('Thumbnail downloaded!')
    } catch (error) {
      console.error('Download failed:', error)
      // Fallback to opening in new tab
      window.open(image_url, "_blank")
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this thumbnail?')) return
    
    setDeleting(id)
    try {
      await api.delete(`/api/thumbnail/delete/${id}`)
      setThumbnails(prev => prev.filter(thumb => thumb._id !== id))
      toast.success('Thumbnail deleted successfully!')
    } catch (error: any) {
      console.error('Failed to delete thumbnail:', error)
      toast.error('Failed to delete thumbnail')
    } finally {
      setDeleting(null)
    }
  }

  const handleRefresh = () => {
    fetchThumbnails()
    toast.success('Refreshed!')
  }

  useEffect(() => {
    fetchThumbnails()
  }, [])

  return (
    <>
      <SoftBackdrop />

      <div className="mt-32 min-h-screen px-6 md:px-16 lg:px-24 xl:px-32">
        {/* HEADER */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-zinc-200">
              My Generations
            </h1>
            <p className="mt-1 text-sm text-zinc-400">
              View and manage all your AI-generated thumbnails
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* LOADING */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-[260px] rounded-2xl bg-white/6 border border-white/10 animate-pulse"
              />
            ))}
          </div>
        )}

        {/* EMPTY STATE */}
        {!loading && thumbnails.length === 0 && (
          <div className="text-center py-24">
            <div className="mb-4">
              <div className="w-16 h-16 mx-auto bg-white/10 rounded-full flex items-center justify-center">
                <ArrowUpRight className="size-8 text-zinc-400" />
              </div>
            </div>
            <h3 className="text-lg font-semibold text-zinc-200">
              No thumbnails yet
            </h3>
            <p className="mt-2 text-sm text-zinc-400 mb-6">
              Generate your first thumbnail to see it here
            </p>
            <Link
              to="/generate"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-pink-500 to-violet-500 rounded-lg font-medium hover:from-pink-600 hover:to-violet-600 transition-all"
            >
              Create First Thumbnail
            </Link>
          </div>
        )}

        {/* GRID */}
        {!loading && thumbnails.length > 0 && (
          <>
            <div className="mb-4 text-sm text-zinc-400">
              {thumbnails.length} thumbnail{thumbnails.length !== 1 ? 's' : ''} generated
            </div>
            
            <div className="columns-1 sm:columns-2 lg:columns-3 2xl:columns-4 gap-8">
              {thumbnails.map((thumb: IThumbnail) => {
                const aspectClass =
                  aspectRatioClassMap[thumb.aspect_ratio || "16:9"] ??
                  aspectRatioClassMap["16:9"]

                return (
                  <div
                    key={thumb._id}
                    onClick={() => navigate(`/generate/${thumb._id}`)}
                    className="mb-8 group relative cursor-pointer rounded-2xl bg-white/6 border border-white/10 transition shadow-xl break-inside-avoid hover:bg-white/8"
                  >
                    {/* IMAGE */}
                    <div
                      className={`relative overflow-hidden rounded-t-2xl ${aspectClass} bg-black`}
                    >
                      {thumb.image_url ? (
                        <img
                          src={thumb.image_url}
                          alt={thumb.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                        />
                      ) : (
                        <>
                          <div className="w-full h-full flex items-center justify-center text-sm text-zinc-400">
                            {thumb.isGenerating ? "Generating…" : "No image"}
                          </div>

                          {thumb.isGenerating && (
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-sm font-medium text-white">
                              <div className="flex items-center gap-2">
                                <RefreshCw className="size-4 animate-spin" />
                                Generating...
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                    
                    {/* CONTENT */}
                    <div className="p-4 space-y-2">
                      <h3 className="text-sm font-semibold text-zinc-100 line-clamp-2">
                        {thumb.title}
                      </h3>

                      <div className="flex flex-wrap gap-2 text-xs text-zinc-400">
                        <span className="px-2 py-0.5 rounded bg-white/8">
                          {thumb.style}
                        </span>

                        {thumb.color_scheme && (
                          <span className="px-2 py-0.5 rounded bg-white/8">
                            {thumb.color_scheme}
                          </span>
                        )}

                        <span className="px-2 py-0.5 rounded bg-white/8">
                          {thumb.aspect_ratio || '16:9'}
                        </span>
                      </div>

                      <p className="text-xs text-zinc-500">
                        {thumb.createdAt ? new Date(thumb.createdAt).toLocaleDateString() : 'Unknown date'}
                      </p>
                    </div>
                    
                    {/* ACTION BUTTONS */}
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="absolute bottom-2 right-2 max-sm:flex sm:hidden group-hover:flex gap-1.5"
                    >
                      <button
                        onClick={() => handleDelete(thumb._id)}
                        disabled={deleting === thumb._id}
                        className="size-6 bg-black/50 p-1 rounded hover:bg-red-600 transition-all disabled:opacity-50"
                        title="Delete thumbnail"
                      >
                        {deleting === thumb._id ? (
                          <RefreshCw className="size-4 animate-spin" />
                        ) : (
                          <Trash className="size-4" />
                        )}
                      </button>

                      {thumb.image_url && (
                        <button
                          onClick={() => handleDownload(thumb.image_url!, thumb.title)}
                          className="size-6 bg-black/50 p-1 rounded hover:bg-pink-600 transition-all"
                          title="Download thumbnail"
                        >
                          <Download className="size-4" />
                        </button>
                      )}
                      
                      {thumb.image_url && (
                        <Link
                          target="_blank"
                          to={`/preview?thumbnail_url=${encodeURIComponent(thumb.image_url)}&title=${encodeURIComponent(thumb.title)}`}
                          className="size-6 bg-black/50 p-1 rounded hover:bg-pink-600 transition-all"
                          title="Preview in YouTube"
                        >
                          <ArrowUpRight className="size-4" />
                        </Link>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </>
  )
}

export default MyGeneration

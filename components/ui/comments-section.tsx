"use client"

import { useState, useEffect } from "react"
import { Send, Trash2, User, Loader2 } from "lucide-react"
import { EntityComment } from "@/lib/types"
import { formatDistanceToNow } from "date-fns"
import { createClient } from "@/lib/supabase/client"

interface CommentsSectionProps {
  entityType: "task" | "project" | "deal" | "meeting"
  entityId: string
}

export function CommentsSection({ entityType, entityId }: CommentsSectionProps) {
  const [comments, setComments] = useState<EntityComment[]>([])
  const [newComment, setNewComment] = useState("")
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null)

  useEffect(() => {
    fetchUserAndComments()
  }, [entityId, entityType])

  const fetchUserAndComments = async () => {
    try {
      setLoading(true)
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session) {
        setCurrentUserId(session.user.id)
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", session.user.id)
          .single()
        if (profile) setCurrentUserRole(profile.role)
      }

      const res = await fetch(`/api/comments?entityType=${entityType}&entityId=${entityId}`)
      if (!res.ok) throw new Error("Failed to fetch comments")
      const data = await res.json()
      setComments(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim()) return

    try {
      setSubmitting(true)
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityType,
          entityId,
          content: newComment.trim()
        })
      })

      if (!res.ok) throw new Error("Failed to post comment")
      const data = await res.json()
      
      setComments(prev => [...prev, data])
      setNewComment("")
    } catch (err: any) {
      console.error(err)
      alert("Failed to post comment: " + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (commentId: string) => {
    if (!confirm("Are you sure you want to delete this comment?")) return

    try {
      const res = await fetch(`/api/comments/${commentId}`, {
        method: "DELETE"
      })

      if (!res.ok) throw new Error("Failed to delete comment")
      
      setComments(prev => prev.filter(c => c.id !== commentId))
    } catch (err: any) {
      console.error(err)
      alert("Failed to delete comment: " + err.message)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="flex flex-col space-y-4">
      <h3 className="font-semibold text-lg border-b pb-2">Discussion ({comments.length})</h3>
      
      {/* Comments List */}
      <div className="flex flex-col space-y-4 max-h-[400px] overflow-y-auto pr-2">
        {comments.length === 0 ? (
          <p className="text-center text-muted-foreground text-sm py-4">
            No comments yet. Start the conversation!
          </p>
        ) : (
          comments.map((comment) => {
            const isAuthor = comment.author_user_id === currentUserId
            const canDelete = isAuthor || currentUserRole === "admin"
            
            return (
              <div key={comment.id} className="flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex-shrink-0">
                  {comment.author?.avatar_url ? (
                    <img 
                      src={comment.author.avatar_url} 
                      alt={comment.author.full_name} 
                      className="w-8 h-8 rounded-full object-cover border border-slate-200" 
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center border border-slate-200 dark:border-slate-700 text-slate-500">
                      <User className="w-4 h-4" />
                    </div>
                  )}
                </div>
                
                <div className="flex-1 bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 relative group">
                  <div className="flex justify-between items-start mb-1">
                    <div>
                      <span className="font-semibold text-sm">
                        {comment.author?.full_name || "Unknown User"}
                      </span>
                      <span className="text-xs text-muted-foreground ml-2">
                        {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    {canDelete && (
                      <button
                        onClick={() => handleDelete(comment.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-muted-foreground hover:text-red-500 rounded"
                        title="Delete comment"
                      >
                        <Trash2 className="w-4 h-4 cursor-pointer" />
                      </button>
                    )}
                  </div>
                  <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                    {comment.content}
                  </p>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="relative mt-2">
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Write a comment..."
          className="w-full min-h-[80px] p-3 pr-12 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/50 resize-y text-sm"
          disabled={submitting}
        />
        <button
          type="submit"
          disabled={submitting || !newComment.trim()}
          className="absolute bottom-3 right-3 p-2 rounded-lg bg-primary text-primary-foreground disabled:opacity-50 hover:bg-primary/90 transition-colors"
        >
          {submitting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </button>
      </form>
    </div>
  )
}

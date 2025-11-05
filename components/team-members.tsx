"use client"

import { useState } from "react"
import { useAppState } from "@/lib/state"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, Trash2, User, Edit2 } from "lucide-react"
import { CreateTeamMemberModal } from "@/components/modals/create-team-member-modal"
import { EditTeamMemberModal } from "@/components/modals/edit-team-member-modal"

export function TeamMembers() {
  const { teamMembers, deleteTeamMember, tasks } = useAppState()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedMember, setSelectedMember] = useState<any>(null)

  const handleEditClick = (member: any) => {
    setSelectedMember(member)
    setShowEditModal(true)
  }

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-primary">Team Members</h2>
        <Button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 rounded-lg font-medium transition-all duration-200 shadow-md hover:shadow-lg active:scale-95 bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Member
        </Button>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {teamMembers.map((member) => (
          <Card key={member.id} className="glass-card border-border/30">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                    <User className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{member.name}</h3>
                    <p className="text-xs text-muted-foreground">{member.role}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 bg-transparent"
                    onClick={() => handleEditClick(member)}
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 bg-transparent"
                    onClick={() => deleteTeamMember(member.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Email:</span>
                  <span className="font-medium text-foreground text-xs">{member.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Assigned Tasks:</span>
                  <span className="font-medium text-accent">
                    {tasks.filter((t) => t.assignedTo === member.id).length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Completed:</span>
                  <span className="font-medium text-green-600">
                    {tasks.filter((t) => t.assignedTo === member.id && t.status === "completed").length}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {teamMembers.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">No team members added yet. Start building your team!</p>
          <Button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 rounded-lg font-medium transition-all duration-200 shadow-md hover:shadow-lg active:scale-95 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add First Member
          </Button>
        </div>
      )}

      <CreateTeamMemberModal open={showCreateModal} onOpenChange={setShowCreateModal} />
      <EditTeamMemberModal open={showEditModal} member={selectedMember} onOpenChange={setShowEditModal} />
    </>
  )
}

import { useState } from 'react'

export interface DeployProject {
  id: number
  filename: string
}

export const useDeployModal = () => {
  const [isDeployModalOpen, setIsDeployModalOpen] = useState(false)
  const [selectedDeployProject, setSelectedDeployProject] =
    useState<DeployProject | null>(null)

  const openDeployModal = (project: DeployProject) => {
    setSelectedDeployProject(project)
    setIsDeployModalOpen(true)
  }

  const closeDeployModal = () => {
    setIsDeployModalOpen(false)
    setSelectedDeployProject(null)
  }

  const deployModalProps = {
    isOpen: isDeployModalOpen,
    onClose: closeDeployModal,
    project: selectedDeployProject
      ? {
          id: selectedDeployProject.id,
          filename: selectedDeployProject.filename,
          title: selectedDeployProject.filename.replace(/\.[^/.]+$/, ''),
        }
      : null,
  }

  return {
    isDeployModalOpen,
    selectedDeployProject,
    openDeployModal,
    closeDeployModal,
    deployModalProps,
  }
}
